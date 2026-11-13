import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarClock, CalendarPlus, Loader2, Repeat, Trash2 } from 'lucide-react';
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
import { ListSkeleton } from '@/features/puja/components/lists';
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
      <PageHeader title="Availability" subtitle="When you are free to perform pujas (IST)" />
      <div className="grid grid-cols-2 gap-2 p-4 pb-0">
        <Button variant="outline" className="h-11" onClick={() => setDialog('single')}>
          <CalendarPlus />
          Add time
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setDialog('pattern')}>
          <Repeat />
          Weekly hours
        </Button>
      </div>
      {calendar.data && (
        <p className="px-4 pt-2 text-xs text-muted-foreground">
          Users can book start times inside your free time.{' '}
          {calendar.data.gapMinutes ? `${calendar.data.gapMinutes} min are kept free after each puja.` : ''}
        </p>
      )}

      <section className="flex flex-col gap-3 p-4">
        {calendar.isPending ? (
          <ListSkeleton rows={3} />
        ) : calendar.isError ? (
          <QueryError error={calendar.error} onRetry={() => void calendar.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No free time added"
            description="Add the times you can perform pujas so users can book you."
          />
        ) : (
          days.map(([key, day]) => (
            <article key={key} className="rounded-xl border bg-card p-3">
              <h3 className="mb-2 text-[13px] font-semibold">{formatDay(istInstant(key, '12:00'))}</h3>
              <ul className="flex flex-col gap-1.5">
                {day.windows.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between rounded-lg bg-success/10 px-2 py-1.5 text-[13px]"
                  >
                    <span>
                      Free {formatTime(w.startTime)} – {formatTime(w.endTime)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove"
                      onClick={() =>
                        setDeleting({
                          id: w.id,
                          label: `${formatDay(w.startTime)}, ${formatTime(w.startTime)} – ${formatTime(w.endTime)}`,
                        })
                      }
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </li>
                ))}
                {day.bookings.map((b) => (
                  <li key={b.bookingId} className="rounded-lg bg-primary/10 px-2 py-1.5 text-[13px]">
                    <span className="font-medium">{b.pujaName || 'Puja'}</span> · {formatTime(b.startTime)} –{' '}
                    {formatTime(b.endTime)}
                    {b.userName && <span className="text-muted-foreground"> · {b.userName}</span>}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>

      <SingleWindowDialog open={dialog === 'single'} onClose={() => setDialog(null)} />
      <PatternDialog open={dialog === 'pattern'} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this free time?"
        description={`${deleting?.label ?? ''}. Pujas already booked in it stay booked.`}
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
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormField>
            <FormField label="To">
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
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
            <div className="flex gap-1">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggle(d)}
                  className={cn(
                    'h-9 flex-1 rounded-md border text-xs',
                    weekdays.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormField>
            <FormField label="To">
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
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
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
