import { Check, ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GOTRAS, UNKNOWN_GOTRA_VALUE, matchGotras } from '@/features/puja/gotras';
import { cn } from '@/lib/utils';

const OTHER_MAX_LENGTH = 40;
const isListed = (value: string) => GOTRAS.some((g) => g.name === value);
/** Letters and spaces only, in any script (so a gotra typed in Hindi works too). */
const lettersOnly = (value: string) => value.replace(/[^\p{L}\p{M} ]/gu, '').replace(/ {2,}/g, ' ');

/**
 * Gotra chosen from a searchable list, plus "I don't know" (saved as Kashyap, by tradition) and "Other"
 * for a gotra that is not listed. `value` is what the booking stores; '' when not chosen.
 */
export function GotraPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // A value that is neither listed nor "don't know" was typed under "Other".
  const [other, setOther] = useState(() => value !== '' && value !== UNKNOWN_GOTRA_VALUE && !isListed(value));
  const matches = matchGotras(query);

  const choose = (next: string, isOther = false) => {
    setOther(isOther);
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  const label = other ? 'Other' : value === UNKNOWN_GOTRA_VALUE ? "Don't know" : value;

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn('h-9 w-full justify-between px-3 font-normal', !label && 'text-muted-foreground')}
          >
            <span className="truncate">{label || 'Select'}</span>
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gotra"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1" role="listbox">
            {!query && (
              <Option selected={value === UNKNOWN_GOTRA_VALUE} onSelect={() => choose(UNKNOWN_GOTRA_VALUE)}>
                I don&apos;t know my gotra
              </Option>
            )}
            {matches.map((g) => (
              <Option key={g.name} selected={!other && value === g.name} onSelect={() => choose(g.name)}>
                {g.name}
              </Option>
            ))}
            {matches.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">Not in the list</p>}
            <Option selected={other} onSelect={() => choose('', true)}>
              Other (type it)
            </Option>
          </div>
        </PopoverContent>
      </Popover>

      {other && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(lettersOnly(e.target.value))}
          maxLength={OTHER_MAX_LENGTH}
          placeholder="Your gotra"
        />
      )}
      {value === UNKNOWN_GOTRA_VALUE && (
        <p className="text-[11px] text-muted-foreground">The pooja will be performed in Kashyap gotra.</p>
      )}
    </div>
  );
}

function Option({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      {children}
      {selected && <Check className="size-4 text-primary" />}
    </button>
  );
}
