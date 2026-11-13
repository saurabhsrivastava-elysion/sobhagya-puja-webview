/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Providers } from '@/components/layout/providers';
import { ThemeScript } from '@/components/layout/theme-provider';
import { APP_NAME } from '@/lib/constants';
import appCss from '@/styles/globals.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      // Opened inside the Sobhagya app's WebView: no pinch zoom, respect the notch.
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      },
      { name: 'robots', content: 'noindex, nofollow' },
      { title: APP_NAME },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/sobhagya-logo.svg' },
    ],
  }),
  // Every page is per-user; never let a shared cache store one.
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body className="min-h-svh">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}
