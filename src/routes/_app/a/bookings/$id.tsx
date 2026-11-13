import { createFileRoute } from '@tanstack/react-router';

import { NavPage } from '@/components/layout/bottom-nav';
import { BookingDetail } from '@/features/puja/components/booking-detail';

export const Route = createFileRoute('/_app/a/bookings/$id')({
  component: function AstrologerBooking() {
    const { id } = Route.useParams();
    return (
      <NavPage>
        <BookingDetail role="astrologer" id={id} />
      </NavPage>
    );
  },
});
