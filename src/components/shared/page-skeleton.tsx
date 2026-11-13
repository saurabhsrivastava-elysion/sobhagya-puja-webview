import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex h-10 items-center gap-4 border-b px-3 last:border-0">
            <Skeleton className="h-3.5 w-1/6" />
            <Skeleton className="h-3.5 w-1/4" />
            <Skeleton className="h-3.5 w-1/5" />
            <Skeleton className="h-3.5 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
