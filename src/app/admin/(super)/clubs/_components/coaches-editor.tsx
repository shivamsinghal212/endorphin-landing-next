'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  createClubCoach,
  updateClubCoach,
  deleteClubCoach,
  AdminApiError,
  type ClubCoach,
  type ClubCoachInput,
} from '@/lib/admin-api';
import { useAdminToken } from '@/lib/use-admin-token';
import { ImageGalleryField } from './image-upload';
import { TagsField } from './tags-field';

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
  name: string;
  designation: string;
  specialisations: string[];
  experience: string;
  instagramUrl: string;
  photos: string[];
};

const emptyDraft: Draft = {
  name: '',
  designation: '',
  specialisations: [],
  experience: '',
  instagramUrl: '',
  photos: [],
};

function fromCoach(c: ClubCoach): Draft {
  return {
    name: c.name ?? '',
    designation: c.designation ?? '',
    specialisations: c.specialisations ?? [],
    experience: c.experience ?? '',
    instagramUrl: c.instagramUrl ?? '',
    photos: c.photos ?? [],
  };
}

function toPayload(d: Draft): ClubCoachInput {
  return {
    name: d.name.trim(),
    designation: d.designation.trim() || null,
    specialisations: d.specialisations.map((s) => s.trim()).filter(Boolean),
    experience: d.experience.trim() || null,
    instagramUrl: d.instagramUrl.trim() || null,
    photos: d.photos,
  };
}

/**
 * Super-admin coach CRUD. Mutates the /clubs/{slug}/coaches endpoints directly
 * (immediate, independent of the club form's Save) and keeps a local list in
 * sync. Photos are uploaded client-side to Supabase (via ImageGalleryField);
 * the resulting public URLs ride along in the create/update body. [0] = cover,
 * the rest feed the public-page slider. Reordering persists sortOrder.
 */
export function CoachesEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: ClubCoach[];
}) {
  const token = useAdminToken();
  const [list, setList] = useState<ClubCoach[]>(
    [...initial].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!token) return;
    if (!draft.name.trim()) return toast.error('Coach name is required');
    setBusyId('new');
    try {
      const created = await createClubCoach(token, slug, {
        ...toPayload(draft),
        sortOrder: list.length,
      });
      setList((l) => [...l, created]);
      setDraft(emptyDraft);
      setAdding(false);
      toast.success(`${created.name} added`);
    } catch (e) {
      toast.error('Could not add coach', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (id: string, patch: ClubCoachInput) => {
    if (!token) return;
    setBusyId(id);
    try {
      const updated = await updateClubCoach(token, slug, id, patch);
      setList((l) => l.map((c) => (c.id === id ? updated : c)));
      toast.success('Saved');
    } catch (e) {
      toast.error('Could not save', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: ClubCoach) => {
    if (!token) return;
    if (!confirm(`Remove ${c.name}?`)) return;
    setBusyId(c.id);
    try {
      await deleteClubCoach(token, slug, c.id);
      setList((l) => l.filter((x) => x.id !== c.id));
      toast.success(`${c.name} removed`);
    } catch (e) {
      toast.error('Could not remove', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  // Swap two adjacent coaches and persist the new sortOrder of both. Optimistic
  // — we reorder locally first, then PATCH; on failure we surface a toast and
  // refetch nothing (the next save / reload reconciles).
  const move = async (i: number, dir: -1 | 1) => {
    if (!token) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    // Renumber so sortOrder always equals position — keeps it dense and stable.
    const renumbered = next.map((c, idx) => ({ ...c, sortOrder: idx }));
    setList(renumbered);
    setBusyId('reorder');
    try {
      await Promise.all([
        updateClubCoach(token, slug, renumbered[i].id, { sortOrder: renumbered[i].sortOrder }),
        updateClubCoach(token, slug, renumbered[j].id, { sortOrder: renumbered[j].sortOrder }),
      ]);
    } catch (e) {
      toast.error('Could not reorder', { description: describe(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="font-body text-sm text-jet/50">No coaches yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c, i) => (
            <CoachRow
              key={c.id}
              coach={c}
              slug={slug}
              busy={busyId === c.id || busyId === 'reorder'}
              isFirst={i === 0}
              isLast={i === list.length - 1}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              onSave={(patch) => handleSave(c.id, patch)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-lg border border-jet/15 p-3 space-y-3">
          <DraftFields slug={slug} draft={draft} setD={setD} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busyId === 'new'}
              className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50"
            >
              {busyId === 'new' ? 'Adding…' : 'Add coach'}
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
          + Add a coach
        </button>
      )}

      <p className="font-body text-xs text-jet/40">
        The first photo is the card cover; the rest feed the slider in the
        coach&apos;s profile modal. Portrait (4:5 or 9:16) images look best.
      </p>
    </div>
  );
}

// Shared field block for both the "add" draft and an existing row's editor.
function DraftFields({
  slug,
  draft,
  setD,
}: {
  slug: string;
  draft: Draft;
  setD: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          className={inputCls}
          placeholder="Coach name *"
          value={draft.name}
          onChange={(e) => setD('name', e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Designation (e.g. Zumba Instructor)"
          value={draft.designation}
          onChange={(e) => setD('designation', e.target.value)}
        />
      </div>
      <input
        className={inputCls}
        placeholder="Instagram URL"
        value={draft.instagramUrl}
        onChange={(e) => setD('instagramUrl', e.target.value)}
      />
      <TagsField
        label="Specialisations"
        value={draft.specialisations}
        onChange={(v) => setD('specialisations', v)}
      />
      <div>
        <label className="block font-body text-xs font-medium text-jet/50 mb-1">
          Experience / bio
        </label>
        <textarea
          className={`${inputCls} resize-y`}
          rows={6}
          placeholder="Long-form bio. Separate paragraphs with a blank line."
          value={draft.experience}
          onChange={(e) => setD('experience', e.target.value)}
        />
      </div>
      <ImageGalleryField
        label="Photos"
        urls={draft.photos}
        onChange={(v) => setD('photos', v)}
        folder={`clubs/${slug || 'tmp'}/coaches`}
        hint="First photo = card cover. Add multiple for the slider; reorder with ◀ ▶."
      />
    </div>
  );
}

function CoachRow({
  coach,
  slug,
  busy,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onSave,
  onDelete,
}: {
  coach: ClubCoach;
  slug: string;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (patch: ClubCoachInput) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(fromCoach(coach));
  const [open, setOpen] = useState(false);
  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((p) => ({ ...p, [k]: v }));

  const dirty =
    draft.name !== (coach.name ?? '') ||
    draft.designation !== (coach.designation ?? '') ||
    draft.experience !== (coach.experience ?? '') ||
    draft.instagramUrl !== (coach.instagramUrl ?? '') ||
    JSON.stringify(draft.specialisations) !== JSON.stringify(coach.specialisations ?? []) ||
    JSON.stringify(draft.photos) !== JSON.stringify(coach.photos ?? []);

  const cover = (coach.photos ?? [])[0] || null;

  return (
    <div className="rounded-lg border border-jet/10 bg-jet/[0.015]">
      {/* Collapsed header — tap to expand the editor. */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-12 rounded-md overflow-hidden bg-jet/10 shrink-0 flex items-center justify-center text-jet/40 text-sm font-display">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            (coach.name?.[0]?.toUpperCase() ?? '?')
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="font-body text-sm text-jet truncate">{coach.name}</p>
          {coach.designation && (
            <p className="font-body text-xs text-jet/50 truncate">{coach.designation}</p>
          )}
        </button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || busy}
            className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || busy}
            className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-body text-xs text-jet/50 hover:text-jet hover:underline"
        >
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {open && (
        <div className="border-t border-jet/10 p-3 space-y-3">
          <DraftFields slug={slug} draft={draft} setD={setD} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!draft.name.trim()) return toast.error('Coach name is required');
                onSave(toPayload(draft));
              }}
              disabled={!dirty || busy}
              className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
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
      )}
    </div>
  );
}
