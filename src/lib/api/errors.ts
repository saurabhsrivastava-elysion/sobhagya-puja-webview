import type { z } from 'zod';

export type ApiErrorKind = 'http' | 'network' | 'schema' | 'backend';

interface ApiErrorInit {
  kind: ApiErrorKind;
  status?: number;
  /** Machine-readable error code from the body (`{ code: 'PARTNER_ALREADY_EXISTS' }`), when the service sends one. */
  code?: string;
  issues?: z.core.$ZodIssue[];
  /** puja-service puts context here, e.g. `{ bookingId }` on a failed payment. */
  details?: unknown;
  cause?: unknown;
}

/** Every failure from `http()` is an ApiError, so UI code can render one consistent error state. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly issues: z.core.$ZodIssue[] | undefined;
  readonly details: unknown;

  constructor(message: string, init: ApiErrorInit) {
    super(message, { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.issues = init.issues;
    this.details = init.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
