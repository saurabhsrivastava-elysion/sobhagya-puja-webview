import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';
import { CalendarClock, ClipboardList, Flower2, MessagesSquare } from 'lucide-react';

import { BottomNav } from '@/components/layout/bottom-nav';
import { useMe } from '@/features/puja/hooks';

/** The astrologer side: requests and bookings, availability, puja applications. */
export const Route = createFileRoute('/_app/a')({
  component: AstrologerLayout,
});

function AstrologerLayout() {
  const me = useMe().data;
  if (me?.role !== 'astrologer') return <Navigate to="/" replace />;

  return (
    <>
      <Outlet />
      <BottomNav
        items={[
          { to: '/a', label: 'Bookings', icon: ClipboardList, exact: true },
          { to: '/a/chats', label: 'Chats', icon: MessagesSquare },
          { to: '/a/availability', label: 'Availability', icon: CalendarClock },
          { to: '/a/pujas', label: 'My poojas', icon: Flower2 },
        ]}
      />
    </>
  );
}
