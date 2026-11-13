import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Where "back" goes when there is no history (the page was opened directly). */
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else if (backTo) void router.navigate({ to: backTo });
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
      {backTo && (
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ChevronLeft className="size-5" />
        </Button>
      )}
      <div className="min-w-0 flex-1 py-2">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
