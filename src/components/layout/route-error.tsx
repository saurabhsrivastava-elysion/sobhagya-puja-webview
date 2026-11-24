import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertTriangle, ChevronLeft, Home, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/utils';

/**
 * Error boundary for a page. Besides "Try again" it always offers a way out, so a page that keeps
 * failing (e.g. opened from a notification with a bad booking id) never traps the user:
 * "Go back" when there is a page to go back to, and "Go to home" always.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const canGoBack = router.history.canGoBack();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const leave = (go: () => void) => {
    reset();
    go();
  };
  const goBack = () => leave(() => router.history.back());
  // "/" sends the user to their own side (user or astrologer home).
  const goHome = () => leave(() => void router.navigate({ to: '/', replace: true }));

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/95 px-1 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={canGoBack ? goBack : goHome}
          aria-label={canGoBack ? 'Back' : 'Home'}
          className="shrink-0"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h1 className="truncate text-[17px] leading-tight font-bold tracking-tight">Something went wrong</h1>
      </header>

      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-danger-text" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">This page failed to load</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {errorMessage(error, 'An unexpected error occurred.')}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button
            variant="outline-primary"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            <RotateCcw />
            Try again
          </Button>
          {canGoBack && (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft />
              Go back
            </Button>
          )}
          <Button variant="ghost" onClick={goHome}>
            <Home />
            Go to home
          </Button>
        </div>
      </div>
    </div>
  );
}
