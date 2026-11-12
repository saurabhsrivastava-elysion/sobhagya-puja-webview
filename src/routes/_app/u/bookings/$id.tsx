import { createFileRoute } from '@tanstack/react-router';

import { NavPage } from '@/components/layout/bottom-nav';
import { BookingDetail } from '@/features/puja/components/booking-detail';

export const Route = createFileRoute('/_app/u/bookings/$id')({
  component: function UserBooking() {
    const { id } = Route.useParams();
    return (
      <NavPage>
        <BookingDetail role="user" id={id} />
      </NavPage>
    );
  },
});
