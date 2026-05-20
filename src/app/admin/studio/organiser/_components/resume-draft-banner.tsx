'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ORGANISER_EVENT_DRAFT_KEY as DRAFT_KEY } from '@/lib/organiser-api';

type DraftShape = {
  title?: string | null;
  currentStepLabel?: string | null;
  updatedAt?: string | null;
};

function readDraft(): DraftShape | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'currentStepLabel' in parsed &&
      'updatedAt' in parsed
    ) {
      const d = parsed as DraftShape;
      if (typeof d.currentStepLabel === 'string' && typeof d.updatedAt === 'string') {
        return d;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function relativeMinutes(updatedAt: string): string {
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return 'just now';
  const diff = Date.now() - t;
  const m = Math.max(0, Math.round(diff / 60_000));
  if (m < 1) return 'moments ago';
  if (m === 1) return '1 min ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h === 1) return '1 hr ago';
  if (h < 24) return `${h} hrs ago`;
  const d = Math.round(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

export function ResumeDraftBanner() {
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setDraft(readDraft());
    // React to other tabs clearing/saving the draft so the banner stays
    // honest without a full reload.
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY) setDraft(readDraft());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!hydrated || !draft) return null;

  const onDiscard = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraft(null);
  };

  const titleLabel = draft.title?.trim() ? `"${draft.title}"` : 'a new event';

  return (
    <div className="mb-4 rounded-2xl border border-jet/15 bg-jet text-bone p-4 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-lg bg-bone/10 grid place-items-center text-base shrink-0">
        ↻
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          You left off on <span className="font-bold">{titleLabel}</span>
        </p>
        <p className="text-[11px] text-bone/60">
          {draft.currentStepLabel}
          {draft.updatedAt ? ` · auto-saved ${relativeMinutes(draft.updatedAt)}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        className="px-3 py-1.5 rounded-lg border border-bone/25 text-xs hover:bg-bone/10"
      >
        Discard
      </button>
      <Link
        href="/admin/studio/organiser/events/new"
        className="px-3 py-1.5 rounded-lg bg-bone text-jet text-xs font-bold hover:bg-bone/90"
      >
        Resume →
      </Link>
    </div>
  );
}
