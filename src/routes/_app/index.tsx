import { createFileRoute, Navigate } from '@tanstack/react-router';

import { useMe } from '@/features/puja/hooks';

/** auth-service lands the webview here; the signed-in role picks the side. */
export const Route = createFileRoute('/_app/')({
  component: Home,
});

function Home() {
  const me = useMe().data;
  if (!me) return null;
  return <Navigate to={me.role === 'astrologer' ? '/a' : '/u'} replace />;
}
