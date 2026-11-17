import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CalendarX2, Loader2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { DobPicker } from '@/features/puja/components/dob-picker';
import { GotraPicker } from '@/features/puja/components/gotra-picker';
import { PersonAvatar } from '@/features/puja/components/person';
import { useCreateBooking, useMe } from '@/features/puja/hooks';
import { pujaKeys, pujaQueries } from '@/features/puja/queries';
import type { BookableAstrologer, Page } from '@/features/puja/schemas';
import { isApiError } from '@/lib/api/errors';
import { formatDay, formatMinutes, formatRupees, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/u/book/$pujaId/$astrologerId')({
  component: BookPuja,
});

/** Errors the user can fix by picking another time. */
const TIME_ERRORS = new Set([
  'TIME_TAKEN',
  'TIME_NOT_AVAILABLE',
  'TIME_TOO_SOON',
  'TIME_TOO_FAR',
  'DAILY_LIMIT_REACHED',
]);

function BookPuja() {
  const { pujaId, astrologerId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe().data;
  const puja = useQuery(pujaQueries.puja(pujaId));
  const times = useQuery(pujaQueries.startTimes(astrologerId, pujaId));
  const create = useCreateBooking();

  // The astrologer card the user tapped; there is no single-astrologer endpoint.
  const astrologer = useMemo(() => {
    const data = queryClient.getQueryData<InfiniteData<Page<BookableAstrologer>>>(
      pujaKeys.astrologers(pujaId),
    );
    return data?.pages.flatMap((p) => p.items).find((a) => a.astrologerId === astrologerId);
  }, [queryClient, pujaId, astrologerId]);

  const days = useMemo(() => (times.data?.days ?? []).filter((d) => d.startTimes.length > 0), [times.data]);
  const [pickedDay, setDay] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  // The shell loads the profile before any page renders, so the name can be prefilled here.
  const [details, setDetails] = useState(() => ({
    name: me?.name ?? '',
    gotra: '',
    dateOfBirth: '',
    sankalp: '',
  }));

  // The first free day until the user picks one.
  const day = pickedDay ?? days[0]?.date ?? null;
  const selectedDay = days.find((d) => d.date === day);
  const canBook = Boolean(startTime && details.name.trim()) && !create.isPending;

  const book = () => {
    if (!startTime) return;
    create.mutate(
      {
        pujaId,
        astrologerId,
        startTime,
        userDetails: {
          name: details.name.trim(),
          ...(details.gotra.trim() && { gotra: details.gotra.trim() }),
          ...(details.dateOfBirth.trim() && { dateOfBirth: details.dateOfBirth.trim() }),
          ...(details.sankalp.trim() && { sankalp: details.sankalp.trim() }),
        },
      },
      {
        onSuccess: ({ booking }) => {
          toast.success(
            booking.status === 'PAYMENT_PENDING'
              ? 'Booking placed. Confirming your payment…'
              : 'Booking placed. The astrologer will confirm soon.',
          );
          void navigate({ to: '/u/bookings/$id', params: { id: booking.id }, replace: true });
        },
        onError: (err) => {
          if (isApiError(err) && err.code && TIME_ERRORS.has(err.code)) {
            setStartTime(null);
            void times.refetch();
          }
        },
      },
    );
  };

  const lowBalance = isApiError(create.error) && create.error.code === 'INSUFFICIENT_BALANCE';

  return (
    <div className="mx-auto w-full max-w-md pb-28">
      <PageHeader title="Book pooja" subtitle={puja.data?.name} backTo={`/u/pujas/${pujaId}`} />

      <section className="flex items-center gap-3 border-b p-4">
        <PersonAvatar name={astrologer?.name} src={astrologer?.avatar} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{astrologer?.name || 'Astrologer'}</p>
          <p className="text-xs text-muted-foreground">
            {formatMinutes(puja.data?.durationMinutes)} · {formatRupees(puja.data?.price)}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Pick a date and time</h2>
        <p className="-mt-2 text-xs text-muted-foreground">All times are Indian Standard Time.</p>
        {times.isPending ? (
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-16 rounded-lg" />
            ))}
          </div>
        ) : times.isError ? (
          <QueryError error={times.error} onRetry={() => void times.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No free time in the next two weeks"
            description="Please choose another astrologer or check again later."
          />
        ) : (
          <>
            <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
              {days.map((d) => {
                const [weekday, rest] = formatDay(`${d.date}T12:00:00+05:30`).split(', ');
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setDay(d.date);
                      setStartTime(null);
                    }}
                    className={cn(
                      'flex w-16 shrink-0 flex-col items-center rounded-lg border py-2 text-xs',
                      d.date === day ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                    )}
                  >
                    <span className="opacity-80">{weekday}</span>
                    <span className="font-semibold">{rest}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {selectedDay?.startTimes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStartTime(t)}
                  className={cn(
                    'h-10 rounded-lg border text-sm',
                    t === startTime ? 'border-primary bg-primary/15 font-semibold text-primary' : 'bg-card',
                  )}
                >
                  {formatTime(t)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t p-4">
        <h2 className="font-semibold">Pooja details</h2>
        <Field label="Name for the sankalp *">
          <Input
            value={details.name}
            onChange={(e) => setDetails({ ...details, name: e.target.value })}
            maxLength={120}
            placeholder="Full name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gotra">
            <GotraPicker value={details.gotra} onChange={(gotra) => setDetails({ ...details, gotra })} />
          </Field>
          <Field label="Date of birth">
            <DobPicker
              value={details.dateOfBirth}
              onChange={(dateOfBirth) => setDetails({ ...details, dateOfBirth })}
            />
          </Field>
        </div>
        <Field label="Your wish (sankalp)">
          <Textarea
            value={details.sankalp}
            onChange={(e) => setDetails({ ...details, sankalp: e.target.value })}
            maxLength={1000}
            rows={3}
            placeholder="What would you like the pooja performed for?"
          />
        </Field>
        {lowBalance && (
          <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
            <Wallet className="size-4 shrink-0 text-warning-text" />
            <p>Your Sobhagya wallet does not have enough balance. Add money in the app, then book again.</p>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {startTime ? `${formatDay(startTime)} · ${formatTime(startTime)}` : 'Pick a time'}
            </p>
            <p className="font-semibold">{formatRupees(puja.data?.price)}</p>
          </div>
          <Button className="h-11 px-6" disabled={!canBook} onClick={book}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Pay & book
          </Button>
        </div>
        <p className="mx-auto mt-1 max-w-md text-[11px] text-muted-foreground">
          Paid from your Sobhagya wallet. Fully refunded if the astrologer does not accept.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
