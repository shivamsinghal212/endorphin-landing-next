'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DistanceCategoryIn } from '@/lib/organiser-api';
import { INCLUSION_OPTIONS, patchDraft, type WizardDraft } from '../wizard-state';

export function StepDistances({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (next: WizardDraft) => void;
}) {
  const rows = draft.distanceCategories;

  const setRows = (next: DistanceCategoryIn[]) =>
    onChange(patchDraft(draft, { distanceCategories: next }));

  const update = (i: number, patch: Partial<DistanceCategoryIn>) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const add = () =>
    setRows([
      ...rows,
      {
        categoryName: '',
        price: 0,
        currency: 'INR',
        inclusions: [],
        maxParticipants: null,
        isActive: true,
      },
    ]);

  const priceSummary = (() => {
    const prices = rows.map((r) => r.price).filter((p) => Number.isFinite(p));
    if (!prices.length) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `${rows.length} distance${rows.length === 1 ? '' : 's'} · ₹${min}`;
    return `${rows.length} distances · ₹${min}–₹${max}`;
  })();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">
          Distances &amp; pricing
        </h1>
        <p className="text-sm text-jet/60">
          A virtual race usually sells 3–5 distances. Each one prices and caps
          independently. At least one is required.
        </p>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-jet/[0.03] text-[10px] uppercase tracking-wider text-jet/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Name</th>
              <th className="text-left px-4 py-2.5 font-medium">Distance</th>
              <th className="text-left px-4 py-2.5 font-medium">Price</th>
              <th className="text-left px-4 py-2.5 font-medium">Cap</th>
              <th className="text-left px-4 py-2.5 font-medium">Inclusions</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-jet/5">
            {rows.map((row, i) => (
              <DistanceRow
                key={row.id ?? `new-${i}`}
                row={row}
                onChange={(p) => update(i, p)}
                onRemove={() => remove(i)}
              />
            ))}
            <tr className="bg-jet/[0.02]">
              <td colSpan={6} className="px-4 py-3">
                <button
                  type="button"
                  onClick={add}
                  className="text-sm text-jet/60 hover:text-jet inline-flex items-center gap-2"
                >
                  ＋ Add distance
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[12px] text-jet/55">
        <p>Capacity blank = unlimited.</p>
        {priceSummary && <p className="text-jet/70">{priceSummary}</p>}
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl bg-signal/5 border border-signal/30 px-3 py-2 text-[12px] text-signal">
          ⚠ Add at least one distance before continuing.
        </div>
      )}
    </div>
  );
}

function DistanceRow({
  row,
  onChange,
  onRemove,
}: {
  row: DistanceCategoryIn;
  onChange: (patch: Partial<DistanceCategoryIn>) => void;
  onRemove: () => void;
}) {
  const inclusions = row.inclusions ?? [];

  // Distance-km is encoded into `fullTitle` (e.g. "10K · 10 km") in lieu of a
  // dedicated backend column — the row UI still surfaces it as a discrete
  // input so organisers can sort/edit independently. We pull it back out of
  // `fullTitle` on render and write it back on edit.
  const distanceKm = parseDistanceKm(row.fullTitle ?? '');

  const setDistanceKm = (km: string) => {
    const n = Number(km);
    if (km === '') {
      onChange({ fullTitle: row.categoryName || null });
      return;
    }
    if (Number.isNaN(n)) return;
    const label = `${row.categoryName || ''} · ${n} km`.trim();
    onChange({ fullTitle: label });
  };

  return (
    <tr>
      <td className="px-4 py-3">
        <input
          value={row.categoryName}
          onChange={(e) =>
            onChange({
              categoryName: e.target.value,
              // Keep fullTitle in sync if it was tracking the name.
              fullTitle: row.fullTitle?.startsWith(row.categoryName)
                ? row.fullTitle.replace(row.categoryName, e.target.value)
                : row.fullTitle,
            })
          }
          placeholder="10K"
          className="w-24 px-2 py-1.5 rounded-lg border border-jet/10 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            inputMode="decimal"
            placeholder="10"
            className="w-16 px-2 py-1.5 rounded-lg border border-jet/10 text-sm"
          />
          <span className="text-xs text-jet/50">km</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-jet/50">₹</span>
          <input
            value={row.price === 0 ? '' : String(row.price)}
            onChange={(e) => {
              const v = e.target.value;
              const n = v === '' ? 0 : Number(v);
              if (Number.isNaN(n) || n < 0) return;
              onChange({ price: n });
            }}
            inputMode="numeric"
            placeholder="399"
            className="w-24 px-2 py-1.5 rounded-lg border border-jet/10 text-sm"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          value={row.maxParticipants ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return onChange({ maxParticipants: null });
            const n = Number(v);
            if (Number.isNaN(n) || n < 1) return;
            onChange({ maxParticipants: n });
          }}
          inputMode="numeric"
          placeholder="—"
          className="w-24 px-2 py-1.5 rounded-lg border border-jet/10 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 items-center">
          {inclusions.map((inc) => (
            <span
              key={inc}
              className="text-[10px] px-2 py-0.5 rounded-full bg-jet text-bone inline-flex items-center gap-1"
            >
              {inc}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    inclusions: inclusions.filter((x) => x !== inc),
                  })
                }
                className="text-bone/70 hover:text-bone"
                aria-label={`Remove ${inc}`}
              >
                ✕
              </button>
            </span>
          ))}
          <InclusionsPicker
            current={inclusions}
            onPick={(opt) => onChange({ inclusions: [...inclusions, opt] })}
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onRemove}
          className="text-jet/40 hover:text-signal text-sm"
          aria-label="Remove distance"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function parseDistanceKm(fullTitle: string): string {
  // Match a trailing "12 km" or "12.5 km" in either order.
  const m = fullTitle.match(/(\d+(?:\.\d+)?)\s*km/i);
  return m ? m[1] : '';
}

/**
 * Inclusions chip picker. The dropdown is rendered with `position: fixed`
 * coordinates derived from the trigger's bounding rect — necessary because
 * the parent `<table>` lives inside an `overflow-x-auto` wrapper that clips
 * any normally-positioned floater. Repositions on scroll/resize and closes
 * on outside click / Escape.
 */
function InclusionsPicker({
  current,
  onPick,
}: {
  current: string[];
  onPick: (opt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Position the menu directly under the trigger using viewport coords so
  // it escapes the `overflow-x-auto` scroll container above us.
  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, left: rect.left });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !menuRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const available = INCLUSION_OPTIONS.filter((o) => !current.includes(o));
  const exhausted = available.length === 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={exhausted}
        className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-jet/30 text-jet/50 hover:border-jet hover:text-jet disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exhausted ? 'All added' : '+ Add'}
      </button>
      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className="z-50 bg-white border border-jet/10 rounded-xl p-2 shadow-lg flex flex-wrap gap-1 max-w-[260px]"
        >
          {available.map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitem"
              onClick={() => {
                onPick(opt);
                setOpen(false);
              }}
              className="text-[11px] px-2 py-1 rounded-full bg-jet/5 hover:bg-jet hover:text-bone"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
