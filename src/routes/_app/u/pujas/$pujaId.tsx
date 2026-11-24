import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Clock,
  Languages,
  MapPin,
  Phone,
  Star,
  UserRoundSearch,
} from 'lucide-react';
import { useState } from 'react';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton, LoadMore } from '@/features/puja/components/lists';
import { PersonAvatar } from '@/features/puja/components/person';
import { PujaImage } from '@/features/puja/components/puja-image';
import { pujaQueries } from '@/features/puja/queries';
import type { BookableAstrologer } from '@/features/puja/schemas';
import { formatMinutes, formatRupees, formatSlot } from '@/lib/format';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/u/pujas/$pujaId')({
  component: PujaDetail,
});

function PujaDetail() {
  const { pujaId } = Route.useParams();
  const puja = useQuery(pujaQueries.puja(pujaId));
  const astrologers = useInfiniteQuery(pujaQueries.astrologers(pujaId));
  const list = astrologers.data?.pages.flatMap((p) => p.items) ?? [];
  const [expanded, setExpanded] = useState(false);
  const [slide, setSlide] = useState(0);

  return (
    <NavPage>
      <PageHeader title={puja.data?.name ?? 'Pooja'} backTo="/u" />

      {puja.isPending ? (
        <div className="flex flex-col gap-3 pb-4">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex flex-col gap-3 px-4 pt-2">
            <Skeleton className="h-6 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : puja.isError ? (
        <div className="p-4">
          <QueryError error={puja.error} onRetry={() => void puja.refetch()} />
        </div>
      ) : (
        <>
          <div className="relative">
            {puja.data.images.length > 0 ? (
              <div
                className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setSlide(Math.round(el.scrollLeft / el.clientWidth));
                }}
              >
                {puja.data.images.map((src) => (
                  <div key={src} className="aspect-[16/10] w-full shrink-0 snap-center bg-muted">
                    <PujaImage src={src} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/10] w-full">
                <PujaImage />
              </div>
            )}
            {puja.data.images.length > 1 && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-1.5">
                {puja.data.images.map((src, i) => (
                  <span
                    key={src}
                    className={cn(
                      'h-1.5 rounded-full bg-card/70 transition-all duration-200',
                      i === slide ? 'w-5 bg-card' : 'w-1.5',
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <section className="relative -mt-4 flex flex-col gap-3 rounded-t-3xl bg-background px-4 pt-5 pb-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl leading-snug font-bold tracking-tight">{puja.data.name}</h2>
              <p className="shrink-0 text-xl leading-snug font-bold text-primary-strong">
                {formatRupees(puja.data.price)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <InfoChip icon={<Clock />}>{formatMinutes(puja.data.durationMinutes)}</InfoChip>
              {puja.data.languages.length > 0 && (
                <InfoChip icon={<Languages />}>{puja.data.languages.join(', ')}</InfoChip>
              )}
              {puja.data.callAllowed && <InfoChip icon={<Phone />}>Call with your astrologer</InfoChip>}
            </div>

            {puja.data.description && (
              <div className="surface p-4">
                <p className="mb-1 text-sm font-semibold">About this pooja</p>
                <p
                  className={cn(
                    'text-sm leading-relaxed whitespace-pre-line text-muted-foreground',
                    !expanded && 'line-clamp-4',
                  )}
                >
                  {puja.data.description}
                </p>
                {puja.data.description.length > 200 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 -ml-1 h-9 px-1 text-sm font-semibold text-primary-strong"
                  >
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <section id="astrologers" className="flex scroll-mt-14 flex-col gap-3 px-4 pt-4 pb-4">
        <div>
          <h3 className="text-base font-bold">Choose your astrologer</h3>
          <p className="text-[13px] text-muted-foreground">
            Verified by Sobhagya. Pick one to see free times.
          </p>
        </div>
        {astrologers.isPending ? (
          <ListSkeleton rows={3} />
        ) : astrologers.isError ? (
          <QueryError error={astrologers.error} onRetry={() => void astrologers.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={UserRoundSearch}
            title="No astrologer is free for this pooja right now"
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

function InfoChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex h-8 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-[13px] font-medium text-foreground [&_svg]:size-4 [&_svg]:text-primary-strong">
      {icon}
      {children}
    </span>
  );
}

function AstrologerCard({ pujaId, astrologer: a }: { pujaId: string; astrologer: BookableAstrologer }) {
  const rating = a.pujaRating ?? a.rating;
  const languages = a.pujaLanguages.length ? a.pujaLanguages : a.languages;
  const facts = [
    a.yearsOfExperience ? `${a.yearsOfExperience} yrs exp` : '',
    Number(a.pujasCompleted) > 0 ? `${a.pujasCompleted} poojas` : '',
    languages.join(', '),
  ].filter(Boolean);

  return (
    <Link
      to="/u/book/$pujaId/$astrologerId"
      params={{ pujaId, astrologerId: a.astrologerId }}
      className="flex flex-col gap-3 surface p-4 transition-transform duration-150 active:scale-[0.99] active:bg-muted/40"
    >
      <div className="flex gap-3">
        <PersonAvatar name={a.name} src={a.avatar} className="size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold">{a.name || 'Astrologer'}</p>
            <BadgeCheck className="size-4 shrink-0 fill-primary text-card" aria-label="Verified" />
            {rating !== null && (
              <span className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2 text-xs font-bold text-warning-text">
                <Star className="size-3.5 fill-warning text-warning" />
                {Number(rating).toFixed(1)}
              </span>
            )}
          </div>
          {a.templeOrCity && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{a.templeOrCity}</span>
            </p>
          )}
          {facts.length > 0 && (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{facts.join(' · ')}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-dashed pt-3">
        {a.nextAvailableAt ? (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-success-text">
            <CalendarClock className="size-4" />
            Next free: {formatSlot(a.nextAvailableAt)}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">See free times</p>
        )}
        <span className="flex items-center gap-0.5 text-[13px] font-semibold text-primary-strong">
          Book
          <ChevronRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
