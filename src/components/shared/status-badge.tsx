import { cn } from '@/lib/utils';
import { titleCase } from '@/lib/format';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/15 text-success-text',
  warning: 'bg-warning/15 text-warning-text',
  danger: 'bg-destructive/15 text-danger-text',
  info: 'bg-info/15 text-info-text',
  primary: 'bg-primary/15 text-primary',
  neutral: 'bg-muted text-muted-foreground',
};

/** Default tone for status strings that appear across the backend. Modules can override per badge. */
const STATUS_TONES: Record<string, Tone> = {
  approved: 'success',
  published: 'success',
  completed: 'success',
  done: 'success',
  success: 'success',
  active: 'success',
  online: 'success',
  onboarded: 'success',
  ready: 'success',
  enabled: 'success',
  ongoing: 'info',
  scheduled: 'info',
  processing: 'info',
  starting: 'warning',
  pending: 'warning',
  busy: 'warning',
  ogbusy: 'warning',
  draft: 'neutral',
  inactive: 'neutral',
  unpublished: 'neutral',
  offline: 'neutral',
  disabled: 'neutral',
  rejected: 'danger',
  declined: 'danger',
  failed: 'danger',
  blocked: 'danger',
  missed: 'danger',
};

export function toneFor(status: string | null | undefined): Tone {
  return STATUS_TONES[(status ?? '').toLowerCase()] ?? 'neutral';
}

interface StatusBadgeProps {
  status: string | null | undefined;
  tone?: Tone;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, tone, label, className }: StatusBadgeProps) {
  if (!status && !label) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium whitespace-nowrap',
        TONE_CLASSES[tone ?? toneFor(status)],
        className,
      )}
    >
      {label ?? titleCase(status ?? '')}
    </span>
  );
}
