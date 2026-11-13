import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { NotFound } from '@/components/layout/not-found';
import { RouteError } from '@/components/layout/route-error';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { makeQueryClient } from '@/lib/query-client';
import { routeTree } from '@/routeTree.gen';

/** Called once per SSR request and once in the browser, so every request gets its own QueryClient. */
export function getRouter() {
  const queryClient = makeQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageSkeleton,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
