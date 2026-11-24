import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Clock, Flower2, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { NavPage } from '@/components/layout/bottom-nav';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadMore } from '@/features/puja/components/lists';
import { PujaImage } from '@/features/puja/components/puja-image';
import { useMe } from '@/features/puja/hooks';
import { pujaQueries } from '@/features/puja/queries';
import type { Puja } from '@/features/puja/schemas';
import { formatMinutes, formatRupees } from '@/lib/format';
import { cn } from '@/lib/utils';

const search = z.object({
  category: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional()
    .catch(undefined),
  q: z.string().max(80).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/u/')({
  validateSearch: search,
  component: UserHome,
});

function UserHome() {
  const { category = '', q = '' } = Route.useSearch();
  const navigate = useNavigate({ from: '/u/' });
  const me = useMe().data;
  const categories = useQuery(pujaQueries.categories());
  const pujas = useInfiniteQuery(pujaQueries.pujaList(category, q));

  // Typing updates the URL after a pause, so the list query does not fire per keystroke.
  const [text, setText] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q)
        void navigate({ search: (s) => ({ ...s, q: text.trim() || undefined }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text, q, navigate]);

  const items = pujas.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <NavPage>
      {/* No top padding: the app's own header sits right above the WebView. */}
      <header className="px-4 pt-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
          <Flower2 className="size-4" />
          Namaste{me?.name ? `, ${me.name.split(' ')[0]}` : ''}
        </p>
        <h1 className="mt-0.5 text-[22px] leading-tight font-bold tracking-tight">Book a pooja</h1>
        <p className="text-[13px] text-muted-foreground">Choose a pooja, then a astrologer and a time</p>
      </header>

      <div className="sticky top-0 z-20 bg-background/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search poojas"
            className="h-12 rounded-xl border-transparent bg-muted pr-11 pl-11 focus-visible:bg-card"
            maxLength={80}
            enterKeyHint="search"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-background"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {categories.isPending ? (
        <div className="flex gap-2 overflow-hidden px-4 py-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      ) : categories.data && categories.data.length > 0 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
          <CategoryChip
            active={!category}
            label="All"
            onClick={() => void navigate({ search: (s) => ({ ...s, category: undefined }) })}
          />
          {categories.data.map((c) => (
            <CategoryChip
              key={c.id}
              active={category === c.id}
              label={c.name}
              image={c.image}
              onClick={() => void navigate({ search: (s) => ({ ...s, category: c.id }) })}
            />
          ))}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 px-4 pt-2 pb-4">
        {pujas.isPending ? (
          <PujaCardSkeleton />
        ) : pujas.isError ? (
          <QueryError error={pujas.error} onRetry={() => void pujas.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={q ? 'No pooja matches your search' : 'No poojas here yet'}
            description="Try another category or search."
          />
        ) : (
          <>
            {items.map((puja) => (
              <PujaCard key={puja.id} puja={puja} />
            ))}
            <LoadMore {...pujas} />
          </>
        )}
      </section>
    </NavPage>
  );
}

function CategoryChip({
  active,
  label,
  image,
  onClick,
}: {
  active: boolean;
  label: string;
  image?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors duration-200',
        image && 'pl-1.5',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_2px_8px_rgb(255_152_0/0.3)]'
          : 'border-border bg-card text-foreground active:bg-muted',
      )}
    >
      {image ? <img src={image} alt="" className="size-7 rounded-full bg-muted object-cover" /> : null}
      <span className="max-w-36 truncate">{label}</span>
    </button>
  );
}

function PujaCard({ puja }: { puja: Puja }) {
  const image = puja.images[0];
  return (
    <Link
      to="/u/pujas/$pujaId"
      params={{ pujaId: puja.id }}
      className="group overflow-hidden surface transition-transform duration-150 active:scale-[0.99]"
    >
      <div className="relative aspect-[2/1] overflow-hidden bg-primary-soft">
        <PujaImage src={image} />
        <span className="absolute top-3 left-3 flex h-7 items-center gap-1 rounded-full bg-card/95 px-2.5 text-xs font-semibold shadow-card backdrop-blur">
          <Clock className="size-3.5 text-primary" />
          {formatMinutes(puja.durationMinutes)}
        </span>
      </div>
      <div className="flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base leading-snug font-semibold">{puja.name}</p>
          {puja.categories.length > 0 && (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {puja.categories.map((c) => c.name).join(' · ')}
            </p>
          )}
          <p className="mt-2 text-lg leading-none font-bold text-primary-strong">
            {formatRupees(puja.price)}
          </p>
        </div>
        <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground">
          Book
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function PujaCardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden surface">
          <Skeleton className="aspect-[2/1] w-full rounded-none" />
          <div className="flex items-end gap-3 p-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-1 h-5 w-16" />
            </div>
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
