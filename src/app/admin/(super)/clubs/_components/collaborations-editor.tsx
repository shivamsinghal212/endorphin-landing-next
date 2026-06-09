'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  createClubCollaboration,
  updateClubCollaboration,
  deleteClubCollaboration,
  AdminApiError,
  type ClubCollaboration,
  type ClubCollaborationInput,
} from '@/lib/admin-api';
import { useAdminToken } from '@/lib/use-admin-token';

const inputCls =
  'px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors w-full';

function describe(e: unknown): string {
  if (e instanceof AdminApiError) {
    try {
      const p = JSON.parse(e.message);
      if (typeof p?.detail === 'string') return p.detail;
    } catch {}
    return e.message || `Request failed (${e.status})`;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

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

function toPayload(d: Draft): ClubCollaborationInput {
  return {
    brandName: d.brandName.trim(),
    role: d.role.trim() || null,
    handle: d.handle.trim() || null,
    logoUrl: d.logoUrl.trim() || null,
    evidencePostUrl: d.evidencePostUrl.trim() || null,
  };
}

/**
 * Super-admin collaboration CRUD. Mutates the /clubs/{slug}/collaborations
 * endpoints directly (immediate, independent of the club form's Save) and
 * keeps a local list in sync. The scraper is insert-only, so manual rows here
 * are never overwritten by a future Instagram sync.
 */
export function CollaborationsEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: ClubCollaboration[];
}) {
  const token = useAdminToken();
  const [list, setList] = useState<ClubCollaboration[]>(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!token) return;
    if (!draft.brandName.trim()) return toast.error('Brand name is required');
    setBusyId('new');
    try {
      const created = await createClubCollaboration(token, slug, toPayload(draft));
      setList((l) => [...l, created]);
      setDraft(emptyDraft);
      setAdding(false);
      toast.success(`${created.brandName} added`);
    } catch (e) {
      toast.error('Could not add', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (id: string, patch: ClubCollaborationInput) => {
    if (!token) return;
    setBusyId(id);
    try {
      const updated = await updateClubCollaboration(token, slug, id, patch);
      setList((l) => l.map((c) => (c.id === id ? updated : c)));
      toast.success('Saved');
    } catch (e) {
      toast.error('Could not save', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: ClubCollaboration) => {
    if (!token) return;
    if (!confirm(`Remove ${c.brandName}?`)) return;
    setBusyId(c.id);
    try {
      await deleteClubCollaboration(token, slug, c.id);
      setList((l) => l.filter((x) => x.id !== c.id));
      toast.success(`${c.brandName} removed`);
    } catch (e) {
      toast.error('Could not remove', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="font-body text-sm text-jet/50">No collaborations yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <CollabRow
              key={c.id}
              collab={c}
              busy={busyId === c.id}
              onSave={(patch) => handleSave(c.id, patch)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-lg border border-jet/15 p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Brand name *" value={draft.brandName} onChange={(e) => setD('brandName', e.target.value)} />
            <input className={inputCls} placeholder="Role (e.g. Hydration partner)" value={draft.role} onChange={(e) => setD('role', e.target.value)} />
            <input className={inputCls} placeholder="@handle" value={draft.handle} onChange={(e) => setD('handle', e.target.value)} />
            <input className={inputCls} placeholder="Logo URL" value={draft.logoUrl} onChange={(e) => setD('logoUrl', e.target.value)} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Evidence post URL (optional)" value={draft.evidencePostUrl} onChange={(e) => setD('evidencePostUrl', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busyId === 'new'}
              className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50"
            >
              Add partner
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(emptyDraft); }}
              className="px-3 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-medium hover:bg-jet/5"
        >
          + Add a partner
        </button>
      )}

      <p className="font-body text-xs text-jet/40">
        Manual edits are safe — the Instagram scraper only adds new partners, it
        never overwrites or deletes these.
      </p>
    </div>
  );
}

function CollabRow({
  collab,
  busy,
  onSave,
  onDelete,
}: {
  collab: ClubCollaboration;
  busy: boolean;
  onSave: (patch: ClubCollaborationInput) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    brandName: collab.brandName ?? '',
    role: collab.role ?? '',
    handle: collab.handle ?? '',
    logoUrl: collab.logoUrl ?? '',
    evidencePostUrl: collab.evidencePostUrl ?? '',
  });
  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const dirty =
    draft.brandName !== (collab.brandName ?? '') ||
    draft.role !== (collab.role ?? '') ||
    draft.handle !== (collab.handle ?? '') ||
    draft.logoUrl !== (collab.logoUrl ?? '') ||
    draft.evidencePostUrl !== (collab.evidencePostUrl ?? '');

  return (
    <div className="rounded-lg border border-jet/10 p-3 bg-jet/[0.015] space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Brand name *" value={draft.brandName} onChange={(e) => setD('brandName', e.target.value)} />
        <input className={inputCls} placeholder="Role" value={draft.role} onChange={(e) => setD('role', e.target.value)} />
        <input className={inputCls} placeholder="@handle" value={draft.handle} onChange={(e) => setD('handle', e.target.value)} />
        <input className={inputCls} placeholder="Logo URL" value={draft.logoUrl} onChange={(e) => setD('logoUrl', e.target.value)} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Evidence post URL" value={draft.evidencePostUrl} onChange={(e) => setD('evidencePostUrl', e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!draft.brandName.trim()) return toast.error('Brand name is required');
            onSave({
              brandName: draft.brandName.trim(),
              role: draft.role.trim() || null,
              handle: draft.handle.trim() || null,
              logoUrl: draft.logoUrl.trim() || null,
              evidencePostUrl: draft.evidencePostUrl.trim() || null,
            });
          }}
          disabled={!dirty || busy}
          className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
