import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { BookingList, BookingTabs } from '@/features/puja/components/bookings';
import { useMe } from '@/features/puja/hooks';

export const Route = createFileRoute('/_app/a/')({
  validateSearch: z.object({
    tab: z.enum(['pending_acceptance', 'upcoming', 'active', 'past']).catch('pending_acceptance'),
  }),
  component: AstrologerBookings,
});

function AstrologerBookings() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: '/a/' });
  const me = useMe().data;
  return (
    <NavPage>
      <PageHeader title="Puja bookings" subtitle={me?.name ? `Namaste, ${me.name}` : undefined} />
      <BookingTabs
        role="astrologer"
        tab={tab}
        onChange={(t) => void navigate({ search: { tab: t }, replace: true })}
      />
      <BookingList role="astrologer" tab={tab} />
    </NavPage>
  );
}
