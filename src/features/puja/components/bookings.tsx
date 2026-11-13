import { useInfiniteQuery } from '@tanstack/react-query';
import { CalendarX2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { BookingCard } from '@/features/puja/components/booking-card';
import { ListSkeleton, LoadMore } from '@/features/puja/components/lists';
import { pujaQueries } from '@/features/puja/queries';
import { BOOKING_TABS, type BookingTab } from '@/features/puja/schemas';
import { cn } from '@/lib/utils';

type Role = 'user' | 'astrologer';

const EMPTY: Record<BookingTab, string> = {
  pending_acceptance: 'No new requests',
  upcoming: 'Nothing upcoming',
  active: 'Nothing in progress',
  past: 'No past bookings yet',
};

export function BookingTabs({
  role,
  tab,
  onChange,
}: {
  role: Role;
  tab: BookingTab;
  onChange: (tab: BookingTab) => void;
}) {
  return (
    <div className="sticky top-14 z-10 flex gap-1 border-b bg-background px-3 py-2">
      {BOOKING_TABS[role].map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            'h-8 flex-1 rounded-full text-xs font-medium transition-colors',
            t.value === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function BookingList({ role, tab }: { role: Role; tab: BookingTab }) {
  const query = useInfiniteQuery(pujaQueries.bookingList(role, tab));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex flex-col gap-3 p-4">
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarX2} title={EMPTY[tab]} />
      ) : (
        <>
          {items.map((b) => (
            <BookingCard key={b.id} booking={b} role={role} />
          ))}
          <LoadMore {...query} />
        </>
      )}
    </section>
  );
}
