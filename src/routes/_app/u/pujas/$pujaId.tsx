import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarClock, Clock, Languages, Phone, Star, UserRoundSearch } from 'lucide-react';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton, LoadMore } from '@/features/puja/components/lists';
import { PersonAvatar } from '@/features/puja/components/person';
import { pujaQueries } from '@/features/puja/queries';
import type { BookableAstrologer } from '@/features/puja/schemas';
import { formatMinutes, formatRupees, formatSlot } from '@/lib/format';

export const Route = createFileRoute('/_app/u/pujas/$pujaId')({
  component: PujaDetail,
});

function PujaDetail() {
  const { pujaId } = Route.useParams();
  const puja = useQuery(pujaQueries.puja(pujaId));
  const astrologers = useInfiniteQuery(pujaQueries.astrologers(pujaId));
  const list = astrologers.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <NavPage>
      <PageHeader title={puja.data?.name ?? 'Puja'} backTo="/u" />

      {puja.isPending ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : puja.isError ? (
        <div className="p-4">
          <QueryError error={puja.error} onRetry={() => void puja.refetch()} />
        </div>
      ) : (
        <>
          {puja.data.images.length > 0 && (
            <div className="flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-4 pt-4">
              {puja.data.images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-video w-[85%] shrink-0 snap-center rounded-xl object-cover first:w-full only:w-full"
                />
              ))}
            </div>
          )}
          <section className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{puja.data.name}</h2>
              <span className="text-lg font-semibold text-primary">{formatRupees(puja.data.price)}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formatMinutes(puja.data.durationMinutes)}
              </span>
              {puja.data.languages.length > 0 && (
                <span className="flex items-center gap-1">
                  <Languages className="size-3.5" />
                  {puja.data.languages.join(', ')}
                </span>
              )}
              {puja.data.callAllowed && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  Call with your astrologer
                </span>
              )}
            </div>
            {puja.data.description && (
              <p className="text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">
                {puja.data.description}
              </p>
            )}
          </section>
        </>
      )}

      <section className="flex flex-col gap-3 px-4 pb-4">
        <h3 className="font-semibold">Choose your astrologer</h3>
        {astrologers.isPending ? (
          <ListSkeleton rows={3} />
        ) : astrologers.isError ? (
          <QueryError error={astrologers.error} onRetry={() => void astrologers.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={UserRoundSearch}
            title="No astrologer is free for this puja right now"
            description="Please check again later."
          />
        ) : (
          <>
            {list.map((a) => (
              <AstrologerCard key={a.astrologerId} pujaId={pujaId} astrologer={a} />
            ))}
            <LoadMore {...astrologers} />
          </>
        )}
      </section>
    </NavPage>
  );
}

function AstrologerCard({ pujaId, astrologer: a }: { pujaId: string; astrologer: BookableAstrologer }) {
  const rating = a.pujaRating ?? a.rating;
  const languages = a.pujaLanguages.length ? a.pujaLanguages : a.languages;
  return (
    <Link
      to="/u/book/$pujaId/$astrologerId"
      params={{ pujaId, astrologerId: a.astrologerId }}
      className="flex gap-3 rounded-xl border bg-card p-3 transition-colors active:bg-accent"
    >
      <PersonAvatar name={a.name} src={a.avatar} className="size-14" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{a.name || 'Astrologer'}</p>
          {rating !== null && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium">
              <Star className="size-3.5 fill-warning text-warning" />
              {Number(rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[
            a.templeOrCity,
            a.yearsOfExperience ? `${a.yearsOfExperience} yrs exp` : '',
            Number(a.pujasCompleted) > 0 ? `${a.pujasCompleted} pujas done` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {languages.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">{languages.join(', ')}</p>
        )}
        {a.nextAvailableAt && (
          <p className="mt-1 flex items-center gap-1 text-xs text-success-text">
            <CalendarClock className="size-3.5" />
            Next free: {formatSlot(a.nextAvailableAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
