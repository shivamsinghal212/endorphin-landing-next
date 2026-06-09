'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Club, ClubCollaboration } from '@/lib/admin-api';
import {
  describeError,
  useCreateCollaboration,
  useDeleteCollaboration,
  useStudioClub,
  useStudioScrapeHistory,
  useTriggerScrape,
  useUpdateCollaboration,
} from '@/lib/studio/hooks';
import { studioKeys } from '@/lib/studio/keys';
import { ManageShell } from '../_components/manage-shell';
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  TextInput,
} from '../../_components/form';
import { EmptyState } from '../../_components/ui';

type Draft = {
  brandName: string;
  role: string;
  handle: string;
  logoUrl: string;
  evidencePostUrl: string;
};

const emptyDraft: Draft = {
  brandName: '',
  role: '',
  handle: '',
  logoUrl: '',
  evidencePostUrl: '',
};

function toDraft(c: ClubCollaboration): Draft {
  return {
    brandName: c.brandName ?? '',
    role: c.role ?? '',
    handle: c.handle ?? '',
    logoUrl: c.logoUrl ?? '',
    evidencePostUrl: c.evidencePostUrl ?? '',
  };
}

function draftToPayload(d: Draft) {
  return {
    brandName: d.brandName.trim(),
    role: d.role.trim() || null,
    handle: d.handle.trim() || null,
    logoUrl: d.logoUrl.trim() || null,
    evidencePostUrl: d.evidencePostUrl.trim() || null,
  };
}

export function CollaborationsContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const clubQ = useStudioClub(slug);
  const club = clubQ.data ?? initialClub;
  const collaborations = club.collaborations ?? [];

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="Brand & Instagram"
    >
      <SyncCard slug={slug} hasInstagram={!!club.instagramUrl} />

      <SectionCard
        title="Brand partners"
        description="Sponsors and collaborators shown on your public page under “Partners”."
      >
        {collaborations.length === 0 ? (
          <EmptyState
            title="No partners yet"
            message="Add a brand below, or sync from Instagram to pull them in automatically."
          />
        ) : (
          <div className="space-y-3">
            {collaborations.map((c) => (
              <CollaborationRow key={c.id} slug={slug} collab={c} />
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-jet/5">
          <AddCollaboration slug={slug} />
        </div>
      </SectionCard>
    </ManageShell>
  );
}

// ─── Sync from Instagram ──────────────────────────────────────────────────

function SyncCard({ slug, hasInstagram }: { slug: string; hasInstagram: boolean }) {
  const qc = useQueryClient();
  const triggerMut = useTriggerScrape(slug);
  const [syncing, setSyncing] = useState(false);
  const historyQ = useStudioScrapeHistory(slug, syncing);

  const latest = historyQ.data?.runs?.[0];
  const wasPending = useRef(false);

  // When a run finishes, pull the fresh collaborations/events into the club
  // query and stop polling.
  useEffect(() => {
    const pending = latest?.status === 'pending';
    // Resume polling if a run is already in flight when the page loads.
    if (pending && !syncing) setSyncing(true);
    if (wasPending.current && !pending) {
      qc.invalidateQueries({ queryKey: studioKeys.club(slug) });
      setSyncing(false);
      if (latest?.status === 'failed') {
        toast.error('Instagram sync failed', {
          description: latest.errorMessage || undefined,
        });
      } else if (latest) {
        const ev = latest.counts?.events_persisted ?? 0;
        const co = latest.counts?.collaborations_persisted ?? 0;
        toast.success('Instagram sync done', {
          description: `${ev} event${ev === 1 ? '' : 's'} synced · ${co} new partner${
            co === 1 ? '' : 's'
          } added`,
        });
      }
    }
    wasPending.current = pending;
  }, [latest, qc, slug]);

  const handleSync = async () => {
    try {
      await triggerMut.mutateAsync();
      setSyncing(true);
      wasPending.current = true;
      toast.message('Syncing from Instagram…', {
        description: 'Pulling new events and brand partners. This takes a minute.',
      });
    } catch (e) {
      toast.error('Could not start sync', { description: describeError(e) });
    }
  };

  const running = syncing || latest?.status === 'pending';

  return (
    <SectionCard
      title="Sync from Instagram"
      description="Pulls in new events and brand partners from your Instagram. Existing partners and your About, tags, logo and “Led by” are left exactly as you set them — sync only adds, never overwrites."
      rightSlot={
        <PrimaryButton onClick={handleSync} loading={running} disabled={!hasInstagram}>
          {running ? 'Syncing…' : 'Sync now'}
        </PrimaryButton>
      }
    >
      {!hasInstagram ? (
        <p className="text-xs text-jet/50">
          Add your Instagram link under{' '}
          <span className="font-medium">Social &amp; links</span> first, then you
          can sync.
        </p>
      ) : latest ? (
        <p className="text-xs text-jet/50">
          {running
            ? 'Working on it — new events and partners will appear here shortly.'
            : `Last synced ${
                latest.finishedAt
                  ? new Date(latest.finishedAt).toLocaleString('en-IN')
                  : '—'
              } · ${latest.status}`}
        </p>
      ) : (
        <p className="text-xs text-jet/50">Never synced from here yet.</p>
      )}
    </SectionCard>
  );
}

// ─── A single editable partner row ─────────────────────────────────────────

function CollaborationRow({
  slug,
  collab,
}: {
  slug: string;
  collab: ClubCollaboration;
}) {
  const updateMut = useUpdateCollaboration(slug);
  const deleteMut = useDeleteCollaboration(slug);
  const [draft, setDraft] = useState<Draft>(() => toDraft(collab));

  // Re-sync local draft when the server row changes (e.g. after an IG sync).
  useEffect(() => {
    setDraft(toDraft(collab));
  }, [collab]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(collab));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!draft.brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }
    try {
      await updateMut.mutateAsync({ id: collab.id, body: draftToPayload(draft) });
      toast.success('Saved');
    } catch (e) {
      toast.error('Could not save', { description: describeError(e) });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${collab.brandName}?`)) return;
    try {
      await deleteMut.mutateAsync(collab.id);
      toast.success(`${collab.brandName} removed`);
    } catch (e) {
      toast.error('Could not remove', { description: describeError(e) });
    }
  };

  return (
    <div className="rounded-xl border border-jet/10 p-3 bg-jet/[0.015]">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <FieldLabel required>Brand</FieldLabel>
          <TextInput value={draft.brandName} onChange={(v) => set('brandName', v)} placeholder="e.g. Playo" />
        </div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <TextInput value={draft.role} onChange={(v) => set('role', v)} placeholder="e.g. Hydration partner" />
        </div>
        <div>
          <FieldLabel>Instagram handle</FieldLabel>
          <TextInput value={draft.handle} onChange={(v) => set('handle', v)} placeholder="@playo" />
        </div>
        <div>
          <FieldLabel>Logo URL</FieldLabel>
          <TextInput value={draft.logoUrl} onChange={(v) => set('logoUrl', v)} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel hint="optional — a post that proves the partnership">Evidence post URL</FieldLabel>
          <TextInput value={draft.evidencePostUrl} onChange={(v) => set('evidencePostUrl', v)} placeholder="https://instagram.com/p/…" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <PrimaryButton onClick={handleSave} disabled={!dirty} loading={updateMut.isPending}>
          Save
        </PrimaryButton>
        <SecondaryButton onClick={handleDelete} disabled={deleteMut.isPending} className="text-red-600 border-red-200 hover:bg-red-50">
          Remove
        </SecondaryButton>
      </div>
    </div>
  );
}

// ─── Add a new partner ──────────────────────────────────────────────────────

function AddCollaboration({ slug }: { slug: string }) {
  const createMut = useCreateCollaboration(slug);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!draft.brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }
    try {
      await createMut.mutateAsync(draftToPayload(draft));
      toast.success(`${draft.brandName.trim()} added`);
      setDraft(emptyDraft);
      setOpen(false);
    } catch (e) {
      toast.error('Could not add', { description: describeError(e) });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-medium hover:bg-jet/5"
      >
        + Add a partner
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-jet/15 p-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <FieldLabel required>Brand</FieldLabel>
          <TextInput value={draft.brandName} onChange={(v) => set('brandName', v)} placeholder="e.g. Playo" />
        </div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <TextInput value={draft.role} onChange={(v) => set('role', v)} placeholder="e.g. Hydration partner" />
        </div>
        <div>
          <FieldLabel>Instagram handle</FieldLabel>
          <TextInput value={draft.handle} onChange={(v) => set('handle', v)} placeholder="@playo" />
        </div>
        <div>
          <FieldLabel>Logo URL</FieldLabel>
          <TextInput value={draft.logoUrl} onChange={(v) => set('logoUrl', v)} placeholder="https://…" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <PrimaryButton onClick={handleAdd} loading={createMut.isPending}>
          Add partner
        </PrimaryButton>
        <SecondaryButton onClick={() => { setOpen(false); setDraft(emptyDraft); }}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}
