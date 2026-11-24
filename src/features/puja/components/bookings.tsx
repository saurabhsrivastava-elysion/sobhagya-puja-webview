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

const EMPTY: Record<BookingTab, { title: string; description: string }> = {
  pending_acceptance: {
    title: 'No new requests',
    description: 'New pooja requests from users show up here.',
  },
  upcoming: {
    title: 'Nothing upcoming',
    description: 'Confirmed poojas that are yet to start show up here.',
  },
  active: { title: 'Nothing in progress', description: 'Poojas happening right now show up here.' },
  past: { title: 'No past bookings yet', description: 'Completed and cancelled poojas show up here.' },
};

/** Segmented control under the page header (the header is 56px, hence `top-14`). */
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
    <div className="sticky top-14 z-10 bg-background/95 px-4 py-3 backdrop-blur">
      <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1">
        {BOOKING_TABS[role].map((t) => {
          const active = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                'h-10 flex-1 rounded-lg text-[13px] font-semibold transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_rgb(255_152_0/0.3)]'
                  : 'text-muted-foreground active:bg-background/60',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingList({ role, tab }: { role: Role; tab: BookingTab }) {
  const query = useInfiniteQuery(pujaQueries.bookingList(role, tab));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="flex flex-col gap-3 px-4 pt-1 pb-4">
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarX2} title={EMPTY[tab].title} description={EMPTY[tab].description} />
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
