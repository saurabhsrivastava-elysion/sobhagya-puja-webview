import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateTime, formatRelative, toDate } from '@/lib/format';

interface RelativeTimeProps {
  value: unknown;
  /** Show the absolute UTC time as the label and the relative time in the tooltip. */
  absolute?: boolean;
}

export function RelativeTime({ value, absolute = false }: RelativeTimeProps) {
  const date = toDate(value);
  if (!date) return <span className="text-muted-foreground">—</span>;
  const abs = formatDateTime(date);
  const rel = formatRelative(date);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={date.toISOString()}
          className="whitespace-nowrap tabular-nums"
          suppressHydrationWarning
        >
          {absolute ? abs : rel}
        </time>
      </TooltipTrigger>
      <TooltipContent suppressHydrationWarning>{absolute ? rel : `${abs} UTC`}</TooltipContent>
    </Tooltip>
  );
}
