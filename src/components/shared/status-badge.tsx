import { cn } from '@/lib/utils';
import { titleCase } from '@/lib/format';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/12 text-success-text before:bg-success',
  warning: 'bg-warning/15 text-warning-text before:bg-warning',
  danger: 'bg-destructive/10 text-danger-text before:bg-destructive',
  info: 'bg-info/10 text-info-text before:bg-info',
  primary: 'bg-primary-soft text-primary-strong before:bg-primary',
  neutral: 'bg-muted text-muted-foreground before:bg-muted-foreground/60',
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
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-full',
        TONE_CLASSES[tone ?? toneFor(status)],
        className,
      )}
    >
      {label ?? titleCase(status ?? '')}
    </span>
  );
}
