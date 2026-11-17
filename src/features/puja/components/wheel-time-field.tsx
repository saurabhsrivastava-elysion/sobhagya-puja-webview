import { Clock } from 'lucide-react';
import { useState } from 'react';
import Picker from 'react-mobile-picker';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/*
 * A time of day chosen on scroll wheels (hour · minute · am/pm), like a phone alarm clock. Used instead of
 * `<input type="time">`, whose native Android picker can drop minutes typed on the keyboard. Same value
 * format as that input ("HH:mm", 24-hour), so callers do not change.
 */

type Wheel = { hour: string; minute: string; period: 'am' | 'pm' };

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['am', 'pm'] as const;

function toWheel(value: string): Wheel {
  const [h = 9, m = 0] = value.split(':').map(Number);
  return { hour: String(h % 12 || 12), minute: String(m).padStart(2, '0'), period: h < 12 ? 'am' : 'pm' };
}

function fromWheel({ hour, minute, period }: Wheel): string {
  const h = (Number(hour) % 12) + (period === 'pm' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${minute}`;
}

function label(value: string): string {
  const w = toWheel(value);
  return `${w.hour}:${w.minute} ${w.period}`;
}

export function WheelTimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Wheel>(() => toWheel(value));

  const openChange = (next: boolean) => {
    // Each opening starts from the saved value; closing without "Set" keeps it.
    if (next) setDraft(toWheel(value));
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-between px-3 font-normal">
          {value ? label(value) : 'Select time'}
          <Clock className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="center">
        <div className="relative">
          {/* Highlights the selected row behind the wheels. */}
          <div className="pointer-events-none absolute inset-x-1 top-1/2 h-9 -translate-y-1/2 rounded-md bg-muted" />
          <Picker value={draft} onChange={setDraft} height={180} itemHeight={36} wheelMode="natural">
            <Picker.Column name="hour">
              {HOURS.map((h) => (
                <Picker.Item key={h} value={h}>
                  {({ selected }) => <span className={selected ? 'font-semibold' : 'text-muted-foreground'}>{h}</span>}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="minute">
              {MINUTES.map((m) => (
                <Picker.Item key={m} value={m}>
                  {({ selected }) => <span className={selected ? 'font-semibold' : 'text-muted-foreground'}>{m}</span>}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="period">
              {PERIODS.map((p) => (
                <Picker.Item key={p} value={p}>
                  {({ selected }) => <span className={selected ? 'font-semibold' : 'text-muted-foreground'}>{p}</span>}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onChange(fromWheel(draft));
              setOpen(false);
            }}
          >
            Set
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
