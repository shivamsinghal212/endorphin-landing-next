'use client';

import type { ReactNode } from 'react';
import type { DistanceCategory } from '@/lib/api';
import type { CouponPreviewResponse } from '@/lib/runner-api';

function fmtRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// Razorpay standard plan: 2% processing fee on the captured amount + 18% GST
// on that fee. These are account-level rates, not stored in code — update here
// if the negotiated rate changes. ponytail: display estimate only; the studio
// uses the actual fee/tax Razorpay returns at capture (corporate/intl cards
// differ from 2%).
const PROCESSING_FEE_RATE = 0.02;
const GST_RATE = 0.18;

// Decompose the captured amount into the fee components included within it
// (total is unchanged). Computed off the post-discount final paise, so coupons
// are handled automatically.
function feeBreakdown(finalPaise: number): { feePaise: number; gstPaise: number } {
  const feePaise = Math.round(finalPaise * PROCESSING_FEE_RATE);
  return { feePaise, gstPaise: Math.round(feePaise * GST_RATE) };
}

function fmtRupeesExact(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtRupeesFromMajor(amount: number, currency: string | null): string {
  const cur = currency || 'INR';
  if (cur === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${cur} ${amount.toLocaleString('en')}`;
}

export interface OrderSummaryData {
  distance: DistanceCategory | null;
  currency: string | null;
  coupon: CouponPreviewResponse | null;
}

/** Derive a base price (paise). Coupon preview is authoritative when present
 *  — backend has the only canonical paise figure. Falls back to picking
 *  whichever of price/discountedPrice the organiser set, multiplied by 100. */
export function deriveTotals(data: OrderSummaryData): {
  basePaise: number | null;
  discountPaise: number;
  finalPaise: number | null;
  currency: string;
} {
  const cur =
    data.coupon?.currency ?? data.distance?.currency ?? data.currency ?? 'INR';
  if (data.coupon?.valid && data.coupon.basePricePaise != null) {
    const base = data.coupon.basePricePaise;
    const disc = data.coupon.discountPaise ?? 0;
    const final = data.coupon.finalPricePaise ?? Math.max(0, base - disc);
    return { basePaise: base, discountPaise: disc, finalPaise: final, currency: cur };
  }
  const fromMajor = data.distance?.discountedPrice ?? data.distance?.price;
  if (fromMajor == null) {
    return { basePaise: null, discountPaise: 0, finalPaise: null, currency: cur };
  }
  const basePaise = Math.round(fromMajor * 100);
  return {
    basePaise,
    discountPaise: 0,
    finalPaise: basePaise,
    currency: cur,
  };
}

export function OrderSummary({
  data,
  payLabel,
  onPay,
  disabled,
  loading,
  coupon,
  error,
  termsHref,
}: {
  data: OrderSummaryData;
  payLabel?: string;
  onPay: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Event detail page URL — the terms line links "here" to it. */
  termsHref?: string;
  /** Coupon input slot — rendered inside the summary on a bone-coloured
   *  card so it visually belongs to the order, not the form column. */
  coupon?: ReactNode;
  /** Cross-cutting error (network, payment, sold-out) — sits above the
   *  Pay button. Field-level validation errors do NOT come through here;
   *  they render inline next to the offending field. */
  error?: string | null;
}) {
  const totals = deriveTotals(data);
  const baseDisplay =
    totals.basePaise != null
      ? fmtRupees(totals.basePaise)
      : data.distance?.price != null
        ? fmtRupeesFromMajor(data.distance.price, totals.currency)
        : '—';
  const finalDisplay =
    totals.finalPaise != null ? fmtRupees(totals.finalPaise) : baseDisplay;
  const payCta =
    payLabel ??
    (totals.finalPaise != null && totals.finalPaise > 0
      ? `Pay ${finalDisplay}`
      : 'Continue');

  return (
    <section className="bg-jet text-bone rounded-2xl p-5 md:p-6 sticky top-24">
      <p className="font-display uppercase text-sm font-bold mb-4">
        Order summary
      </p>
      <dl className="text-sm space-y-2">
        <div className="flex justify-between">
          <dt className="text-bone/70">Base price</dt>
          <dd className="font-medium">{baseDisplay}</dd>
        </div>
        {totals.discountPaise > 0 && (
          <div className="flex justify-between">
            <dt className="text-bone/70">
              Discount
              {data.coupon?.discountPercent != null && (
                <span className="text-bone/50"> ({data.coupon.discountPercent}%)</span>
              )}
            </dt>
            <dd className="text-emerald-300 font-medium">−{fmtRupees(totals.discountPaise)}</dd>
          </div>
        )}
        <div className="border-t border-bone/15 pt-3 mt-3 flex justify-between text-base">
          <dt className="font-display uppercase">Total</dt>
          <dd className="font-display uppercase font-bold">{finalDisplay}</dd>
        </div>
        {totals.finalPaise != null && totals.finalPaise > 0 && (
          <div className="pt-1 space-y-1 text-xs text-bone/50">
            <p className="text-bone/40">Included in your total</p>
            <div className="flex justify-between">
              <dt>Payment processing fee (2%)</dt>
              <dd>{fmtRupeesExact(feeBreakdown(totals.finalPaise).feePaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>GST on processing fee (18%)</dt>
              <dd>{fmtRupeesExact(feeBreakdown(totals.finalPaise).gstPaise)}</dd>
            </div>
          </div>
        )}
      </dl>

      {/* Coupon slot is rendered inline (embedded variant) inside the
       *  dark Order Summary, so it doesn't visually compete with the
       *  rest of the card. The CouponInput renders its own collapsed
       *  "+ Add coupon code" link → expanded input — no extra spacing
       *  needed here. */}
      {coupon}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-signal/50 bg-signal/15 px-3 py-2 text-sm text-bone flex items-start gap-2"
        >
          <span aria-hidden>⚠</span>
          <p className="leading-snug">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onPay}
        disabled={disabled || loading}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-signal text-bone text-sm font-display uppercase font-bold tracking-wider hover:bg-signal/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
        )}
        {/* `payLabel` is phase-aware (Saving profile… / Creating order… /
         *  Opening payment… / Confirming…). Use it directly instead of a
         *  hard-coded "Opening checkout…" so the runner sees which step
         *  is actually running. */}
        {payCta}
      </button>
      {termsHref && (
        <p className="mt-3 text-[11px] text-bone/50 leading-relaxed">
          By registering you agree to the terms &amp; conditions mentioned{' '}
          <a
            href={termsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-bone"
          >
            here
          </a>
          .
        </p>
      )}
    </section>
  );
}
