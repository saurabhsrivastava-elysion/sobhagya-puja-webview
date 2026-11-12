import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { isApiError } from '@/lib/api/errors';
import { errorMessage, isRecord } from '@/lib/utils';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Toast shown on success. `false` disables it; omitted uses the backend `message`. */
      successMessage?: string | false;
      /** Prefix for the error toast. */
      errorTitle?: string;
      /** Query keys invalidated after the mutation settles successfully. */
      invalidates?: readonly QueryKey[];
    };
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Retrying auth failures, backend validation errors or schema mismatches never helps.
  if (isApiError(error) && (error.status === 401 || error.status === 403 || error.kind !== 'network'))
    return false;
  return failureCount < 2;
}

export function makeQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
    mutationCache: new MutationCache({
      onSuccess: async (data, _vars, _ctx, mutation) => {
        const meta = mutation.options.meta;
        if (meta?.successMessage !== false) {
          const backendMessage =
            isRecord(data) && typeof data.message === 'string' ? data.message : undefined;
          const message = meta?.successMessage ?? backendMessage;
          if (message) toast.success(message);
        }
        if (meta?.invalidates?.length) {
          await Promise.all(meta.invalidates.map((queryKey) => client.invalidateQueries({ queryKey })));
        }
      },
      onError: (error, _vars, _ctx, mutation) => {
        if (isApiError(error) && error.status === 401) return; // the session-expired screen takes over
        const title = mutation.options.meta?.errorTitle;
        const message = errorMessage(error);
        toast.error(title ?? message, title ? { description: message } : undefined);
      },
    }),
  });
  return client;
}
