import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { pujaKeys } from '@/features/puja/queries';
import { bookingSchema } from '@/features/puja/schemas';
import { getAccessToken, SessionExpiredError } from '@/lib/api/session';
import { socketTarget } from '@/lib/env';

/**
 * One puja-service socket per page (chat-service's protocol). Rooms: `user:<id>` on connect, and
 * `booking:<id>` after `register`. Only the access token is checked at connect, so every
 * (re)connect asks the session for a fresh one.
 */

interface RealtimeValue {
  socket: Socket | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeValue>({ socket: null, connected: false });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<RealtimeValue>({ socket: null, connected: false });
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { url, path } = socketTarget('puja');
    const socket = io(url, {
      path,
      transports: ['websocket'],
      auth: (cb) => {
        getAccessToken()
          .then((token) => cb({ token }))
          .catch(() => cb({}));
      },
    });

    socket.on('connect', () => setValue({ socket, connected: true }));
    socket.on('disconnect', () => setValue({ socket, connected: false }));
    socket.on('connect_error', (err) => {
      setValue({ socket, connected: false });
      // A rejection by the server's auth middleware stops socket.io's own retries.
      if (socket.active) return;
      const force = err.message === 'TOKEN_EXPIRED' || err.message === 'UNAUTHORIZED';
      retryTimer.current = setTimeout(() => {
        getAccessToken({ force })
          .then(() => socket.connect())
          .catch((e: unknown) => {
            if (!(e instanceof SessionExpiredError)) socket.connect();
          });
      }, 2_000);
    });

    // A new message in any of this person's chats: refresh the Chats list (last message, unread count).
    socket.on('thread_updated', () => {
      void queryClient.invalidateQueries({ queryKey: pujaKeys.threads() });
    });

    // Status changes from either side or a timer: refresh what shows the booking.
    socket.on('booking_updated', (payload: unknown) => {
      const parsed = bookingSchema.safeParse(payload);
      if (parsed.success) {
        queryClient.setQueryData(pujaKeys.booking(parsed.data.id), (old: unknown) =>
          old && typeof old === 'object' ? { ...old, ...parsed.data } : parsed.data,
        );
      }
      void queryClient.invalidateQueries({ queryKey: pujaKeys.bookings() });
      void queryClient.invalidateQueries({ queryKey: pujaKeys.calendars() });
    });

    setValue({ socket, connected: socket.connected });
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [queryClient]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext);
}

export interface Ack<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

/** Emits with an acknowledgement, failing after `timeoutMs` so a dead socket can fall back to HTTP. */
export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 8_000,
): Promise<Ack<T>> {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, ack: Ack<T>) => {
      if (err) reject(err);
      else resolve(ack);
    });
  });
}
