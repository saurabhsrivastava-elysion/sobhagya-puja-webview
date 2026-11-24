import { CloudOff, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { errorMessage } from '@/lib/utils';

interface QueryErrorProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/** Inline error state for a failed query; schema mismatches say so explicitly instead of crashing. */
export function QueryError({ error, onRetry, title = 'Could not load this' }: QueryErrorProps) {
  const isSchema = isApiError(error) && error.kind === 'schema';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 surface px-6 py-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <CloudOff className="size-6 text-danger-text" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{isSchema ? 'Unexpected response from the server' : title}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{errorMessage(error)}</p>
        {isSchema && isApiError(error) && error.issues?.[0] && (
          <p className="font-mono text-xs text-muted-foreground">
            {error.issues[0].path.join('.') || '(root)'}: {error.issues[0].message}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline-primary" onClick={onRetry}>
          <RotateCcw />
          Try again
        </Button>
      )}
    </div>
  );
}
