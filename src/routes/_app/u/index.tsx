import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Clock, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { NavPage } from '@/components/layout/bottom-nav';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { Input } from '@/components/ui/input';
import { ListSkeleton, LoadMore } from '@/features/puja/components/lists';
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
      <header className="bg-gradient-to-b from-primary/20 to-background px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <p className="text-xs text-muted-foreground">Namaste{me?.name ? `, ${me.name.split(' ')[0]}` : ''}</p>
        <h1 className="text-xl font-semibold">Book a pooja</h1>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search poojas"
            className="h-10 bg-card pl-9"
            maxLength={80}
          />
        </div>
      </header>

      {categories.data && categories.data.length > 0 && (
        <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2">
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
      )}

      <section className="flex flex-col gap-3 px-4 py-2">
        {pujas.isPending ? (
          <ListSkeleton />
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
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
      )}
    >
      {image ? <img src={image} alt="" className="size-5 rounded-full object-cover" /> : null}
      {label}
    </button>
  );
}

function PujaCard({ puja }: { puja: Puja }) {
  const image = puja.images[0];
  return (
    <Link
      to="/u/pujas/$pujaId"
      params={{ pujaId: puja.id }}
      className="flex gap-3 overflow-hidden rounded-xl border bg-card p-2 transition-colors active:bg-accent"
    >
      <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {image ? (
          <img src={image} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-primary">
            <Sparkles className="size-7" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        <p className="line-clamp-2 font-medium">{puja.name}</p>
        {puja.categories.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">
            {puja.categories.map((c) => c.name).join(' · ')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {formatMinutes(puja.durationMinutes)}
          </span>
          <span className="font-semibold text-primary">{formatRupees(puja.price)}</span>
        </div>
      </div>
    </Link>
  );
}
