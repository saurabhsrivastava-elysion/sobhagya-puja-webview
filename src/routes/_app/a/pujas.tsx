import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Flower2, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { NavPage } from '@/components/layout/bottom-nav';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QueryError } from '@/components/shared/query-error';
import { StatusBadge, type Tone } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ListSkeleton } from '@/features/puja/components/lists';
import { useSaveApplication } from '@/features/puja/hooks';
import { pujaQueries } from '@/features/puja/queries';
import type { CatalogueItem } from '@/features/puja/schemas';
import { formatMinutes, formatRupees } from '@/lib/format';

export const Route = createFileRoute('/_app/a/pujas')({
  component: MyPujas,
});

const APPLICATION: Record<string, { tone: Tone; label: string }> = {
  APPLIED: { tone: 'warning', label: 'Under review' },
  APPROVED: { tone: 'success', label: 'Approved' },
  PAUSED: { tone: 'neutral', label: 'Paused' },
  REJECTED: { tone: 'danger', label: 'Not approved' },
  REMOVED: { tone: 'danger', label: 'Removed' },
};

function MyPujas() {
  const catalogue = useQuery(pujaQueries.catalogue());
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const items = catalogue.data ?? [];

  return (
    <NavPage>
      <PageHeader title="My poojas" subtitle="Apply for the poojas you perform" />
      <section className="flex flex-col gap-3 p-4">
        {catalogue.isPending ? (
          <ListSkeleton />
        ) : catalogue.isError ? (
          <QueryError error={catalogue.error} onRetry={() => void catalogue.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon={Flower2} title="No poojas are open yet" />
        ) : (
          items.map((item) => {
            const app = item.application;
            const status = app ? APPLICATION[app.status] : null;
            return (
              <article key={item.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                <div className="flex gap-3">
                  {item.images[0] ? (
                    <img src={item.images[0]} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                      <Flower2 className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.name}</p>
                      {status && <StatusBadge status={app?.status} tone={status.tone} label={status.label} />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMinutes(item.durationMinutes)} · {formatRupees(item.price)}
                    </p>
                    {app && Number(app.stats?.completed) > 0 && (
                      <p className="text-xs text-muted-foreground">{app.stats?.completed} performed</p>
                    )}
                  </div>
                </div>
                {app?.adminNote && (
                  <p className="rounded-md bg-muted px-2 py-1 text-xs">Sobhagya: {app.adminNote}</p>
                )}
                {!app ? (
                  <Button size="sm" onClick={() => setEditing(item)}>
                    Apply
                  </Button>
                ) : app.status === 'APPLIED' ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(item)}>
                    Edit application
                  </Button>
                ) : null}
              </article>
            );
          })
        )}
      </section>
      <ApplicationDialog item={editing} onClose={() => setEditing(null)} />
    </NavPage>
  );
}

function ApplicationDialog({ item, onClose }: { item: CatalogueItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(o) => !o && onClose()}>
      {/* Keyed by puja, so the form starts from that puja's application each time. */}
      <DialogContent>{item && <ApplicationForm key={item.id} item={item} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function ApplicationForm({ item, onClose }: { item: CatalogueItem; onClose: () => void }) {
  const save = useSaveApplication();
  const [form, setForm] = useState(() => ({
    pujaExperience: item.application?.pujaExperience ?? '',
    languages: (item.application?.languages ?? []).join(', '),
    templeOrCity: item.application?.templeOrCity ?? '',
    about: item.application?.about ?? '',
  }));

  const submit = () => {
    save.mutate(
      {
        pujaId: item.id,
        isUpdate: Boolean(item.application),
        body: {
          pujaExperience: form.pujaExperience.trim(),
          languages: form.languages
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 20),
          templeOrCity: form.templeOrCity.trim(),
          about: form.about.trim(),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.application ? 'Edit application' : 'Apply'}</DialogTitle>
        <DialogDescription>{item.name}. Sobhagya reviews every application.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <FormField label="Your experience with this pooja">
          <Textarea
            rows={3}
            maxLength={2000}
            value={form.pujaExperience}
            onChange={(e) => setForm({ ...form, pujaExperience: e.target.value })}
          />
        </FormField>
        <FormField label="Languages (comma separated)">
          <Input
            value={form.languages}
            onChange={(e) => setForm({ ...form, languages: e.target.value })}
            placeholder="Hindi, Sanskrit"
          />
        </FormField>
        <FormField label="Temple or city">
          <Input
            maxLength={200}
            value={form.templeOrCity}
            onChange={(e) => setForm({ ...form, templeOrCity: e.target.value })}
          />
        </FormField>
        <FormField label="About you">
          <Textarea
            rows={3}
            maxLength={2000}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </FormField>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Close
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {item.application ? 'Save' : 'Apply'}
        </Button>
      </DialogFooter>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
