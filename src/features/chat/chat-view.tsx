import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import imageCompression from 'browser-image-compression';
import {
  Check,
  CheckCheck,
  ImagePlus,
  Info,
  Loader2,
  Lock,
  MessageCircleHeart,
  Phone,
  SendHorizontal,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { handOffCallToApp } from '@/features/call/app-bridge';
import { useVoiceCallTime } from '@/features/call/call-time';
import * as api from '@/features/puja/api';
import { BookingStatusBadge } from '@/features/puja/components/booking-status';
import { PersonAvatar } from '@/features/puja/components/person';
import { pujaKeys, pujaQueries } from '@/features/puja/queries';
import { messageSchema, type Message } from '@/features/puja/schemas';
import { emitWithAck, useRealtime } from '@/features/realtime/puja-socket';
import { formatDay, formatTime, toDate, toDateKey } from '@/lib/format';
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
  // Same rule as the Call/Video buttons on the booking page: chat open and the booked time not over.
  const callEnd = toDate(thread.data?.slotEnd);
  const canCall = role === 'user' && thread.data?.writable && callEnd !== null && callEnd > new Date();
  // Voice calls share a talk-time limit per booking: once it is used up only Video stays.
  const voice = useVoiceCallTime(bookingId, Boolean(canCall));

  return (
    <div className="mx-auto flex h-svh w-full max-w-md flex-col bg-background">
      <PageHeader
        leading={<PersonAvatar name={otherName} src={otherAvatar} className="size-10 shrink-0" />}
        title={otherName || 'Chat'}
        subtitle={
          otherTyping ? <span className="font-medium text-success-text">typing…</span> : thread.data?.pujaName
        }
        backTo={role ? `/${role === 'astrologer' ? 'a' : 'u'}/bookings/${bookingId}` : '/'}
        actions={
          <>
            {thread.data && <BookingStatusBadge status={thread.data.bookingStatus} role={thread.data.role} />}
            {canCall && (
              <>
                {!voice.usedUp && (
                  <Button asChild variant="soft" size="icon-sm" aria-label="Call">
                    <Link
                      to="/call/$bookingId"
                      params={{ bookingId }}
                      search={{ type: 'call' }}
                      onClick={handOffCallToApp(bookingId, 'call')}
                    >
                      <Phone className="size-[18px]" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="soft" size="icon-sm" aria-label="Video call">
                  <Link
                    to="/call/$bookingId"
                    params={{ bookingId }}
                    search={{ type: 'video' }}
                    onClick={handOffCallToApp(bookingId, 'video')}
                  >
                    <Video className="size-[18px]" />
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      <div
        ref={scroller}
        className="flex flex-1 flex-col overflow-y-auto overscroll-contain bg-elevated px-3 py-3"
      >
        {thread.isError ? (
          <QueryError error={thread.error} onRetry={() => void thread.refetch()} />
        ) : messages.isPending ? (
          <ChatSkeleton />
        ) : messages.isError ? (
          <QueryError error={messages.error} onRetry={() => void messages.refetch()} />
        ) : list.length === 0 ? (
          <div className="m-auto flex max-w-60 flex-col items-center gap-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft">
              <MessageCircleHeart className="size-7 text-primary" strokeWidth={1.6} />
            </div>
            <p className="font-semibold">Say namaste</p>
            <p className="text-[13px] text-muted-foreground">
              Messages, photos and videos about this pooja appear here.
            </p>
          </div>
        ) : (
          <>
            {messages.hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="mb-2 self-center rounded-full"
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
              // Consecutive messages from the same side sit closer together.
              const sameSide = !newDay && prev?.senderRole === m.senderRole;
              return (
                <div key={m._id} className="contents">
                  {newDay && (
                    <div className="my-3 flex items-center gap-3 px-6">
                      <span className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
                        {formatDay(m.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageBubble message={m} mine={m.senderRole === role} tight={sameSide} />
                </div>
              );
            })}
          </>
        )}
      </div>

      {thread.data &&
        (thread.data.writable ? (
          <Composer bookingId={bookingId} role={role} onSent={addMessage} />
        ) : (
          <div className="flex items-center gap-3 border-t bg-background px-4 pt-3 pb-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Lock className="size-4 text-muted-foreground" />
            </span>
            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">This chat is closed.</p>
            <Button asChild variant="soft" size="sm">
              <Link to={bookingPath} params={{ id: bookingId }}>
                View booking
              </Link>
            </Button>
          </div>
        ))}
    </div>
  );
}

function ChatSkeleton() {
  const rows = [
    { mine: false, w: 'w-40' },
    { mine: true, w: 'w-52' },
    { mine: false, w: 'w-56', h: 'h-14' },
    { mine: true, w: 'w-32' },
    { mine: true, w: 'w-60', h: 'h-40' },
  ];
  return (
    <div className="flex flex-1 flex-col justify-end gap-2" aria-busy="true" aria-label="Loading">
      {rows.map((r, i) => (
        <Skeleton
          key={i}
          className={cn(
            'rounded-2xl bg-card',
            r.w,
            r.h ?? 'h-10',
            r.mine ? 'self-end bg-primary-soft' : 'self-start',
          )}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message: m, mine, tight }: { message: Message; mine: boolean; tight?: boolean }) {
  if (m.senderRole === 'system' || m.messageType === 'informative') {
    return (
      <div className="my-2 flex max-w-[92%] gap-2 self-center rounded-xl border border-primary-tint bg-primary-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/90">
        <Info className="mt-0.5 size-4 shrink-0 text-primary-strong" />
        <p>{m.message}</p>
      </div>
    );
  }
  // A photo or video still uploading (shown at once from the phone, like WhatsApp), or one that failed.
  const pending = m._id.startsWith('local-');
  const failed = pending && m.status === 'failed';
  const isMedia = (m.messageType === 'image' || m.messageType === 'video') && Boolean(m.fileLink);
  const overlay = pending && (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-foreground/35">
      {failed ? (
        <span className="rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-semibold text-background">
          Failed
        </span>
      ) : (
        <Loader2 className="size-8 animate-spin text-background" aria-label="Uploading" />
      )}
    </div>
  );
  // Media fills the bubble (WhatsApp style); a fixed width keeps tall or tiny images from breaking the layout.
  const mediaClass = 'block aspect-[4/5] w-full max-h-80 rounded-xl bg-muted object-cover';

  const meta = (
    <span
      className={cn(
        'flex items-center gap-1 text-[11px] leading-none',
        isMedia && !m.message
          ? 'absolute right-2.5 bottom-2.5 rounded-full bg-foreground/55 px-2 py-1 text-background'
          : 'self-end',
        !(isMedia && !m.message) && (mine ? 'text-foreground/55' : 'text-muted-foreground'),
      )}
    >
      {formatTime(m.createdAt)}
      {mine &&
        (failed ? (
          <span className="font-semibold text-danger-text">Not sent</span>
        ) : pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : m.status === 'read' ? (
          <CheckCheck className={cn('size-3.5', !(isMedia && !m.message) && 'text-info')} />
        ) : (
          <Check className="size-3.5" />
        ))}
    </span>
  );

  return (
    <div
      className={cn(
        'relative flex flex-col gap-1 text-[15px] leading-snug shadow-card',
        tight ? 'mt-1' : 'mt-2.5',
        isMedia ? 'w-[72%] max-w-72 rounded-2xl p-1' : 'max-w-[80%] rounded-2xl px-3.5 py-2',
        mine
          ? 'self-end rounded-br-md border border-primary-tint/70 bg-primary-soft text-foreground'
          : 'self-start rounded-bl-md bg-card',
      )}
    >
      {m.messageType === 'image' && m.fileLink && (
        <div className="relative">
          {pending ? (
            <img src={m.fileLink} alt="" className={mediaClass} />
          ) : (
            <a href={m.fileLink} target="_blank" rel="noreferrer">
              <img src={m.fileLink} alt="Photo" className={mediaClass} loading="lazy" />
            </a>
          )}
          {overlay}
          {!m.message && meta}
        </div>
      )}
      {m.messageType === 'video' && m.fileLink && (
        <div className="relative">
          <video src={m.fileLink} controls={!pending} playsInline preload="metadata" className={mediaClass} />
          {overlay}
          {!m.message && meta}
        </div>
      )}
      {(m.messageType === 'image' || m.messageType === 'video') && !m.fileLink && (
        <span className="text-[13px] text-muted-foreground italic">
          {pending ? 'Uploading…' : 'Media no longer available'}
        </span>
      )}
      {m.message && (
        <span className={cn('break-words whitespace-pre-wrap', isMedia && 'px-2.5 pt-1')}>{m.message}</span>
      )}
      {(!isMedia || m.message) && <span className={cn(isMedia && 'px-2.5 pb-1.5', 'self-end')}>{meta}</span>}
    </div>
  );
}

function Composer({
  bookingId,
  role,
  onSent,
}: {
  bookingId: string;
  role: 'user' | 'astrologer' | undefined;
  onSent: (m: Message) => void;
}) {
  const queryClient = useQueryClient();
  const { socket, connected } = useRealtime();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const typingSent = useRef(0);

  const deliver = async (
    body: {
      message?: string;
      messageType: 'text' | 'image' | 'video';
      fileLink?: string;
    },
    clientMessageId: string = newClientId(),
  ) => {
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
    if (fileInput.current) fileInput.current.value = '';
    const clientMessageId = newClientId();
    const caption = text.trim() || undefined;
    const preview = URL.createObjectURL(picked);
    const local: Message = {
      _id: `local-${clientMessageId}`,
      threadId: bookingId,
      sentBy: null,
      senderRole: role ?? 'user',
      message: caption ?? '',
      messageType: isImage ? 'image' : 'video',
      fileLink: preview,
      mimeType: picked.type,
      durationSeconds: 0,
      clientMessageId,
      status: 'uploading',
      createdAt: new Date().toISOString(),
    };
    onSent(local);
    setText('');

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
      await deliver(
        {
          messageType: isImage ? 'image' : 'video',
          fileLink: ticket.fileUrl,
          message: caption,
        },
        clientMessageId,
      );
      setTimeout(() => URL.revokeObjectURL(preview), 30_000);
    } catch (err) {
      onSent({ ...local, status: 'failed' });
      toast.error(errorMessage(err, 'Could not send the file'));
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
    <div className="flex items-end gap-2 border-t bg-background px-2.5 pt-2.5 pb-2.5">
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
        variant="soft"
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
        className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border-transparent bg-muted px-4 py-2.5 focus-visible:bg-card"
      />
      <Button
        size="icon-lg"
        className="rounded-full shadow-[0_2px_8px_rgb(255_152_0/0.35)]"
        aria-label="Send"
        disabled={busy || !text.trim()}
        onClick={() => void sendText()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <SendHorizontal className="size-5" />}
      </Button>
    </div>
  );
}
