import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Where "back" goes when there is no history (the page was opened directly). */
  backTo?: string;
  actions?: ReactNode;
  /** Shown before the title (e.g. an avatar in the chat header). */
  leading?: ReactNode;
  className?: string;
}

/**
 * Sticky page header, a fixed 56px tall so sticky bars below it can sit at `top-14`.
 * No top safe-area padding: the Sobhagya app draws its own status bar and header above the WebView,
 * so the content starts right at the top of the WebView.
 */
export function PageHeader({ title, subtitle, backTo, actions, leading, className }: PageHeaderProps) {
  const router = useRouter();
  // canGoBack() counts only pages opened inside this webview. window.history.length also counts what
  // the WebView loaded before (e.g. the activation link), so a page opened straight from a
  // notification would "go back" out of the app's pages instead of to backTo.
  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else if (backTo) void router.navigate({ to: backTo, replace: true });
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/95 px-4 backdrop-blur',
        backTo && 'pl-1',
        className,
      )}
    >
      {backTo && (
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back" className="shrink-0">
          <ChevronLeft className="size-6" />
        </Button>
      )}
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-[13px] leading-snug text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
