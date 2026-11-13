import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import imageCompression from 'browser-image-compression';
import { Check, CheckCheck, ImagePlus, Loader2, Lock, Phone, SendHorizontal } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import * as api from '@/features/puja/api';
import { BookingStatusBadge } from '@/features/puja/components/booking-status';
import { PersonAvatar } from '@/features/puja/components/person';
import { pujaKeys, pujaQueries } from '@/features/puja/queries';
import { messageSchema, type Message } from '@/features/puja/schemas';
import { emitWithAck, useRealtime } from '@/features/realtime/puja-socket';
import { formatDay, formatTime, toDateKey } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';

const PAGE = 30;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];

type Pages = InfiniteData<Message[], string | undefined>;

function newClientId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/** Puts a message in the cache once, newest first (the socket, the ack and HTTP can all deliver it). */
function upsert(data: Pages | undefined, message: Message): Pages {
  const pages = data?.pages ?? [[]];
  const exists = pages.some((page) =>
    page.some(
      (m) =>
        m._id === message._id || (message.clientMessageId && m.clientMessageId === message.clientMessageId),
    ),
  );
  if (exists) {
    return {
      pageParams: data?.pageParams ?? [undefined],
      pages: pages.map((page) =>
        page.map((m) =>
          m._id === message._id || (message.clientMessageId && m.clientMessageId === message.clientMessageId)
            ? message
            : m,
        ),
      ),
    };
  }
  return {
    pageParams: data?.pageParams ?? [undefined],
    pages: [[message, ...(pages[0] ?? [])], ...pages.slice(1)],
  };
}

export function ChatView({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();
  const thread = useQuery(pujaQueries.thread(bookingId));
  const messages = useInfiniteQuery({
    queryKey: pujaKeys.messages(bookingId),
    queryFn: ({ pageParam }) => api.listMessages(bookingId, pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length < PAGE ? undefined : last[last.length - 1]?.createdAt),
    staleTime: Infinity,
  });
  const [otherTyping, setOtherTyping] = useState(false);

  const role = thread.data?.role;
  const otherName = role === 'user' ? thread.data?.providerName : thread.data?.userName;
  const otherAvatar = role === 'user' ? thread.data?.providerAvatar : thread.data?.userAvatar;

  const addMessage = useCallback(
    (message: Message) =>
      queryClient.setQueryData<Pages>(pujaKeys.messages(bookingId), (old) => upsert(old, message)),
    [queryClient, bookingId],
  );

  // Join the booking's room for live messages and typing.
  useEffect(() => {
    if (!socket || !connected) return;
    void emitWithAck(socket, 'register', { threadId: bookingId }).catch(() => undefined);
    const onMessage = (payload: unknown) => {
      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success || parsed.data.threadId !== bookingId) return;
      addMessage(parsed.data);
      setOtherTyping(false);
      void api.markThreadRead(bookingId).catch(() => undefined);
      if (parsed.data.senderRole === 'system')
        void queryClient.invalidateQueries({ queryKey: pujaKeys.thread(bookingId) });
    };
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const onTyping = (payload: { threadId?: string; isTyping?: boolean }) => {
      if (payload.threadId !== bookingId) return;
      setOtherTyping(Boolean(payload.isTyping));
      clearTimeout(typingTimer);
      if (payload.isTyping) typingTimer = setTimeout(() => setOtherTyping(false), 5_000);
    };
    socket.on('receive_message', onMessage);
    socket.on('typing', onTyping);
    return () => {
      clearTimeout(typingTimer);
      socket.off('receive_message', onMessage);
      socket.off('typing', onTyping);
      socket.emit('leave_thread', { threadId: bookingId });
    };
  }, [socket, connected, bookingId, addMessage, queryClient]);

  // Opening the chat reads it.
  useEffect(() => {
    if (!thread.data) return;
    void api
      .markThreadRead(bookingId)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: pujaKeys.bookings() }),
          queryClient.invalidateQueries({ queryKey: pujaKeys.threads() }),
        ]),
      )
      .catch(() => undefined);
  }, [thread.data, bookingId, queryClient]);

  // Oldest at the top for display.
  const list = [...(messages.data?.pages.flat() ?? [])].reverse();

  const scroller = useRef<HTMLDivElement>(null);
  const newestId = list[list.length - 1]?._id;
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [newestId]);

  const bookingPath = role === 'astrologer' ? '/a/bookings/$id' : '/u/bookings/$id';
  const canCall = role === 'user' && thread.data?.writable;

  return (
    <div className="mx-auto flex h-svh w-full max-w-md flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <PersonAvatar name={otherName} src={otherAvatar} className="size-7" />
            <span className="truncate">{otherName || 'Chat'}</span>
          </span>
        }
        subtitle={otherTyping ? 'typing…' : thread.data?.pujaName}
        backTo={role ? `/${role === 'astrologer' ? 'a' : 'u'}/bookings/${bookingId}` : '/'}
        actions={
          <>
            {thread.data && <BookingStatusBadge status={thread.data.bookingStatus} role={thread.data.role} />}
            {canCall && (
              <Button asChild variant="ghost" size="icon" aria-label="Call">
                <Link to="/call/$bookingId" params={{ bookingId }} search={{ type: 'call' }}>
                  <Phone />
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div ref={scroller} className="flex flex-1 flex-col gap-1.5 overflow-y-auto bg-muted/40 px-3 py-3">
        {thread.isError ? (
          <QueryError error={thread.error} onRetry={() => void thread.refetch()} />
        ) : messages.isPending ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.isError ? (
          <QueryError error={messages.error} onRetry={() => void messages.refetch()} />
        ) : (
          <>
            {messages.hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="self-center"
                disabled={messages.isFetchingNextPage}
                onClick={() => void messages.fetchNextPage()}
              >
                {messages.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Earlier messages
              </Button>
            )}
            {list.map((m, i) => {
              const prev = list[i - 1];
              const newDay =
                !prev || toDateKey(new Date(prev.createdAt)) !== toDateKey(new Date(m.createdAt));
              return (
                <div key={m._id} className="contents">
                  {newDay && (
                    <p className="my-2 self-center rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      {formatDay(m.createdAt)}
                    </p>
                  )}
                  <MessageBubble message={m} mine={m.senderRole === role} />
                </div>
              );
            })}
          </>
        )}
      </div>

      {thread.data &&
        (thread.data.writable ? (
          <Composer bookingId={bookingId} onSent={addMessage} />
        ) : (
          <p className="flex items-center justify-center gap-1.5 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            This chat is closed.{' '}
            <Link to={bookingPath} params={{ id: bookingId }} className="text-primary underline">
              View booking
            </Link>
          </p>
        ))}
    </div>
  );
}

function MessageBubble({ message: m, mine }: { message: Message; mine: boolean }) {
  if (m.senderRole === 'system' || m.messageType === 'informative') {
    return (
      <p className="my-1 self-center rounded-lg bg-primary/10 px-3 py-1.5 text-center text-xs text-foreground/80">
        {m.message}
      </p>
    );
  }
  const pending = m._id.startsWith('local-');
  return (
    <div
      className={cn(
        'flex max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-2 text-[14px] shadow-xs',
        mine
          ? 'self-end rounded-br-sm bg-primary text-primary-foreground'
          : 'self-start rounded-bl-sm bg-card',
      )}
    >
      {m.messageType === 'image' && m.fileLink && (
        <a href={m.fileLink} target="_blank" rel="noreferrer">
          <img src={m.fileLink} alt="" className="max-h-72 rounded-lg object-cover" />
        </a>
      )}
      {m.messageType === 'video' && m.fileLink && (
        <video src={m.fileLink} controls className="max-h-72 rounded-lg" />
      )}
      {(m.messageType === 'image' || m.messageType === 'video') && !m.fileLink && (
        <span className="text-xs opacity-70">{pending ? 'Uploading…' : 'Media no longer available'}</span>
      )}
      {m.message && <span className="break-words whitespace-pre-wrap">{m.message}</span>}
      <span
        className={cn(
          'flex items-center gap-1 self-end text-[10px]',
          mine ? 'opacity-80' : 'text-muted-foreground',
        )}
      >
        {formatTime(m.createdAt)}
        {mine &&
          (pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : m.status === 'read' ? (
            <CheckCheck className="size-3" />
          ) : (
            <Check className="size-3" />
          ))}
      </span>
    </div>
  );
}

function Composer({ bookingId, onSent }: { bookingId: string; onSent: (m: Message) => void }) {
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingSent = useRef(0);

  const deliver = async (body: {
    message?: string;
    messageType: 'text' | 'image' | 'video';
    fileLink?: string;
  }) => {
    const clientMessageId = newClientId();
    // Socket first (as the app does); HTTP when the socket is down. Same clientMessageId, so never twice.
    if (socket && connected) {
      try {
        const ack = await emitWithAck<unknown>(socket, 'send_message', {
          threadId: bookingId,
          ...body,
          clientMessageId,
        });
        if (!ack.success) throw new Error(ack.message || 'Message not sent');
        const parsed = messageSchema.safeParse(ack.data);
        if (parsed.success) onSent(parsed.data);
        return;
      } catch (err) {
        if (!(err instanceof Error) || !/timed out|timeout/i.test(err.message)) throw err;
      }
    }
    onSent(await api.sendMessage(bookingId, { ...body, clientMessageId }));
  };

  const sendText = async () => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    try {
      await deliver({ message, messageType: 'text' });
      setText('');
    } catch (err) {
      toast.error(errorMessage(err));
      void queryClient.invalidateQueries({ queryKey: pujaKeys.thread(bookingId) });
    } finally {
      setBusy(false);
    }
  };

  const sendFile = async (picked: File) => {
    const isImage = IMAGE_TYPES.includes(picked.type);
    const isVideo = VIDEO_TYPES.includes(picked.type);
    if (!isImage && !isVideo) {
      toast.error('Only photos (JPG, PNG, WEBP, HEIC) and videos (MP4, MOV, WEBM, 3GP) can be sent.');
      return;
    }
    setBusy(true);
    try {
      let file: File = picked;
      if (isImage && picked.type !== 'image/heic' && picked.size > 1024 * 1024) {
        file = await imageCompression(picked, { maxSizeMB: 1, maxWidthOrHeight: 2048, useWebWorker: true });
      }
      const ticket = await api.requestUpload(bookingId, file.type, file.size);
      if (Number(ticket.maxSizeBytes) && file.size > Number(ticket.maxSizeBytes)) {
        throw new Error(
          `File is too large (max ${Math.round(Number(ticket.maxSizeBytes) / 1024 / 1024)} MB).`,
        );
      }
      const put = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': ticket.contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      await deliver({
        messageType: isImage ? 'image' : 'video',
        fileLink: ticket.fileUrl,
        message: text.trim() || undefined,
      });
      setText('');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the file'));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onType = (value: string) => {
    setText(value);
    // Tell the other side at most every 3 s.
    if (socket && connected && Date.now() - typingSent.current > 3_000) {
      typingSent.current = Date.now();
      socket.emit('typing', { threadId: bookingId, isTyping: true });
    }
  };

  return (
    <div className="flex items-end gap-2 border-t bg-background p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <input
        ref={fileInput}
        type="file"
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void sendFile(f);
        }}
      />
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Send photo or video"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="size-5" />
      </Button>
      <Textarea
        value={text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendText();
          }
        }}
        rows={1}
        maxLength={4000}
        placeholder="Message"
        className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl"
      />
      <Button
        size="icon-lg"
        className="rounded-full"
        aria-label="Send"
        disabled={busy || !text.trim()}
        onClick={() => void sendText()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <SendHorizontal className="size-5" />}
      </Button>
    </div>
  );
}
