/** A new LiveKit channel id for one call attempt; calling-service needs it unique every time. */
export function newChannel(bookingId: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Math.random()).slice(2, 10);
  return `puja_${bookingId}_${Date.now()}_${random}`;
}
