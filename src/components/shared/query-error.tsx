import { AlertCircle, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { errorMessage } from '@/lib/utils';

interface QueryErrorProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/** Inline error state for a failed query; schema mismatches say so explicitly instead of crashing. */
export function QueryError({ error, onRetry, title = 'Could not load data' }: QueryErrorProps) {
  const isSchema = isApiError(error) && error.kind === 'schema';
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{isSchema ? 'Unexpected response from the server' : title}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {isSchema && isApiError(error) && error.issues?.[0] && (
          <p className="font-mono text-xs">
            {error.issues[0].path.join('.') || '(root)'}: {error.issues[0].message}
          </p>
        )}
        {onRetry && (
          <Button variant="outline" size="xs" className="mt-2" onClick={onRetry}>
            <RotateCcw />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
