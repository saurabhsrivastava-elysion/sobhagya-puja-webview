import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/utils';

/** Error boundary for a page: the shell stays, the page shows the error and a retry. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border bg-card p-10 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <div>
        <h2 className="font-semibold">This page failed to load</h2>
        <p className="mt-1 max-w-md text-muted-foreground">
          {errorMessage(error, 'An unexpected error occurred.')}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          reset();
          void router.invalidate();
        }}
      >
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}
