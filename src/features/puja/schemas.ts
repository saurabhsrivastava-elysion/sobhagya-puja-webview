import { z } from 'zod';

import { apiEnvelope, isoDate, numberish } from '@/lib/api/schemas';

/*
 * Shapes follow puja-service: serializePuja, listActiveCategories, listBookableAstrologers,
 * listStartTimes, listCalendar, serializeApplication, serializeBooking, serializeThread and
 * serializeMessage. Objects are loose so a new backend field never breaks a screen.
 */

const str = z
  .string()
  .nullish()
  .transform((v) => v ?? '');
const strList = z
  .array(z.string())
  .nullish()
  .transform((v) => v ?? []);

export const pageResponse = <T extends z.ZodType>(item: T) =>
  apiEnvelope(
    z.looseObject({
      items: z.array(item),
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasMore: z
        .boolean()
        .nullish()
        .transform((v) => v ?? false),
    }),
  );

export type Page<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export const emptyPage = <T>(limit = 20): Page<T> => ({
  items: [],
  page: 1,
  limit,
  total: 0,
  totalPages: 1,
  hasMore: false,
});

/* ---- Who is signed in ---- */

export const meSchema = z.looseObject({
  userId: z.string(),
  role: z.enum(['user', 'astrologer']),
  name: str,
  avatar: str,
  numericId: numberish,
});
export type Me = z.infer<typeof meSchema>;

/* ---- Catalogue ---- */

export const categorySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  description: str,
  image: str,
  sortOrder: numberish,
  pujaCount: numberish,
});
export type Category = z.infer<typeof categorySchema>;

export const pujaSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  description: str,
  categoryIds: strList,
  categories: z
    .array(z.looseObject({ id: z.string(), name: z.string(), image: str }))
    .nullish()
    .transform((v) => v ?? []),
  images: strList,
  languages: strList,
  durationMinutes: numberish,
  price: numberish,
  callAllowed: z
    .boolean()
    .nullish()
    .transform((v) => v ?? true),
  isActive: z.boolean().nullish(),
});
export type Puja = z.infer<typeof pujaSchema>;

export const bookableAstrologerSchema = z.looseObject({
  astrologerId: z.string(),
  name: str,
  avatar: str,
  about: str,
  languages: strList,
  yearsOfExperience: z.union([z.string(), z.number()]).nullish(),
  rating: numberish,
  ratingCount: numberish,
  pujaExperience: str,
  pujaLanguages: strList,
  templeOrCity: str,
  pujaAbout: str,
  pujasCompleted: numberish,
  pujaRating: numberish,
  pujaRatingCount: numberish,
  nextAvailableAt: isoDate,
});
export type BookableAstrologer = z.infer<typeof bookableAstrologerSchema>;

export const startTimesSchema = z.looseObject({
  durationMinutes: numberish,
  gapMinutes: numberish,
  stepMinutes: numberish,
  from: isoDate,
  to: isoDate,
  days: z.array(z.looseObject({ date: z.string(), startTimes: z.array(z.string()) })),
});
export type StartTimes = z.infer<typeof startTimesSchema>;

/* ---- Bookings ---- */

export const BOOKING_STATUSES = [
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'PENDING',
  'CONFIRMED',
  'LIVE',
  'MARKED_DONE',
  'DISPUTED',
  'COMPLETED',
  'REFUNDED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** The chat can be read in these; written to (and a call started) only while CONFIRMED, LIVE or MARKED_DONE. */
export const CHAT_VISIBLE: readonly string[] = [
  'CONFIRMED',
  'LIVE',
  'MARKED_DONE',
  'DISPUTED',
  'COMPLETED',
  'REFUNDED',
];
export const CHAT_WRITABLE: readonly string[] = ['CONFIRMED', 'LIVE', 'MARKED_DONE'];

const party = z
  .looseObject({ name: str, avatar: str, numericId: numberish })
  .nullish()
  .transform((v) => v ?? { name: '', avatar: '', numericId: null });

export const bookingSchema = z.looseObject({
  id: z.string(),
  status: z.string(),
  outcome: z.string().nullish(),
  endReason: z.string().nullish(),
  pujaId: z.string(),
  puja: z
    .looseObject({ name: str, durationMinutes: numberish, callAllowed: z.boolean().nullish(), image: str })
    .nullish(),
  userId: z.string(),
  user: party,
  astrologerId: z.string(),
  astrologer: party,
  slotStart: isoDate,
  slotEnd: isoDate,
  userDetails: z.looseObject({ name: str, gotra: str, dateOfBirth: str, sankalp: str }).nullish(),
  amount: numberish,
  acceptDeadline: isoDate,
  acceptedAt: isoDate,
  liveAt: isoDate,
  markedDoneAt: isoDate,
  markedDoneNote: z.string().nullish(),
  autoCompleteAt: isoDate,
  disputedAt: isoDate,
  disputeReason: z.string().nullish(),
  completedAt: isoDate,
  endedAt: isoDate,
  refund: z.looseObject({ amount: numberish, status: z.string().nullish() }).nullish(),
  review: z.looseObject({ rating: numberish, text: str, createdAt: isoDate }).nullish(),
  chat: z
    .looseObject({
      lastMessageAt: isoDate,
      lastMessagePreview: z.string().nullish(),
      unreadForUser: numberish,
      unreadForAstrologer: numberish,
    })
    .nullish(),
  viewerRole: z.enum(['user', 'astrologer']).nullish(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Booking = z.infer<typeof bookingSchema>;

export const BOOKING_TABS = {
  user: [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Ongoing' },
    { value: 'past', label: 'Past' },
  ],
  astrologer: [
    { value: 'pending_acceptance', label: 'Requests' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Ongoing' },
    { value: 'past', label: 'Past' },
  ],
} as const;
export type BookingTab = 'upcoming' | 'active' | 'past' | 'pending_acceptance';

/* ---- Astrologer: applications and availability ---- */

export const APPLICATION_STATUSES = ['APPLIED', 'APPROVED', 'PAUSED', 'REJECTED', 'REMOVED'] as const;

export const applicationSchema = z.looseObject({
  id: z.string(),
  pujaId: z.string(),
  status: z.string(),
  pujaExperience: str,
  languages: strList,
  templeOrCity: str,
  about: str,
  adminNote: str,
  stats: z.looseObject({ completed: numberish, ratingSum: numberish, ratingCount: numberish }).nullish(),
  createdAt: isoDate,
});
export type Application = z.infer<typeof applicationSchema>;

export const catalogueItemSchema = pujaSchema.extend({ application: applicationSchema.nullish() });
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;

export const calendarSchema = z.looseObject({
  gapMinutes: numberish,
  windows: z.array(z.looseObject({ id: z.string(), startTime: z.string(), endTime: z.string() })),
  bookings: z.array(
    z.looseObject({
      bookingId: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      status: str,
      pujaName: str,
      userName: str,
    }),
  ),
});
export type Calendar = z.infer<typeof calendarSchema>;

export const patternResultSchema = z.looseObject({
  created: z.array(z.unknown()),
  skipped: z.array(z.looseObject({ date: z.string(), reason: z.string() })),
});

/* ---- Chat ---- */

export const threadSchema = z.looseObject({
  threadId: z.string(),
  bookingId: z.string(),
  userId: z.string(),
  providerId: z.string(),
  userName: str,
  providerName: str,
  userAvatar: str,
  providerAvatar: str,
  lastMessage: z.string().nullish(),
  userUnreadCount: numberish,
  providerUnreadCount: numberish,
  writable: z.boolean(),
  role: z.enum(['user', 'astrologer']),
  bookingStatus: z.string(),
  pujaName: str,
  slotStart: isoDate,
  slotEnd: isoDate,
  updatedAt: isoDate,
});
export type Thread = z.infer<typeof threadSchema>;

export const messageSchema = z.looseObject({
  _id: z.string(),
  threadId: z.string(),
  sentBy: z.string().nullish(),
  senderRole: z.enum(['user', 'astrologer', 'system']).catch('system'),
  message: str,
  messageType: z.string(),
  fileLink: str,
  mimeType: str,
  durationSeconds: numberish,
  clientMessageId: z.string().nullish(),
  status: z.string().nullish(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const uploadTicketSchema = z.looseObject({
  uploadUrl: z.string(),
  fileUrl: z.string(),
  mediaId: z.string(),
  contentType: z.string(),
  maxSizeBytes: numberish,
});

/* ---- Calls (calling-service) ---- */

export const callStartSchema = z.looseObject({
  token: z.string(),
  channel: z.string(),
  livekitSocketURL: z.string(),
  receiverName: str,
  receiverAvatar: str,
  callType: z.string(),
  callExpiresAt: isoDate,
});
export type CallStart = z.infer<typeof callStartSchema>;

export const envelope = apiEnvelope;
