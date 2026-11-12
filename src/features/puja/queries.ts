import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';

import * as api from '@/features/puja/api';
import type { BookingTab } from '@/features/puja/schemas';

type Role = 'user' | 'astrologer';

export const pujaKeys = {
  all: ['puja'] as const,
  me: () => [...pujaKeys.all, 'me'] as const,
  categories: () => [...pujaKeys.all, 'categories'] as const,
  pujas: () => [...pujaKeys.all, 'pujas'] as const,
  pujaList: (categoryId: string, search: string) =>
    [...pujaKeys.pujas(), 'list', categoryId, search] as const,
  puja: (id: string) => [...pujaKeys.pujas(), 'detail', id] as const,
  astrologers: (pujaId: string) => [...pujaKeys.all, 'astrologers', pujaId] as const,
  startTimes: (astrologerId: string, pujaId: string) =>
    [...pujaKeys.all, 'start-times', astrologerId, pujaId] as const,
  bookings: () => [...pujaKeys.all, 'bookings'] as const,
  bookingList: (role: Role, tab: BookingTab) => [...pujaKeys.bookings(), 'list', role, tab] as const,
  booking: (id: string) => [...pujaKeys.bookings(), 'detail', id] as const,
  catalogue: () => [...pujaKeys.all, 'catalogue'] as const,
  calendar: (from: string, to: string) => [...pujaKeys.all, 'calendar', from, to] as const,
  calendars: () => [...pujaKeys.all, 'calendar'] as const,
  thread: (id: string) => [...pujaKeys.all, 'thread', id] as const,
  messages: (id: string) => [...pujaKeys.all, 'messages', id] as const,
};

const PAGE_SIZE = 20;

export const pujaQueries = {
  me: () => queryOptions({ queryKey: pujaKeys.me(), queryFn: api.getMe, staleTime: 5 * 60_000 }),

  categories: () =>
    queryOptions({ queryKey: pujaKeys.categories(), queryFn: api.listCategories, staleTime: 5 * 60_000 }),

  pujaList: (categoryId: string, search: string) =>
    infiniteQueryOptions({
      queryKey: pujaKeys.pujaList(categoryId, search),
      queryFn: ({ pageParam }) =>
        api.listPujas({
          categoryId: categoryId || undefined,
          search: search || undefined,
          page: pageParam,
          limit: PAGE_SIZE,
        }),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
      placeholderData: keepPreviousData,
    }),

  puja: (id: string) => queryOptions({ queryKey: pujaKeys.puja(id), queryFn: () => api.getPuja(id) }),

  astrologers: (pujaId: string) =>
    infiniteQueryOptions({
      queryKey: pujaKeys.astrologers(pujaId),
      queryFn: ({ pageParam }) => api.listPujaAstrologers(pujaId, pageParam, PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    }),

  startTimes: (astrologerId: string, pujaId: string) =>
    queryOptions({
      queryKey: pujaKeys.startTimes(astrologerId, pujaId),
      queryFn: () => api.listStartTimes(astrologerId, pujaId),
      // Times are taken by other users; keep the list fresh.
      staleTime: 0,
    }),

  bookingList: (role: Role, tab: BookingTab) =>
    infiniteQueryOptions({
      queryKey: pujaKeys.bookingList(role, tab),
      queryFn: ({ pageParam }) => api.listBookings(role, tab, pageParam, PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    }),

  booking: (role: Role, id: string) =>
    queryOptions({
      queryKey: pujaKeys.booking(id),
      queryFn: () => api.getBooking(role, id),
      staleTime: 5_000,
    }),

  catalogue: () => queryOptions({ queryKey: pujaKeys.catalogue(), queryFn: api.listCatalogue }),

  calendar: (from: string, to: string) =>
    queryOptions({ queryKey: pujaKeys.calendar(from, to), queryFn: () => api.getCalendar(from, to) }),

  thread: (id: string) =>
    queryOptions({ queryKey: pujaKeys.thread(id), queryFn: () => api.getThread(id), staleTime: 5_000 }),
};
