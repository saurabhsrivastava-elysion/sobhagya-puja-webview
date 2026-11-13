import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { BookingList, BookingTabs } from '@/features/puja/components/bookings';

export const Route = createFileRoute('/_app/u/bookings/')({
  validateSearch: z.object({ tab: z.enum(['upcoming', 'active', 'past']).catch('upcoming') }),
  component: UserBookings,
});

function UserBookings() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: '/u/bookings/' });
  return (
    <NavPage>
      <PageHeader title="My bookings" />
      <BookingTabs
        role="user"
        tab={tab}
        onChange={(t) => void navigate({ search: { tab: t as typeof tab }, replace: true })}
      />
      <BookingList role="user" tab={tab} />
    </NavPage>
  );
}
