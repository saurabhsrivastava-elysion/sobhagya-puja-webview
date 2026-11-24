import { useQuery } from '@tanstack/react-query';

import { pujaQueries } from '@/features/puja/queries';

/** Same threshold as calling-service: with less voice time left than this, a voice call is refused. */
export const MIN_CALL_SECONDS = 30;

/**
 * Voice-call talk time of a booking (video calls are not limited by it). `usedUp` is only true once
 * the server has answered, so a failed or slow request never hides the Call button; calling-service
 * enforces the limit anyway.
 */
export function useVoiceCallTime(bookingId: string, enabled: boolean) {
  const query = useQuery({ ...pujaQueries.callTime(bookingId), enabled });
  const remaining = query.data?.remainingSeconds ?? null;
  const limit = query.data?.limitSeconds ?? null;
  return {
    remainingSeconds: remaining,
    limitSeconds: limit,
    usedUp: remaining !== null && remaining < MIN_CALL_SECONDS,
  };
}

/** "45 min", "1 hr", "1 hr 5 min"; "under 1 min" below a minute. */
export function formatCallTime(seconds: number): string {
  if (seconds < 60) return 'under 1 min';
  const total = Math.floor(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}
