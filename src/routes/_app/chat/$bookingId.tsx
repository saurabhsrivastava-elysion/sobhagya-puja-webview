import { createFileRoute } from '@tanstack/react-router';

import { ChatView } from '@/features/chat/chat-view';

/** The booking's chat; either side, decided by the thread's `role`. */
export const Route = createFileRoute('/_app/chat/$bookingId')({
  component: function Chat() {
    const { bookingId } = Route.useParams();
    return <ChatView bookingId={bookingId} />;
  },
});
