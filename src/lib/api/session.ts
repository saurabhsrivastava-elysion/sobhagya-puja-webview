import { serviceUrl } from '@/lib/env';
import { isRecord } from '@/lib/utils';

/**
 * The webview's login, the same flow as the leaderboard webview:
 *
 * 1. The Sobhagya app calls `POST /puja/api/webview-session` and opens the returned activation link.
 * 2. auth-service sets a one-hour `webview` refresh cookie and redirects here.
 * 3. This module trades that cookie for 15-minute access tokens at `GET /auth/api/webview/token`.
 *
 * Webview refresh tokens are not app sessions, so other services cannot rotate an expired access
 * token. Tokens are therefore renewed here, a minute before they expire, and once more on a 401.
 * The token lives only in memory: the cookie is the session.
 */

/** Renew this long before expiry, so a request never leaves with a token about to lapse. */
const RENEW_EARLY_MS = 60_000;

type SessionState = 'unknown' | 'active' | 'expired';

let accessToken: string | null = null;
let expiresAt = 0;
let inflight: Promise<string> | null = null;
let state: SessionState = 'unknown';
const listeners = new Set<(state: SessionState) => void>();

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has ended. Please open Puja again from the Sobhagya app.');
    this.name = 'SessionExpiredError';
  }
}

function setState(next: SessionState): void {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener(next);
}

export function getSessionState(): SessionState {
  return state;
}

export function onSessionState(listener: (state: SessionState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function fetchAccessToken(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${serviceUrl('auth')}/api/webview/token`, {
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new Error('Network error: could not reach Sobhagya. Check your connection.');
  }
  const body: unknown = await res.json().catch(() => null);
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  if (res.status === 401 || res.status === 403) {
    accessToken = null;
    setState('expired');
    throw new SessionExpiredError();
  }
  if (!res.ok || !data || typeof data.accessToken !== 'string') {
    throw new Error(`Could not start your session (${res.status}).`);
  }
  const ttlSeconds = typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : 900;
  accessToken = data.accessToken;
  expiresAt = Date.now() + ttlSeconds * 1000;
  setState('active');
  return accessToken;
}

/** A valid access token, fetching a new one when missing or about to expire. Concurrent callers share one fetch. */
export function getAccessToken(options: { force?: boolean } = {}): Promise<string> {
  if (state === 'expired') return Promise.reject(new SessionExpiredError());
  if (!options.force && accessToken && Date.now() < expiresAt - RENEW_EARLY_MS)
    return Promise.resolve(accessToken);
  inflight ??= fetchAccessToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** The current token without renewing it (for sockets that reconnect on their own). */
export function peekAccessToken(): string | null {
  return accessToken;
}
