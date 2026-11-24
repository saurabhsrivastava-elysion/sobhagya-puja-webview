import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarClock, CalendarPlus, Flower2, Loader2, Repeat, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { WheelTimeField } from '@/features/puja/components/wheel-time-field';
import { useCreatePattern, useCreateWindow, useDeleteWindow } from '@/features/puja/hooks';
import { pujaQueries } from '@/features/puja/queries';
import { formatDay, formatTime, shiftDateKey, toDateKey, todayKey } from '@/lib/format';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/a/availability')({
  component: Availability,
});

const DAYS_SHOWN = 30;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** An IST wall-clock time as an instant (the backend and users both think in IST). */
function istInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

function Availability() {
  const from = todayKey();
  const to = shiftDateKey(from, DAYS_SHOWN);
  const calendar = useQuery(
    pujaQueries.calendar(istInstant(from, '00:00').toISOString(), istInstant(to, '00:00').toISOString()),
  );
  const [dialog, setDialog] = useState<null | 'single' | 'pattern'>(null);
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null);
  const remove = useDeleteWindow();

  // One entry per IST day that has free time or bookings.
  const days = useMemo(() => {
    const bookings = calendar.data?.bookings ?? [];
    const byDay = new Map<
      string,
      { windows: { id: string; startTime: string; endTime: string }[]; bookings: typeof bookings }
    >();
    const entry = (key: string) => {
      let e = byDay.get(key);
      if (!e) byDay.set(key, (e = { windows: [], bookings: [] }));
      return e;
    };
    for (const w of calendar.data?.windows ?? []) entry(toDateKey(new Date(w.startTime))).windows.push(w);
    for (const b of bookings) entry(toDateKey(new Date(b.startTime))).bookings.push(b);
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [calendar.data]);

  return (
    <NavPage>
      <PageHeader title="Availability" subtitle="When you are free to perform poojas (IST)" />
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <ActionTile
          icon={<CalendarPlus />}
          title="Add time"
          hint="One day"
          active={dialog === 'single'}
          onClick={() => setDialog('single')}
        />
        <ActionTile
          icon={<Repeat />}
          title="Weekly hours"
          hint="Repeat on weekdays"
          active={dialog === 'pattern'}
          onClick={() => setDialog('pattern')}
        />
      </div>

      <div className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-l-[3px] border-free-text bg-free" />
            Free time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-l-[3px] border-primary bg-booked" />
            Booked pooja
          </span>
        </div>
        {calendar.data && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Users can book start times inside your free time.{' '}
            {calendar.data.gapMinutes
              ? `${calendar.data.gapMinutes} min are kept free after each pooja.`
              : ''}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3 p-4">
        {calendar.isPending ? (
          <DaySkeleton />
        ) : calendar.isError ? (
          <QueryError error={calendar.error} onRetry={() => void calendar.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No free time added"
            description="Add the times you can perform poojas so users can book you."
            action={
              <Button onClick={() => setDialog('pattern')}>
                <Repeat />
                Set weekly hours
              </Button>
            }
          />
        ) : (
          days.map(([key, day]) => {
            const [weekday, rest = ''] = formatDay(istInstant(key, '12:00')).split(', ');
            const [dayNum, month] = rest.split(' ');
            const isToday = key === from;
            // Free blocks and bookings in time order, so the day reads like a timeline.
            const items = [
              ...day.windows.map((w) => ({ kind: 'free' as const, at: w.startTime, w })),
              ...day.bookings.map((b) => ({ kind: 'booked' as const, at: b.startTime, b })),
            ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
            return (
              <article key={key} className="flex gap-3 surface p-3">
                <div
                  className={cn(
                    'flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-xl py-2',
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn('text-[11px] font-semibold uppercase', !isToday && 'text-muted-foreground')}
                  >
                    {isToday ? 'Today' : weekday}
                  </span>
                  <span className="text-xl leading-tight font-bold">{dayNum}</span>
                  <span className={cn('text-[11px]', !isToday && 'text-muted-foreground')}>{month}</span>
                </div>
                <ul className="flex min-w-0 flex-1 flex-col gap-2">
                  {items.map((item) =>
                    item.kind === 'free' ? (
                      <li
                        key={item.w.id}
                        className="flex items-center gap-2 rounded-lg border-l-4 border-free-text bg-free py-1 pr-1 pl-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold tracking-wide text-free-text uppercase">
                            Free
                          </p>
                          <p className="text-sm font-semibold">
                            {formatTime(item.w.startTime)} – {formatTime(item.w.endTime)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove free time"
                          className="text-danger-text active:bg-destructive/10"
                          onClick={() =>
                            setDeleting({
                              id: item.w.id,
                              label: `${formatDay(item.w.startTime)}, ${formatTime(item.w.startTime)} – ${formatTime(item.w.endTime)}`,
                            })
                          }
                        >
                          <Trash2 className="size-[18px]" />
                        </Button>
                      </li>
                    ) : (
                      <li
                        key={item.b.bookingId}
                        className="rounded-lg border-l-4 border-primary bg-booked py-2 pr-2 pl-3"
                      >
                        <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-booked-text uppercase">
                          <Flower2 className="size-3" />
                          Booked
                        </p>
                        <p className="truncate text-sm font-semibold">{item.b.pujaName || 'Pooja'}</p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {formatTime(item.b.startTime)} – {formatTime(item.b.endTime)}
                          {item.b.userName && ` · ${item.b.userName}`}
                        </p>
                      </li>
                    ),
                  )}
                </ul>
              </article>
            );
          })
        )}
      </section>

      <SingleWindowDialog open={dialog === 'single'} onClose={() => setDialog(null)} />
      <PatternDialog open={dialog === 'pattern'} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this free time?"
        description={`${deleting?.label ?? ''}. Poojas already booked in it stay booked.`}
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </NavPage>
  );
}

function SingleWindowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWindow();
  const [date, setDate] = useState(todayKey());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');

  const submit = () => {
    const startAt = istInstant(date, start);
    let endAt = istInstant(date, end);
    // An end at or before the start runs past midnight.
    if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
    create.mutate({ startTime: startAt.toISOString(), endTime: endAt.toISOString() }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add free time</DialogTitle>
          <DialogDescription>Indian Standard Time. Between 15 minutes and 16 hours.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FormField label="Date">
            <Input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From">
              <WheelTimeField value={start} onChange={setStart} />
            </FormField>
            <FormField label="To">
              <WheelTimeField value={end} onChange={setEnd} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Close
          </Button>
          <Button onClick={submit} disabled={create.isPending || !date || !start || !end}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PatternDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePattern();
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(shiftDateKey(todayKey(), 27));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');

  const toggle = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));

  const submit = () =>
    create.mutate(
      { fromDate, toDate, weekdays, startTime: start, endTime: end },
      {
        onSuccess: ({ result }) => {
          const skipped = result.skipped.length;
          toast.success(
            `Added ${result.created.length} day${result.created.length === 1 ? '' : 's'} of free time` +
              (skipped ? `. ${skipped} skipped (already free or overlapping).` : '.'),
          );
          onClose();
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weekly hours</DialogTitle>
          <DialogDescription>
            Adds the same free time on the chosen weekdays between two dates (IST).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From date">
              <Input
                type="date"
                value={fromDate}
                min={todayKey()}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </FormField>
            <FormField label="To date">
              <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Days">
            <div className="flex gap-1.5">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggle(d)}
                  className={cn(
                    'h-11 flex-1 rounded-xl border text-[13px] font-semibold transition-colors',
                    weekdays.includes(d)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card active:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From">
              <WheelTimeField value={start} onChange={setStart} />
            </FormField>
            <FormField label="To">
              <WheelTimeField value={end} onChange={setEnd} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Close
          </Button>
          <Button onClick={submit} disabled={create.isPending || weekdays.length === 0 || toDate < fromDate}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function ActionTile({
  icon,
  title,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-h-[68px] items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 active:scale-[0.98]',
        active ? 'border-primary-tint bg-primary-soft' : 'border-border bg-card shadow-card',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors [&_svg]:size-5',
          active ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary-strong',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function DaySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3 surface p-3">
          <Skeleton className="h-[68px] w-14 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            {i === 0 && <Skeleton className="h-14 w-full rounded-lg" />}
          </div>
        </div>
      ))}
    </div>
  );
}
