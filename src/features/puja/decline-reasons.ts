/**
 * The only reasons an astrologer can give for declining a new booking or cancelling an accepted one.
 * puja-service accepts exactly these (DECLINE_REASONS and ASTROLOGER_CANCEL_REASONS in
 * src/constants/booking.constants.ts there): change both together.
 */
export const DECLINE_REASONS = [
  'Not available at the booked time',
  'Already busy with another pooja at this time',
  'Personal emergency or unwell',
  'Not enough time to prepare for this pooja',
  'Pooja materials (samagri) not available',
  'Booking details are incomplete or unclear',
] as const;

/** After accepting: the booking was confirmed, so the reasons are about what changed since. */
export const ASTROLOGER_CANCEL_REASONS = [
  'Personal emergency or unwell',
  'No longer available at the booked time',
  'Pooja materials (samagri) not available',
  'User is not responding',
  'Booking details are incomplete or unclear',
] as const;
