import { useQueryClient } from '@tanstack/react-query';
import { Loader2, LogIn, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useMe } from '@/features/puja/hooks';
import { RealtimeProvider } from '@/features/realtime/puja-socket';
import { getSessionState, onSessionState } from '@/lib/api/session';
import { devLauncherEnabled } from '@/lib/env';
import { errorMessage } from '@/lib/utils';

/**
 * Everything behind the webview session. The session is the cookie auth-service set on activation;
 * `/me` both proves it and says which side (user or astrologer) to show.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [expired, setExpired] = useState(() => getSessionState() === 'expired');
  const queryClient = useQueryClient();

  useEffect(() => onSessionState((state) => setExpired(state === 'expired')), []);

  if (expired) return <SessionExpired />;

  if (me.isPending) {
    return (
      <FullScreen>
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-muted-foreground">Opening Puja…</p>
      </FullScreen>
    );
  }

  if (me.isError) {
    return (
      <FullScreen>
        <p className="font-medium">Puja could not be opened</p>
        <p className="max-w-xs text-muted-foreground">{errorMessage(me.error)}</p>
        <Button variant="outline" onClick={() => void queryClient.resetQueries({ queryKey: ['puja', 'me'] })}>
          <RotateCcw />
          Try again
        </Button>
      </FullScreen>
    );
  }

  return <RealtimeProvider>{children}</RealtimeProvider>;
}

function SessionExpired() {
  return (
    <FullScreen>
      <img src="/sobhagya-logo.svg" alt="" className="size-12" />
      <p className="text-base font-semibold">Your session has ended</p>
      <p className="max-w-xs text-muted-foreground">
        For your security, Puja signs you out after an hour. Close this screen and open Puja again from the
        Sobhagya app.
      </p>
      {devLauncherEnabled() && (
        <Button asChild variant="outline">
          <a href="/dev/launch">
            <LogIn />
            Dev launcher
          </a>
        </Button>
      )}
    </FullScreen>
  );
}

export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </main>
  );
}
