import type { z } from 'zod';

import { ApiError } from '@/lib/api/errors';
import { getAccessToken, SessionExpiredError } from '@/lib/api/session';
import { serviceUrl, type Service } from '@/lib/env';
import { isRecord } from '@/lib/utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type SearchParamValue = string | number | boolean | null | undefined;
export type SearchParamsInput = Record<string, SearchParamValue | readonly SearchParamValue[]>;

export interface RequestOptions<S extends z.ZodType> {
  schema: S;
  method?: HttpMethod;
  /** Plain objects are sent as JSON. */
  body?: unknown;
  searchParams?: SearchParamsInput;
  /** Defaults to puja-service. */
  service?: Service;
  signal?: AbortSignal;
}

export function buildQueryString(params: SearchParamsInput | undefined): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;
      qs.append(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** puja-service validation errors: `{ errors: { "body.reason": "Required" } }` or an issues array. */
function fieldErrors(body: Record<string, unknown>): string {
  const raw = body.errors ?? (isRecord(body.details) ? body.details.issues : undefined);
  if (isRecord(raw)) {
    return Object.entries(raw)
      .map(([path, message]) => `${path.replace(/^(body|query|params)\./, '')}: ${String(message)}`)
      .join('; ');
  }
  if (Array.isArray(raw)) {
    return raw
      .filter(isRecord)
      .map((e) => {
        const path = Array.isArray(e.path) ? e.path.join('.') : typeof e.path === 'string' ? e.path : '';
        return [path.replace(/^(body|query|params)\./, ''), typeof e.message === 'string' ? e.message : '']
          .filter(Boolean)
          .join(': ');
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}

function messageFrom(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    const fields = fieldErrors(body);
    const message = typeof body.message === 'string' && body.message ? body.message : '';
    if (fields) return `${message || 'Invalid input'}: ${fields}`;
    if (message) return message;
  }
  if (typeof body === 'string' && body.length < 300) return body;
  return fallback;
}

async function send(url: string, init: RequestInit, token: string): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
      // The webview refresh cookie rides along: puja-service and calling-service require it next to the token.
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    throw new ApiError('Network error: the server could not be reached.', { kind: 'network', cause });
  }
}

/** Typed request to a Sobhagya service with the webview session. Every response is checked with `schema`. */
export async function http<S extends z.ZodType>(
  path: string,
  options: RequestOptions<S>,
): Promise<z.output<S>> {
  const { schema, method = 'GET', body, searchParams, service = 'puja', signal } = options;
  const url = `${serviceUrl(service)}${path}${buildQueryString(searchParams)}`;

  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const init: RequestInit = { method, headers, body: payload, signal };

  let res: Response;
  try {
    res = await send(url, init, await getAccessToken());
    // A token can lapse between the check and the server; renew once and retry.
    if (res.status === 401) res = await send(url, init, await getAccessToken({ force: true }));
  } catch (err) {
    if (err instanceof SessionExpiredError) throw new ApiError(err.message, { kind: 'http', status: 401 });
    throw err;
  }

  const json = await readBody(res);
  const code = isRecord(json) && typeof json.code === 'string' ? json.code : undefined;
  const details = isRecord(json) ? json.details : undefined;

  if (!res.ok) {
    throw new ApiError(messageFrom(json, `Request failed (${res.status})`), {
      kind: 'http',
      status: res.status,
      code,
      details,
    });
  }
  // calling-service answers most refusals with 200 `{ success: false, message }`.
  if (isRecord(json) && json.success === false) {
    throw new ApiError(messageFrom(json, 'The server rejected the request.'), {
      kind: 'backend',
      status: res.status,
      code,
      details,
    });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    if (import.meta.env.DEV)
      console.error(`[http] Unexpected response shape for ${method} ${path}`, parsed.error.issues);
    throw new ApiError('The server returned data in an unexpected format.', {
      kind: 'schema',
      status: res.status,
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}
