import { z } from 'zod';

/** Empty strings in .env count as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const clientSchema = z.object({
  /** Sobhagya API gateway (https://micro.sobhagya.in). Services are reached at /auth, /puja, /calling. */
  VITE_API_URL: z.url(),
  /** Direct service URLs, for local development without the gateway. */
  VITE_AUTH_API_URL: optional(z.url()),
  VITE_PUJA_API_URL: optional(z.url()),
  VITE_CALLING_API_URL: optional(z.url()),
  /** Shows /dev/launch, which stands in for the Sobhagya app when opening the webview. */
  VITE_ENABLE_DEV_LAUNCHER: optional(z.enum(['true', 'false'])),
});

export type ClientEnv = z.infer<typeof clientSchema>;

let cached: ClientEnv | undefined;

export function getClientEnv(): ClientEnv {
  cached ??= clientSchema.parse({
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL,
    VITE_PUJA_API_URL: import.meta.env.VITE_PUJA_API_URL,
    VITE_CALLING_API_URL: import.meta.env.VITE_CALLING_API_URL,
    VITE_ENABLE_DEV_LAUNCHER: import.meta.env.VITE_ENABLE_DEV_LAUNCHER,
  });
  return cached;
}

export type Service = 'auth' | 'puja' | 'calling';

const SERVICES: Record<
  Service,
  { direct: (env: ClientEnv) => string | undefined; prefix: string; socketPath?: string }
> = {
  auth: { direct: (env) => env.VITE_AUTH_API_URL, prefix: '/auth' },
  puja: { direct: (env) => env.VITE_PUJA_API_URL, prefix: '/puja', socketPath: '/puja-socket/socket.io' },
  calling: {
    direct: (env) => env.VITE_CALLING_API_URL,
    prefix: '/calling',
    socketPath: '/call-socket/socket.io',
  },
};

const trim = (url: string) => url.replace(/\/$/, '');

/** Base URL of a service's HTTP API: its direct URL when set, else the gateway prefix. */
export function serviceUrl(service: Service): string {
  const env = getClientEnv();
  const direct = SERVICES[service].direct(env);
  return direct ? trim(direct) : `${trim(env.VITE_API_URL)}${SERVICES[service].prefix}`;
}

/** Where a service's socket.io server is: the service itself, or the gateway's socket location. */
export function socketTarget(service: Exclude<Service, 'auth'>): { url: string; path: string } {
  const env = getClientEnv();
  const direct = SERVICES[service].direct(env);
  if (direct) return { url: trim(direct), path: '/socket.io' };
  return { url: trim(env.VITE_API_URL), path: SERVICES[service].socketPath ?? '/socket.io' };
}

/**
 * auth-service answers with gateway-relative paths (`/auth/api/...`). With a direct auth URL the
 * `/auth` prefix belongs to the gateway, not the service.
 */
export function authGatewayPathToUrl(path: string): string {
  const env = getClientEnv();
  if (env.VITE_AUTH_API_URL) return `${trim(env.VITE_AUTH_API_URL)}${path.replace(/^\/auth(?=\/)/, '')}`;
  return `${trim(env.VITE_API_URL)}${path}`;
}

/** Off unless VITE_ENABLE_DEV_LAUNCHER=true, so a shared test server behaves like production. */
export function devLauncherEnabled(): boolean {
  return getClientEnv().VITE_ENABLE_DEV_LAUNCHER === 'true';
}
