import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** The format the booking stores and the astrologer reads. */
const DOB_FORMAT = 'dd/MM/yyyy';

function toDate(value: string): Date | undefined {
  const date = parse(value, DOB_FORMAT, new Date());
  return isValid(date) ? date : undefined;
}

/**
 * Date of birth chosen from a calendar (no typing), with month and year dropdowns so a date decades back
 * is two taps away. Future dates cannot be picked. `value` and `onChange` use DD/MM/YYYY, '' when unset.
 */
export function DobPicker({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const today = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('h-9 w-full justify-between px-3 font-normal', !selected && 'text-muted-foreground')}
        >
          {selected ? format(selected, DOB_FORMAT) : 'DD/MM/YYYY'}
          <CalendarIcon className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? new Date(today.getFullYear() - 25, today.getMonth())}
          startMonth={new Date(1900, 0)}
          endMonth={today}
          disabled={{ after: today }}
          onSelect={(date) => {
            onChange(date ? format(date, DOB_FORMAT) : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
