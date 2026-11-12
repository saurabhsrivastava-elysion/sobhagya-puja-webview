import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Rocket } from 'lucide-react';
import { useState } from 'react';

import { NotFound } from '@/components/layout/not-found';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authGatewayPathToUrl, devLauncherEnabled, serviceUrl } from '@/lib/env';
import { isRecord } from '@/lib/utils';

/**
 * Stands in for the Sobhagya app on a developer machine. With an app user's (or astrologer's)
 * tokens it does what the app does: `POST /puja/api/webview-session`, then opens the activation
 * link, so the real webview login runs end to end. Tokens: `node scripts/dev-tokens.mjs` in auth-service.
 */
export const Route = createFileRoute('/dev/launch')({
  ssr: false,
  component: DevLaunch,
});

const STORAGE_KEY = 'puja-dev-launch';

/** Tokens typed earlier in this tab (the page renders only in the browser). */
function readSaved(): { access?: string; refresh?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as { access?: string; refresh?: string };
  } catch {
    return {};
  }
}

function DevLaunch() {
  const [saved] = useState(readSaved);
  const [access, setAccess] = useState(saved.access ?? '');
  const [refresh, setRefresh] = useState(saved.refresh ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!devLauncherEnabled()) return <NotFound />;

  const launch = async () => {
    setBusy(true);
    setError(null);
    const accessToken = access
      .trim()
      .replace(/^Authorization:\s*/i, '')
      .replace(/^Bearer\s+/i, '');
    const refreshToken = refresh.trim().replace(/^cookies:\s*/i, '');
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ access: accessToken, refresh: refreshToken }));
    } catch {
      /* private mode */
    }
    try {
      // The app's own session, not the webview cookie: credentials stay out of this one call.
      const res = await fetch(`${serviceUrl('puja')}/api/webview-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, cookies: refreshToken },
        credentials: 'omit',
      });
      const body: unknown = await res.json().catch(() => null);
      const data = isRecord(body) && isRecord(body.data) ? body.data : null;
      if (!res.ok || !data || typeof data.activatePath !== 'string') {
        throw new Error(
          isRecord(body) && typeof body.message === 'string'
            ? body.message
            : `Request failed (${res.status})`,
        );
      }
      window.location.assign(authGatewayPathToUrl(data.activatePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-5">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Rocket className="size-5 text-primary" />
          Dev launcher
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Opens Puja the way the Sobhagya app does. Get tokens with{' '}
          <code className="rounded bg-muted px-1">node scripts/dev-tokens.mjs</code> in auth-service. A user
          opens the user side, an astrologer (role friend) the astrologer side.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          The session is a browser cookie, so use a separate browser profile (or incognito) for each account
          you want open at the same time.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Access token (Authorization)</Label>
        <Textarea
          rows={3}
          value={access}
          onChange={(e) => setAccess(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Refresh token (cookies)</Label>
        <Textarea
          rows={3}
          value={refresh}
          onChange={(e) => setRefresh(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-2 text-[13px] text-danger-text">{error}</p>}
      <Button
        className="h-11"
        disabled={busy || !access.trim() || !refresh.trim()}
        onClick={() => void launch()}
      >
        {busy && <Loader2 className="animate-spin" />}
        Open Puja as this account
      </Button>
    </main>
  );
}
