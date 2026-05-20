'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePreviewCoupon, describeRunnerError } from '@/lib/runner-hooks';
import type { CouponPreviewResponse } from '@/lib/runner-api';

export interface AppliedCoupon {
  code: string;
  preview: CouponPreviewResponse;
}

export function CouponInput({
  eventId,
  distanceCategoryId,
  applied,
  onApplied,
  onCleared,
  variant = 'card',
}: {
  eventId: string;
  distanceCategoryId: string | null;
  applied: AppliedCoupon | null;
  onApplied: (a: AppliedCoupon) => void;
  onCleared: () => void;
  /** `'card'` (default) renders the standalone white card. `'embedded'`
   *  renders a minimal dark inline form, suitable for placing inside the
   *  Order Summary box. */
  variant?: 'card' | 'embedded';
}) {
  const [code, setCode] = useState(applied?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<boolean>(!!applied);
  const preview = usePreviewCoupon();

  const handleApply = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter a coupon code.');
      return;
    }
    if (!distanceCategoryId) {
      setError('Pick a distance first.');
      return;
    }
    try {
      const res = await preview.mutateAsync({
        eventId,
        distanceCategoryId,
        code: trimmed,
      });
      if (!res.valid) {
        setError(res.error || 'Coupon is not valid for this distance.');
        return;
      }
      onApplied({ code: res.code || trimmed, preview: res });
      toast.success('Coupon applied');
    } catch (e) {
      setError(describeRunnerError(e));
    }
  };

  const handleClear = () => {
    setCode('');
    setError(null);
    setOpen(false);
    onCleared();
  };

  // ── Embedded (dark, inline inside OrderSummary) ───────────────────────
  if (variant === 'embedded') {
    if (applied) {
      return (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-bone tracking-wider">
              {applied.code}
            </p>
            {applied.preview.discountPercent != null && (
              <p className="text-[11px] text-bone/60">
                {applied.preview.discountPercent}% off applied
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-bone/70 hover:text-bone underline whitespace-nowrap"
          >
            Remove
          </button>
        </div>
      );
    }
    if (!open) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full text-left text-xs text-bone/60 hover:text-bone underline-offset-2 hover:underline"
        >
          + Add coupon code
        </button>
      );
    }
    return (
      <div className="mt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="COUPON CODE"
            autoFocus
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bone/5 border border-bone/15 text-sm text-bone placeholder-bone/30 uppercase tracking-wider focus:border-bone/40 outline-none"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={preview.isPending}
            className="px-3 py-2 rounded-lg bg-bone text-jet text-sm font-medium hover:bg-white disabled:opacity-50"
          >
            {preview.isPending ? '…' : 'Apply'}
          </button>
        </div>
        {error && (
          <p className="text-[11px] text-signal mt-1.5" role="alert">
            {error}
          </p>
        )}
        {!error && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1.5 text-[11px] text-bone/50 hover:text-bone/80"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // ── Default card variant (used by anywhere that still wants a card) ───
  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="mb-3">
        <p className="font-display uppercase text-sm font-bold text-jet">
          Coupon code
        </p>
        <p className="text-xs text-jet/60 mt-0.5">
          Got one? Apply it before paying.
        </p>
      </div>
      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-signal/30 bg-signal/5 p-3">
          <div>
            <p className="text-sm font-medium text-jet">
              {applied.code} applied
            </p>
            {applied.preview.discountPercent != null && (
              <p className="text-xs text-jet/70">
                {applied.preview.discountPercent}% off
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg border border-jet/15 text-xs text-jet hover:bg-jet/5"
          >
            Remove
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENDORFIN10"
              className="flex-1 px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet uppercase tracking-wider focus:border-jet outline-none"
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={preview.isPending}
              className="px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preview.isPending ? 'Checking…' : 'Apply'}
            </button>
          </div>
          {error && (
            <p className="text-xs text-signal mt-2" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
