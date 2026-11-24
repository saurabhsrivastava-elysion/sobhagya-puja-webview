import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
      <div className="relative flex size-20 items-center justify-center rounded-full bg-primary-soft">
        <div className="absolute inset-2 rounded-full border border-dashed border-primary-tint" />
        <Icon className="size-8 text-primary" strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
