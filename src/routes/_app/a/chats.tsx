import { createFileRoute } from '@tanstack/react-router';

import { ChatList } from '@/features/chat/chat-list';

export const Route = createFileRoute('/_app/a/chats')({
  component: () => <ChatList role="astrologer" />,
});
