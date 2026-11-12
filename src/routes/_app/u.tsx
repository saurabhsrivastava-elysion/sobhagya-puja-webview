import { createFileRoute, Navigate, Outlet, useMatchRoute } from '@tanstack/react-router';
import { CalendarCheck, Sparkles } from 'lucide-react';

import { BottomNav } from '@/components/layout/bottom-nav';
import { useMe } from '@/features/puja/hooks';

/** The user side: browse and book pujas, follow bookings. */
export const Route = createFileRoute('/_app/u')({
  component: UserLayout,
});

function UserLayout() {
  const me = useMe().data;
  const matchRoute = useMatchRoute();
  if (me?.role !== 'user') return <Navigate to="/" replace />;

  // The booking flow keeps its own sticky action bar at the bottom.
  const hideNav = Boolean(matchRoute({ to: '/u/book/$pujaId/$astrologerId' }));
  return (
    <>
      <Outlet />
      {!hideNav && (
        <BottomNav
          items={[
            { to: '/u', label: 'Pujas', icon: Sparkles, exact: true },
            { to: '/u/bookings', label: 'My bookings', icon: CalendarCheck },
          ]}
        />
      )}
    </>
  );
}
