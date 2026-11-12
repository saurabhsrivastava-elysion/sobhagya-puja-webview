import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/app-shell';

/** Everything that needs the webview session. Rendered only in the browser: the session cookie belongs to auth-service. */
export const Route = createFileRoute('/_app')({
  ssr: false,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
