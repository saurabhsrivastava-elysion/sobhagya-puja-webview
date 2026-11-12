import { StatusBadge, type Tone } from '@/components/shared/status-badge';

type Role = 'user' | 'astrologer';

const STATUS: Record<string, { tone: Tone; user: string; astrologer: string }> = {
  PAYMENT_PENDING: { tone: 'warning', user: 'Confirming payment', astrologer: 'Confirming payment' },
  PAYMENT_FAILED: { tone: 'danger', user: 'Payment failed', astrologer: 'Payment failed' },
  PENDING: { tone: 'warning', user: 'Waiting for astrologer', astrologer: 'New request' },
  CONFIRMED: { tone: 'info', user: 'Confirmed', astrologer: 'Confirmed' },
  LIVE: { tone: 'primary', user: 'In progress', astrologer: 'In progress' },
  MARKED_DONE: { tone: 'info', user: 'Please confirm', astrologer: 'Waiting for user' },
  DISPUTED: { tone: 'danger', user: 'Under review', astrologer: 'Under review' },
  COMPLETED: { tone: 'success', user: 'Completed', astrologer: 'Completed' },
  REFUNDED: { tone: 'neutral', user: 'Cancelled', astrologer: 'Cancelled' },
};

/** Why a booking ended, in words for the person looking at it. */
const OUTCOME: Record<string, string> = {
  REJECTED: 'Declined by the astrologer',
  EXPIRED: 'Not accepted in time',
  USER_CANCELLED: 'Cancelled by the user',
  ASTROLOGER_CANCELLED: 'Cancelled by the astrologer',
  ADMIN_CANCELLED: 'Cancelled by Sobhagya',
  NO_SHOW: 'Astrologer did not attend',
  DISPUTE_REFUNDED: 'Refunded after review',
  DISPUTE_PAID_ASTROLOGER: 'Closed after review',
  PAYMENT_FAILED: 'Payment did not go through',
  COMPLETED_BY_USER: 'Confirmed by the user',
  AUTO_COMPLETED: 'Completed automatically',
};

export function outcomeLabel(outcome: string | null | undefined): string | null {
  return outcome ? (OUTCOME[outcome] ?? null) : null;
}

export function BookingStatusBadge({ status, role }: { status: string; role: Role }) {
  const entry = STATUS[status];
  return <StatusBadge status={status} tone={entry?.tone} label={entry?.[role]} />;
}
