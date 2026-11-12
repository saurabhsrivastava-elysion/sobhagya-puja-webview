import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

/** A same-site path for `?next=` redirects, or null (blocks `//evil.com` and `/\evil.com` open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  return next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}
