import { z } from 'zod';

import { http } from '@/lib/api/http';
import { apiAck, apiEnvelope } from '@/lib/api/schemas';
import {
  applicationSchema,
  bookableAstrologerSchema,
  bookingSchema,
  calendarSchema,
  callStartSchema,
  catalogueItemSchema,
  categorySchema,
  emptyPage,
  meSchema,
  messageSchema,
  pageResponse,
  patternResultSchema,
  pujaSchema,
  startTimesSchema,
  threadSchema,
  uploadTicketSchema,
  type BookingTab,
} from '@/features/puja/schemas';

/** `data` of an envelope, or a clear error when the service sent none. */
function required<T>(data: T | null | undefined, what: string): T {
  if (data === null || data === undefined) throw new Error(`The server sent no ${what}.`);
  return data;
}

/* ---- Session ---- */

export async function getMe() {
  const res = await http('/api/me', { schema: apiEnvelope(meSchema) });
  return required(res.data, 'profile');
}

/* ---- User: browse ---- */

export async function listCategories() {
  const res = await http('/api/puja-categories', { schema: apiEnvelope(z.array(categorySchema)) });
  return res.data ?? [];
}

export async function listPujas(params: {
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  const res = await http('/api/pujas', { schema: pageResponse(pujaSchema), searchParams: params });
  return res.data ?? emptyPage(params.limit);
}

export async function getPuja(pujaId: string) {
  const res = await http(`/api/pujas/${pujaId}`, { schema: apiEnvelope(pujaSchema) });
  return required(res.data, 'puja');
}

export async function listPujaAstrologers(pujaId: string, page: number, limit = 20) {
  const res = await http(`/api/pujas/${pujaId}/astrologers`, {
    schema: pageResponse(bookableAstrologerSchema),
    searchParams: { page, limit },
  });
  return res.data ?? emptyPage(limit);
}

export async function listStartTimes(astrologerId: string, pujaId: string) {
  const res = await http(`/api/astrologers/${astrologerId}/availability`, {
    schema: apiEnvelope(startTimesSchema),
    searchParams: { pujaId },
  });
  return required(res.data, 'availability');
}

/* ---- User: bookings ---- */

export interface CreateBookingInput {
  pujaId: string;
  astrologerId: string;
  startTime: string;
  userDetails: { name: string; gotra?: string; dateOfBirth?: string; sankalp?: string };
}

export async function createBooking(input: CreateBookingInput) {
  const res = await http('/api/bookings', {
    method: 'POST',
    body: input,
    schema: apiEnvelope(bookingSchema),
  });
  return { message: res.message, booking: required(res.data, 'booking') };
}

const bookingAction = (path: string, body?: unknown) =>
  http(path, { method: 'POST', body: body ?? {}, schema: apiEnvelope(bookingSchema) });

export const userBookingActions = {
  cancel: (id: string, reason: string) => bookingAction(`/api/bookings/${id}/cancel`, { reason }),
  confirm: (id: string) => bookingAction(`/api/bookings/${id}/confirm`),
  dispute: (id: string, reason: string) => bookingAction(`/api/bookings/${id}/dispute`, { reason }),
  review: (id: string, rating: number, text: string) =>
    bookingAction(`/api/bookings/${id}/review`, { rating, text }),
};

/* ---- Both sides: bookings (paths differ by role) ---- */

const bookingsBase = (role: 'user' | 'astrologer') =>
  role === 'astrologer' ? '/api/partner/bookings' : '/api/bookings';

export async function listBookings(role: 'user' | 'astrologer', tab: BookingTab, page: number, limit = 20) {
  const res = await http(bookingsBase(role), {
    schema: pageResponse(bookingSchema),
    searchParams: { tab, page, limit },
  });
  return res.data ?? emptyPage(limit);
}

export async function getBooking(role: 'user' | 'astrologer', id: string) {
  const res = await http(`${bookingsBase(role)}/${id}`, { schema: apiEnvelope(bookingSchema) });
  return required(res.data, 'booking');
}

/* ---- Astrologer ---- */

export const partnerBookingActions = {
  accept: (id: string) => bookingAction(`/api/partner/bookings/${id}/accept`),
  reject: (id: string, reason: string) => bookingAction(`/api/partner/bookings/${id}/reject`, { reason }),
  cancel: (id: string, reason: string) => bookingAction(`/api/partner/bookings/${id}/cancel`, { reason }),
  markDone: (id: string, note: string) => bookingAction(`/api/partner/bookings/${id}/mark-done`, { note }),
};

export async function listCatalogue() {
  const res = await http('/api/partner/pujas', { schema: apiEnvelope(z.array(catalogueItemSchema)) });
  return res.data ?? [];
}

export interface ApplicationInput {
  pujaExperience?: string;
  languages?: string[];
  templeOrCity?: string;
  about?: string;
}

export function applyToPuja(pujaId: string, body: ApplicationInput) {
  return http(`/api/partner/pujas/${pujaId}/apply`, {
    method: 'POST',
    body,
    schema: apiEnvelope(applicationSchema),
  });
}

export function updateApplication(pujaId: string, body: ApplicationInput) {
  return http(`/api/partner/pujas/${pujaId}/application`, {
    method: 'PATCH',
    body,
    schema: apiEnvelope(applicationSchema),
  });
}

export async function getCalendar(from: string, to: string) {
  const res = await http('/api/partner/availability', {
    schema: apiEnvelope(calendarSchema),
    searchParams: { from, to },
  });
  return required(res.data, 'calendar');
}

export function createWindow(startTime: string, endTime: string) {
  return http('/api/partner/availability', {
    method: 'POST',
    body: { startTime, endTime },
    schema: apiEnvelope(z.unknown()),
  });
}

export interface PatternInput {
  fromDate: string;
  toDate: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
}

export async function createPattern(body: PatternInput) {
  const res = await http('/api/partner/availability/pattern', {
    method: 'POST',
    body,
    schema: apiEnvelope(patternResultSchema),
  });
  return { message: res.message, result: required(res.data, 'result') };
}

export function deleteWindow(id: string) {
  return http(`/api/partner/availability/${id}`, { method: 'DELETE', schema: apiAck });
}

/* ---- Chat ---- */

export async function getThread(threadId: string) {
  const res = await http(`/api/chat/thread/${threadId}`, { schema: apiEnvelope(threadSchema) });
  return required(res.data, 'chat');
}

/** Newest first; pass the oldest loaded message's `createdAt` for the page before it. */
export async function listMessages(threadId: string, lastTimeStamp?: string, limit = 30) {
  const res = await http(`/api/chat/thread/messages/${threadId}`, {
    schema: apiEnvelope(z.array(messageSchema)),
    searchParams: { lastTimeStamp, limit },
  });
  return res.data ?? [];
}

export async function sendMessage(
  threadId: string,
  body: {
    message?: string;
    messageType: 'text' | 'image' | 'video';
    fileLink?: string;
    clientMessageId: string;
  },
) {
  const res = await http(`/api/chat/thread/${threadId}/messages`, {
    method: 'POST',
    body,
    schema: apiEnvelope(messageSchema),
  });
  return required(res.data, 'message');
}

export async function requestUpload(threadId: string, contentType: string, sizeBytes: number) {
  const res = await http('/api/chat/upload-file', {
    method: 'POST',
    body: { threadId, contentType, sizeBytes },
    schema: apiEnvelope(uploadTicketSchema),
  });
  return required(res.data, 'upload link');
}

export function markThreadRead(threadId: string) {
  return http(`/api/chat/thread/${threadId}/status`, {
    method: 'POST',
    body: { status: 'read' },
    schema: apiAck,
  });
}

/* ---- Calls (calling-service) ---- */

export async function startPujaCall(bookingId: string, channel: string, callType: 'call' | 'video') {
  const res = await http('/api/call/initialize/puja', {
    service: 'calling',
    method: 'POST',
    searchParams: { channel },
    body: { bookingId, callType, appVersion: 'puja-webview' },
    schema: apiEnvelope(callStartSchema),
  });
  return required(res.data, 'call details');
}
