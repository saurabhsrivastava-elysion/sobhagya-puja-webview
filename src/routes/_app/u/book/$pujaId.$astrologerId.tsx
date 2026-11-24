import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  CalendarCheck2,
  CalendarX2,
  Clock,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  Sunrise,
  Wallet,
} from 'lucide-react';
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

const IST_HOUR = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Asia/Kolkata',
});

/** Splits a day's start times into morning / afternoon / evening (IST), keeping order. */
function groupByPartOfDay(times: string[]) {
  const groups = [
    { key: 'morning', label: 'Morning', icon: Sunrise, times: [] as string[] },
    { key: 'afternoon', label: 'Afternoon', icon: Sun, times: [] as string[] },
    { key: 'evening', label: 'Evening', icon: Moon, times: [] as string[] },
  ];
  for (const t of times) {
    const hour = Number(IST_HOUR.format(new Date(t)));
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2]!.times.push(t);
  }
  return groups.filter((g) => g.times.length > 0);
}

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
  const groups = useMemo(() => groupByPartOfDay(selectedDay?.startTimes ?? []), [selectedDay]);

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
    <div className="mx-auto w-full max-w-md pb-36">
      <PageHeader title="Book pooja" subtitle={puja.data?.name} backTo={`/u/pujas/${pujaId}`} />

      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 surface p-3.5">
          <PersonAvatar name={astrologer?.name} src={astrologer?.avatar} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{astrologer?.name || 'Astrologer'}</p>
            <p className="truncate text-[13px] text-muted-foreground">{puja.data?.name ?? 'Pooja'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base leading-tight font-bold text-primary-strong">
              {formatRupees(puja.data?.price)}
            </p>
            <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatMinutes(puja.data?.durationMinutes)}
            </p>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3 p-4">
        <StepTitle n={1} title="Pick a date and time" hint="All times are Indian Standard Time" />
        {times.isPending ? (
          <>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[72px] w-16 shrink-0 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11 rounded-lg" />
              ))}
            </div>
          </>
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
            <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
              {days.map((d) => {
                const [weekday, rest = ''] = formatDay(`${d.date}T12:00:00+05:30`).split(', ');
                const [dayNum, month] = rest.split(' ');
                const active = d.date === day;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setDay(d.date);
                      setStartTime(null);
                    }}
                    className={cn(
                      'flex h-[72px] w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-200',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(255_152_0/0.35)]'
                        : 'border-border bg-card active:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-semibold uppercase',
                        !active && 'text-muted-foreground',
                      )}
                    >
                      {weekday}
                    </span>
                    <span className="text-xl leading-none font-bold">{dayNum}</span>
                    <span className={cn('text-[11px]', !active && 'text-muted-foreground')}>{month}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 pt-1">
              {groups.map((g) => (
                <div key={g.key} className="flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
                    <g.icon className="size-4 text-primary" />
                    {g.label}
                    <span className="font-normal">· {g.times.length} slots</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.times.map((t) => {
                      const active = t === startTime;
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setStartTime(t)}
                          className={cn(
                            'h-11 rounded-lg border text-sm font-medium transition-all duration-150',
                            active
                              ? 'border-primary bg-primary-soft font-bold text-primary-strong ring-2 ring-primary/30'
                              : 'border-border bg-card active:bg-muted',
                          )}
                        >
                          {formatTime(t)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 p-4">
        <StepTitle n={2} title="Pooja details" hint="The astrologer uses these for your sankalp" />
        <div className="flex flex-col gap-4 surface p-4">
          <Field label="Name for the sankalp" required>
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
              className="min-h-24"
              placeholder="What would you like the pooja performed for?"
            />
          </Field>
        </div>
      </section>

      {startTime && (
        <section className="flex flex-col gap-3 px-4 pb-4">
          <StepTitle n={3} title="Review" />
          <div className="flex flex-col gap-2.5 rounded-2xl border border-primary-tint bg-primary-soft/60 p-4 text-sm">
            <SummaryRow label="Pooja" value={puja.data?.name ?? '—'} />
            <SummaryRow label="Astrologer" value={astrologer?.name || '—'} />
            <SummaryRow label="When" value={`${formatDay(startTime)} · ${formatTime(startTime)}`} />
            <SummaryRow label="For" value={details.name.trim() || '—'} />
            <div className="mt-1 flex items-center justify-between border-t border-dashed border-primary-tint pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-primary-strong">{formatRupees(puja.data?.price)}</span>
            </div>
          </div>
        </section>
      )}

      {lowBalance && (
        <div className="mx-4 mb-4 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <Wallet className="size-5 shrink-0 text-warning-text" />
          <p>Your Sobhagya wallet does not have enough balance. Add money in the app, then book again.</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-3 shadow-float backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'flex items-center gap-1 truncate text-xs',
                startTime ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {startTime && <CalendarCheck2 className="size-3.5 shrink-0 text-primary" />}
              {startTime ? `${formatDay(startTime)} · ${formatTime(startTime)}` : 'Pick a time to continue'}
            </p>
            <p className="text-lg leading-tight font-bold">{formatRupees(puja.data?.price)}</p>
          </div>
          <Button size="lg" className="px-6" disabled={!canBook} onClick={book}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Pay & book
          </Button>
        </div>
        <p className="mx-auto mt-1.5 flex max-w-md items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-success-text" />
          Paid from your Sobhagya wallet. Fully refunded if the astrologer does not accept.
        </p>
      </div>
    </div>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="text-base leading-tight font-bold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-semibold">
        {label}
        {required && <span className="text-danger-text">*</span>}
      </Label>
      {children}
    </div>
  );
}
