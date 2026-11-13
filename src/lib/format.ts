import { formatDistanceToNowStrict } from 'date-fns';

import { TIME_ZONE } from '@/lib/constants';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('en-IN');
const decimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime()) || date.getFullYear() === 1970) return null;
  return date;
}

export function formatCurrency(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? inr.format(n) : '—';
}

export function formatNumber(value: unknown, fractional = false): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return fractional ? decimal.format(n) : integer.format(n);
}

export function formatPercent(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${decimal.format((numerator / denominator) * 100)}%`;
}

/** "12 Mar 2026, 14:05" in IST. */
export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** 125 → "2m 05s". */
export function formatDuration(totalSeconds: unknown): string {
  const n = Number(totalSeconds);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n % 3600) / 60);
  const seconds = Math.floor(n % 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/** Calendar date key (YYYY-MM-DD) for a Date, in IST (the backend’s puja day). */
export function toDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Shifts a YYYY-MM-DD key by whole days without timezone drift. */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

export function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** "7:30 pm" in IST. */
export function formatTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** "Mon, 12 Mar" in IST. */
export function formatDay(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "Mon, 12 Mar · 7:30 pm" in IST. */
export function formatSlot(value: unknown): string {
  return `${formatDay(value)} · ${formatTime(value)}`;
}

/** 90 → "1 hr 30 min". */
export function formatMinutes(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

export function formatRupees(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `₹${integer.format(n)}` : '—';
}
