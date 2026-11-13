import { createFileRoute, Navigate } from '@tanstack/react-router';
import { z } from 'zod';

import { CallView } from '@/features/call/call-view';
import { useMe } from '@/features/puja/hooks';

/** Only the user starts a puja call; the astrologer answers in the Sobhagya app. */
export const Route = createFileRoute('/_app/call/$bookingId')({
  validateSearch: z.object({ type: z.enum(['call', 'video']).catch('call') }),
  component: function Call() {
    const { bookingId } = Route.useParams();
    const { type } = Route.useSearch();
    const me = useMe().data;
    if (me?.role !== 'user') return <Navigate to="/" replace />;
    return <CallView bookingId={bookingId} video={type === 'video'} />;
  },
});
