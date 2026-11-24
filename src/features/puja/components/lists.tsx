import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadMoreProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

export function LoadMore({ hasNextPage, isFetchingNextPage, fetchNextPage }: LoadMoreProps) {
  if (!hasNextPage) return null;
  return (
    <div className="flex justify-center py-2">
      <Button variant="soft" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
        {isFetchingNextPage && <Loader2 className="animate-spin" />}
        Load more
      </Button>
    </div>
  );
}

/** Placeholder rows shaped like the real cards: square image or round avatar, title, two lines. */
export function ListSkeleton({ rows = 4, media = 'avatar' }: { rows?: number; media?: 'avatar' | 'image' }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3 surface p-3">
          {media === 'image' ? (
            <Skeleton className="size-24 shrink-0 rounded-xl" />
          ) : (
            <Skeleton className="size-12 shrink-0 rounded-full" />
          )}
          <div className="flex flex-1 flex-col gap-2.5 py-1">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
