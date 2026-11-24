import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CalendarClock, Clock, IndianRupee, Info, MessageCircle, Phone, Star, Video } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { handOffCallToApp } from '@/features/call/app-bridge';
import { formatCallTime, useVoiceCallTime } from '@/features/call/call-time';
import { BookingStatusBadge, outcomeLabel } from '@/features/puja/components/booking-status';
import { PersonAvatar } from '@/features/puja/components/person';
import { ReasonDialog } from '@/features/puja/components/reason-dialog';
import { ReasonSelectDialog } from '@/features/puja/components/reason-select-dialog';
import { ASTROLOGER_CANCEL_REASONS, DECLINE_REASONS } from '@/features/puja/decline-reasons';
import { usePartnerBookingAction, useUserBookingAction } from '@/features/puja/hooks';
import { pujaQueries } from '@/features/puja/queries';
import { CHAT_VISIBLE, CHAT_WRITABLE, type Booking } from '@/features/puja/schemas';
import { formatDateTime, formatMinutes, formatRupees, formatSlot, formatTime, toDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Role = 'user' | 'astrologer';

export function BookingDetail({ role, id }: { role: Role; id: string }) {
  const query = useQuery(pujaQueries.booking(role, id));
  const backTo = role === 'user' ? '/u/bookings' : '/a';

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Booking" backTo={backTo} />
        <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading">
          <div className="flex items-center gap-3 surface p-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title="Booking" backTo={backTo} />
        <div className="p-4">
          <QueryError error={query.error} onRetry={() => void query.refetch()} />
        </div>
      </>
    );
  }

  const b = query.data;
  const other = role === 'user' ? b.astrologer : b.user;
  const outcome = outcomeLabel(b.outcome);

  return (
    <>
      <PageHeader title={b.puja?.name || 'Booking'} subtitle={formatSlot(b.slotStart)} backTo={backTo} />
      <div className="flex flex-col gap-3 p-4">
        <section className="flex items-center gap-3 surface p-4">
          <PersonAvatar name={other.name} src={other.avatar} className="size-14" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {role === 'user' ? 'Astrologer' : 'Booked by'}
            </p>
            <p className="truncate text-base font-bold">{other.name || '—'}</p>
          </div>
          <BookingStatusBadge status={b.status} role={role} />
        </section>

        <StatusNote booking={b} role={role} />

        <ConversationButtons booking={b} role={role} />

        <section className="flex flex-col gap-3.5 surface p-4 text-sm">
          <Row icon={<CalendarClock />} label="When">
            {formatSlot(b.slotStart)} – {formatTime(b.slotEnd)}
          </Row>
          <Row icon={<Clock />} label="Duration">
            {formatMinutes(b.puja?.durationMinutes)}
          </Row>
          {role === 'astrologer' ? (
            // The astrologer sees what they get (price minus Sobhagya's commission), not what the user paid.
            <Row icon={<IndianRupee />} label="Your earning">
              {formatRupees(b.astrologerEarning ?? b.amount)}
            </Row>
          ) : (
            <Row icon={<IndianRupee />} label="Paid">
              {formatRupees(b.amount)}
              {b.refund && Number(b.refund.amount) > 0 && (
                <span className="ml-1 text-success-text">
                  · {formatRupees(b.refund.amount)} refund{' '}
                  {b.refund.status === 'DONE' ? 'credited' : 'in progress'}
                </span>
              )}
            </Row>
          )}
          {outcome && (
            <Row icon={<Star />} label="Result">
              {outcome}
            </Row>
          )}
        </section>

        {b.userDetails && (
          <section className="flex flex-col gap-3 surface p-4 text-sm">
            <h3 className="text-[15px] font-bold">Pooja details</h3>
            <Detail label="Name">{b.userDetails.name}</Detail>
            <Detail label="Gotra">{b.userDetails.gotra}</Detail>
            <Detail label="Date of birth">{b.userDetails.dateOfBirth}</Detail>
            <Detail label="Sankalp">{b.userDetails.sankalp}</Detail>
          </section>
        )}

        {b.markedDoneNote && (
          <section className="surface p-4 text-sm">
            <h3 className="text-[15px] font-bold">Astrologer’s note</h3>
            <p className="mt-1.5 leading-relaxed whitespace-pre-line text-muted-foreground">
              {b.markedDoneNote}
            </p>
          </section>
        )}

        {b.review && (
          <section className="surface p-4 text-sm">
            <h3 className="flex items-center gap-2 text-[15px] font-bold">
              Review
              <Stars value={Number(b.review.rating)} />
            </h3>
            {b.review.text && <p className="mt-1.5 leading-relaxed text-muted-foreground">{b.review.text}</p>}
          </section>
        )}

        {role === 'user' ? <UserActions booking={b} /> : <AstrologerActions booking={b} />}
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: string | null | undefined }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-t border-dashed pt-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium whitespace-pre-line">{children}</span>
    </div>
  );
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="disabled:cursor-default"
        >
          <Star
            className={cn(
              onChange ? 'size-10' : 'size-4',
              n <= value ? 'fill-warning text-warning' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </span>
  );
}

/** What happens next, in one sentence. */
function StatusNote({ booking: b, role }: { booking: Booking; role: Role }) {
  const notes: Record<string, string | null> =
    role === 'user'
      ? {
          PAYMENT_PENDING: 'We are confirming your payment. This usually takes a moment.',
          PENDING: `Waiting for the astrologer to accept${b.acceptDeadline ? ` (by ${formatDateTime(b.acceptDeadline)})` : ''}. You get a full refund if they don’t.`,
          CONFIRMED: 'Confirmed. You can chat with your astrologer before the pooja.',
          LIVE: 'Your pooja is in progress.',
          MARKED_DONE: `The astrologer has marked the pooja as done. Please confirm, or report a problem${b.autoCompleteAt ? ` before ${formatDateTime(b.autoCompleteAt)}` : ''}.`,
          DISPUTED: 'Sobhagya is reviewing this booking and will get back to you.',
        }
      : {
          PENDING: `New request. Accept${b.acceptDeadline ? ` by ${formatDateTime(b.acceptDeadline)}` : ''}, or it is refunded to the user.`,
          CONFIRMED: 'Confirmed. The pooja starts at the booked time.',
          LIVE: 'In progress. Mark it done when the pooja is complete.',
          MARKED_DONE: 'Waiting for the user to confirm. It completes automatically if they don’t respond.',
          DISPUTED: 'Sobhagya is reviewing this booking.',
        };
  const note = notes[b.status];
  if (!note) return null;
  const danger = b.status === 'DISPUTED';
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border p-3.5 text-sm leading-relaxed',
        danger ? 'border-destructive/20 bg-destructive/5' : 'border-primary-tint bg-primary-soft',
      )}
    >
      <Info
        className={cn('mt-0.5 size-[18px] shrink-0', danger ? 'text-danger-text' : 'text-primary-strong')}
      />
      <p>{note}</p>
    </div>
  );
}

function ConversationButtons({ booking: b, role }: { booking: Booking; role: Role }) {
  const end = toDate(b.slotEnd);
  const canCall =
    role === 'user' &&
    CHAT_WRITABLE.includes(b.status) &&
    (b.puja?.callAllowed ?? true) &&
    end !== null &&
    end > new Date();
  // Voice calls share a talk-time limit per booking; video calls run until the slot ends.
  const voice = useVoiceCallTime(b.id, canCall);
  if (!CHAT_VISIBLE.includes(b.status)) return null;
  const unread = role === 'user' ? b.chat?.unreadForUser : b.chat?.unreadForAstrologer;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-flow-col gap-2">
        <Button asChild variant="soft" size="lg">
          <Link to="/chat/$bookingId" params={{ bookingId: b.id }}>
            <MessageCircle className="size-5" />
            Chat
            {Number(unread) > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {unread}
              </span>
            )}
          </Link>
        </Button>
        {canCall && (
          <>
            {voice.usedUp ? (
              <Button variant="outline" size="lg" disabled aria-describedby="voice-call-time">
                <Phone />
                Call
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link
                  to="/call/$bookingId"
                  params={{ bookingId: b.id }}
                  search={{ type: 'call' }}
                  onClick={handOffCallToApp(b.id, 'call')}
                >
                  <Phone />
                  Call
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link
                to="/call/$bookingId"
                params={{ bookingId: b.id }}
                search={{ type: 'video' }}
                onClick={handOffCallToApp(b.id, 'video')}
              >
                <Video />
                Video
              </Link>
            </Button>
          </>
        )}
      </div>
      {canCall && voice.remainingSeconds !== null && voice.limitSeconds !== null && (
        <p id="voice-call-time" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          {voice.usedUp ? (
            <span>
              Your {formatCallTime(voice.limitSeconds)} of call time is used up. Video call is available till
              the pooja slot ends.
            </span>
          ) : (
            <span>
              Call time left:{' '}
              <span className="font-semibold text-foreground">{formatCallTime(voice.remainingSeconds)}</span>{' '}
              of {formatCallTime(voice.limitSeconds)}. Video call is available till the pooja slot ends.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

type Dialog = null | 'cancel' | 'dispute' | 'confirm' | 'review' | 'reject' | 'accept' | 'markDone';

function UserActions({ booking: b }: { booking: Booking }) {
  const action = useUserBookingAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const close = () => setDialog(null);
  const start = toDate(b.slotStart);
  const beforeStart = start !== null && start > new Date();
  const canCancel = beforeStart && (b.status === 'PENDING' || b.status === 'CONFIRMED');

  return (
    <div className="flex flex-col gap-2 pt-1">
      {b.status === 'MARKED_DONE' && (
        <>
          <Button size="lg" onClick={() => setDialog('confirm')}>
            Confirm pooja completed
          </Button>
          <Button variant="outline" size="lg" onClick={() => setDialog('dispute')}>
            Report a problem
          </Button>
        </>
      )}
      {b.status === 'COMPLETED' && !b.review && (
        <Button size="lg" onClick={() => setDialog('review')}>
          <Star />
          Rate your astrologer
        </Button>
      )}
      {canCancel && (
        <Button variant="ghost" size="lg" className="text-danger-text" onClick={() => setDialog('cancel')}>
          Cancel booking
        </Button>
      )}

      <ReasonDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && close()}
        title="Cancel this booking?"
        description={
          b.status === 'PENDING'
            ? 'The astrologer has not accepted yet, so you get a full refund.'
            : 'The astrologer has already accepted. Cancelling now is not refunded.'
        }
        confirmLabel="Cancel booking"
        destructive
        pending={action.isPending}
        onConfirm={(reason) => action.mutate({ type: 'cancel', id: b.id, reason }, { onSuccess: close })}
      />
      <ConfirmDialog
        open={dialog === 'confirm'}
        onOpenChange={(o) => !o && close()}
        title="Was your pooja completed?"
        description="Confirming releases the payment to the astrologer."
        confirmLabel="Yes, completed"
        pending={action.isPending}
        onConfirm={() => action.mutate({ type: 'confirm', id: b.id }, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === 'dispute'}
        onOpenChange={(o) => !o && close()}
        title="Report a problem"
        description="Tell us what went wrong. Sobhagya will review it and decide on a refund."
        confirmLabel="Report"
        required
        destructive
        pending={action.isPending}
        onConfirm={(reason) => action.mutate({ type: 'dispute', id: b.id, reason }, { onSuccess: close })}
      />
      <ConfirmDialog
        open={dialog === 'review'}
        onOpenChange={(o) => !o && close()}
        title="Rate your astrologer"
        confirmLabel="Submit"
        pending={action.isPending}
        onConfirm={() =>
          action.mutate({ type: 'review', id: b.id, rating, text: text.trim() }, { onSuccess: close })
        }
      >
        <div className="flex flex-col items-center gap-3">
          <Stars value={rating} onChange={setRating} />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share your experience (optional)"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function AstrologerActions({ booking: b }: { booking: Booking }) {
  const action = usePartnerBookingAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const deadline = toDate(b.acceptDeadline);
  const canAccept = b.status === 'PENDING' && (!deadline || deadline > new Date());

  return (
    <div className="flex flex-col gap-2 pt-1">
      {canAccept && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => setDialog('reject')}>
            Decline
          </Button>
          <Button size="lg" onClick={() => setDialog('accept')}>
            Accept
          </Button>
        </div>
      )}
      {b.status === 'LIVE' && (
        <Button size="lg" onClick={() => setDialog('markDone')}>
          Mark pooja as done
        </Button>
      )}
      {(b.status === 'CONFIRMED' || b.status === 'LIVE') && (
        <Button variant="ghost" size="lg" className="text-danger-text" onClick={() => setDialog('cancel')}>
          Cancel booking
        </Button>
      )}

      <ConfirmDialog
        open={dialog === 'accept'}
        onOpenChange={(o) => !o && close()}
        title="Accept this booking?"
        description={`You will perform ${b.puja?.name || 'the pooja'} on ${formatSlot(b.slotStart)}.`}
        confirmLabel="Accept"
        pending={action.isPending}
        onConfirm={() => action.mutate({ type: 'accept', id: b.id }, { onSuccess: close })}
      />
      <ReasonSelectDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && close()}
        title="Decline this booking?"
        description="Choose a reason. The user gets a full refund."
        confirmLabel="Decline"
        reasons={DECLINE_REASONS}
        pending={action.isPending}
        onConfirm={(reason) => action.mutate({ type: 'reject', id: b.id, reason }, { onSuccess: close })}
      />
      <ReasonSelectDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && close()}
        title="Cancel this booking?"
        description={
          b.status === 'LIVE'
            ? 'Choose a reason. The pooja has started, so Sobhagya will review the cancellation.'
            : 'Choose a reason. The user gets a full refund. Cancellations affect your reliability.'
        }
        confirmLabel="Cancel booking"
        reasons={ASTROLOGER_CANCEL_REASONS}
        pending={action.isPending}
        onConfirm={(reason) => action.mutate({ type: 'cancel', id: b.id, reason }, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === 'markDone'}
        onOpenChange={(o) => !o && close()}
        title="Mark the pooja as done?"
        description="The user will be asked to confirm."
        confirmLabel="Mark done"
        placeholder="A note for the user (optional)"
        pending={action.isPending}
        onConfirm={(note) => action.mutate({ type: 'markDone', id: b.id, note }, { onSuccess: close })}
      />
    </div>
  );
}
