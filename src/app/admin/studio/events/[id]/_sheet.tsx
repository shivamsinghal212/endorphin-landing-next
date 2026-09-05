'use client';

import { useEffect } from 'react';

/** Freeze the page behind an overlay.
 *
 *  Without this the wheel goes straight through to the document, so the
 *  page creeps around underneath while you're reading a sheet. Restores the
 *  previous inline values rather than clearing, so nested or
 *  quickly-swapped overlays can't leave the body stuck. The padding
 *  compensates for the vanishing scrollbar, which otherwise shifts the
 *  whole layout sideways as the lock engages.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [active]);
}

/** The studio's modal shell.
 *
 *  Every editor on the event page uses this so they share one dismissal
 *  contract — scrim click, Escape, and a disabled state while saving — and
 *  one set of dimensions. Extracted once there were three of them.
 */
export function Sheet({
  open,
  onClose,
  eyebrow,
  title,
  accent,
  intro,
  busy,
  footer,
  children,
  labelledBy = 'sheet-title',
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  /** Leading part of the Fraunces headline. */
  title: string;
  /** Trailing part, rendered in signal red — the house headline pattern. */
  accent?: string;
  intro?: string;
  /** Blocks dismissal while a save is in flight. */
  busy?: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, busy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-jet/70 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-2xl shadow-2xl">
        {/* overscroll-contain stops the scroll chaining onward to the page
            once this region hits its top or bottom. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-6 pt-6 pb-4">
          {eyebrow && (
            <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2">
              {eyebrow}
            </p>
          )}
          <h2
            id={labelledBy}
            className="text-[26px] md:text-[28px] italic font-bold leading-[1.05] tracking-tight"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            {title}
            {accent && <span className="text-signal"> {accent}</span>}
          </h2>
          {intro && (
            <p className="text-[13px] text-jet/55 leading-relaxed mt-2">
              {intro}
            </p>
          )}
          </div>

          <div className="px-6 pb-5 flex flex-col gap-4">{children}</div>
        </div>

        {/* Pinned: the panel scrolls, this bar does not, so the
            actions are never below the fold. */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2.5 px-6 py-4 border-t border-jet/[0.08] bg-white">
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Cancel + save pair, so every sheet's footer behaves identically. */
export function SheetActions({
  onCancel,
  onSave,
  saving,
  saveLabel = 'Save',
  disabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </>
  );
}

// ── shared field primitives ────────────────────────────────────────────────

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1"
      >
        {label}
        {required && <span className="text-signal"> ·</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] text-signal mt-1">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-jet/40 mt-1 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputCls = (invalid?: boolean) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm bg-white outline-none ${
    invalid
      ? 'border-signal focus:border-signal'
      : 'border-jet/10 focus:border-jet'
  }`;
