import { useMutation, useQuery } from '@tanstack/react-query';

import * as api from '@/features/puja/api';
import { pujaKeys, pujaQueries } from '@/features/puja/queries';

/** Bookings and anything derived from them (availability, chat headers). */
const BOOKING_KEYS = [pujaKeys.bookings(), pujaKeys.calendars(), [...pujaKeys.all, 'thread']] as const;

export function useMe() {
  return useQuery(pujaQueries.me());
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: api.createBooking,
    meta: { successMessage: false, invalidates: [pujaKeys.bookings(), [...pujaKeys.all, 'start-times']] },
  });
}

export function useUserBookingAction() {
  return useMutation({
    mutationFn: (
      action:
        | { type: 'cancel'; id: string; reason: string }
        | { type: 'confirm'; id: string }
        | { type: 'dispute'; id: string; reason: string }
        | { type: 'review'; id: string; rating: number; text: string },
    ) => {
      switch (action.type) {
        case 'cancel':
          return api.userBookingActions.cancel(action.id, action.reason);
        case 'confirm':
          return api.userBookingActions.confirm(action.id);
        case 'dispute':
          return api.userBookingActions.dispute(action.id, action.reason);
        case 'review':
          return api.userBookingActions.review(action.id, action.rating, action.text);
      }
    },
    meta: { invalidates: BOOKING_KEYS },
  });
}

export function usePartnerBookingAction() {
  return useMutation({
    mutationFn: (
      action:
        | { type: 'accept'; id: string }
        | { type: 'reject'; id: string; reason: string }
        | { type: 'cancel'; id: string; reason: string }
        | { type: 'markDone'; id: string; note: string },
    ) => {
      switch (action.type) {
        case 'accept':
          return api.partnerBookingActions.accept(action.id);
        case 'reject':
          return api.partnerBookingActions.reject(action.id, action.reason);
        case 'cancel':
          return api.partnerBookingActions.cancel(action.id, action.reason);
        case 'markDone':
          return api.partnerBookingActions.markDone(action.id, action.note);
      }
    },
    meta: { invalidates: BOOKING_KEYS },
  });
}

export function useSaveApplication() {
  return useMutation({
    mutationFn: ({
      pujaId,
      isUpdate,
      body,
    }: {
      pujaId: string;
      isUpdate: boolean;
      body: api.ApplicationInput;
    }) => (isUpdate ? api.updateApplication(pujaId, body) : api.applyToPuja(pujaId, body)),
    meta: { invalidates: [pujaKeys.catalogue()] },
  });
}

export function useCreateWindow() {
  return useMutation({
    mutationFn: ({ startTime, endTime }: { startTime: string; endTime: string }) =>
      api.createWindow(startTime, endTime),
    meta: { invalidates: [pujaKeys.calendars()] },
  });
}

export function useCreatePattern() {
  return useMutation({
    mutationFn: api.createPattern,
    meta: { successMessage: false, invalidates: [pujaKeys.calendars()] },
  });
}

export function useDeleteWindow() {
  return useMutation({
    mutationFn: api.deleteWindow,
    meta: { successMessage: 'Availability removed', invalidates: [pujaKeys.calendars()] },
  });
}
