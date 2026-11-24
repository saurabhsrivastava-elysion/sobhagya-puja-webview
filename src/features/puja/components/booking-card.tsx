import { Link } from '@tanstack/react-router';
import { CalendarDays, ChevronRight, MessageCircle } from 'lucide-react';

import { BookingStatusBadge } from '@/features/puja/components/booking-status';
import { PersonAvatar } from '@/features/puja/components/person';
import type { Booking } from '@/features/puja/schemas';
import { formatRupees, formatSlot } from '@/lib/format';

/** One booking in a list; the other party is shown (the astrologer to a user, the user to an astrologer). */
export function BookingCard({ booking, role }: { booking: Booking; role: 'user' | 'astrologer' }) {
  const other = role === 'user' ? booking.astrologer : booking.user;
  const unread = role === 'user' ? booking.chat?.unreadForUser : booking.chat?.unreadForAstrologer;
  const forName = role === 'astrologer' ? booking.userDetails?.name || other.name : other.name;

  return (
    <Link
      to={role === 'user' ? '/u/bookings/$id' : '/a/bookings/$id'}
      params={{ id: booking.id }}
      className="flex flex-col gap-3 surface p-4 transition-transform duration-150 active:scale-[0.99] active:bg-muted/40"
    >
      <div className="flex items-start gap-3">
        <PersonAvatar name={other.name} src={other.avatar} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{booking.puja?.name || 'Pooja'}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {role === 'user' ? 'with ' : 'for '}
            <span className="font-medium text-foreground/80">{forName || '—'}</span>
          </p>
        </div>
        <BookingStatusBadge status={booking.status} role={role} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-dashed pt-3 text-[13px]">
        <span className="flex items-center gap-1.5 font-medium">
          <CalendarDays className="size-4 text-primary" />
          {formatSlot(booking.slotStart)}
        </span>
        <span className="flex items-center gap-2.5">
          {Number(unread) > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
              <MessageCircle className="size-3.5" />
              {unread}
            </span>
          )}
          <span className="font-bold">
            {formatRupees(role === 'astrologer' ? (booking.astrologerEarning ?? booking.amount) : booking.amount)}
          </span>
          <ChevronRight className="-mr-1 size-4 text-muted-foreground" />
        </span>
      </div>
    </Link>
  );
}
