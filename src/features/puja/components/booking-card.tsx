import { Link } from '@tanstack/react-router';
import { MessageCircle } from 'lucide-react';

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
      className="flex gap-3 rounded-xl border bg-card p-3 transition-colors active:bg-accent"
    >
      <PersonAvatar name={other.name} src={other.avatar} className="size-12" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{booking.puja?.name || 'Pooja'}</p>
          <BookingStatusBadge status={booking.status} role={role} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {role === 'user' ? 'with ' : 'for '}
          {forName || '—'}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span>{formatSlot(booking.slotStart)}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {Number(unread) > 0 && (
              <span className="flex items-center gap-0.5 text-primary">
                <MessageCircle className="size-3.5" />
                {unread}
              </span>
            )}
            {formatRupees(booking.amount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
