import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Lock, MessagesSquare } from 'lucide-react';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import * as api from '@/features/puja/api';
import { ListSkeleton, LoadMore } from '@/features/puja/components/lists';
import { PersonAvatar } from '@/features/puja/components/person';
import { pujaKeys } from '@/features/puja/queries';
import type { Thread } from '@/features/puja/schemas';
import { formatDay, formatTime, toDateKey } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE = 20;

/** Every pooja chat of the signed-in user or astrologer, newest message first (bottom-nav "Chats" tab). */
export function ChatList({ role }: { role: 'user' | 'astrologer' }) {
  const threads = useInfiniteQuery({
    queryKey: pujaKeys.threads(),
    queryFn: ({ pageParam }) => api.listThreads(pageParam, PAGE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length < PAGE ? undefined : (last[last.length - 1]?.updatedAt ?? undefined)),
  });
  const items = threads.data?.pages.flat() ?? [];

  return (
    <NavPage>
      <PageHeader title="Chats" subtitle="Your pooja chats" />
      <div className="flex flex-col gap-2 p-3">
        {threads.isPending ? (
          <ListSkeleton />
        ) : threads.isError ? (
          <QueryError error={threads.error} onRetry={() => void threads.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No chats yet"
            description={
              role === 'user'
                ? 'A chat opens here once an astrologer accepts your pooja booking.'
                : 'A chat opens here once you accept a pooja booking.'
            }
          />
        ) : (
          <>
            {items.map((t) => (
              <ChatRow key={t.threadId} thread={t} role={role} />
            ))}
            <LoadMore {...threads} />
          </>
        )}
      </div>
    </NavPage>
  );
}

function ChatRow({ thread: t, role }: { thread: Thread; role: 'user' | 'astrologer' }) {
  const name = role === 'user' ? t.providerName : t.userName;
  const avatar = role === 'user' ? t.providerAvatar : t.userAvatar;
  const unread = Number(role === 'user' ? t.userUnreadCount : t.providerUnreadCount) || 0;

  return (
    <Link
      to="/chat/$bookingId"
      params={{ bookingId: t.bookingId }}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors active:bg-accent"
    >
      <PersonAvatar name={name} src={avatar} className="size-12" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{name || (role === 'user' ? 'Astrologer' : 'User')}</p>
          <span className={cn('shrink-0 text-[11px]', unread > 0 ? 'text-primary' : 'text-muted-foreground')}>
            {lastActivity(t.updatedAt)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{t.pujaName || 'Pooja'}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {!t.writable && <Lock className="mr-1 inline size-3 align-[-1px]" />}
            {t.lastMessage || 'No messages yet'}
          </p>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Today: "7:30 pm"; earlier: "Mon, 12 Mar". */
function lastActivity(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return toDateKey(date) === toDateKey(new Date()) ? formatTime(date) : formatDay(date);
}
