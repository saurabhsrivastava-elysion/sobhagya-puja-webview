import { createFileRoute } from '@tanstack/react-router';

import { ChatList } from '@/features/chat/chat-list';

export const Route = createFileRoute('/_app/u/chats')({
  component: () => <ChatList role="user" />,
});
