'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Coupon, OrganiserEvent } from '@/lib/organiser-api';
import {
  describeOrganiserError,
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/lib/studio/organiser-hooks';
import { ErrorState, Skeleton } from '../../_components/ui';
import { Field, Sheet, inputCls } from './_sheet';

/** Coupons, inline.
 *
 *  Unlike the other editors this isn't a single patch of the event — each
 *  coupon is its own row with its own lifecycle — so actions commit as you
 *  take them and the footer is just "Done". The old surface was read-only
 *  and pointed back at the wizard; this is the first place they can
 *  actually be created outside it.
 */
export function CouponsSheet({
  open,
  onClose,
  event,
}: {
  open: boolean;
  onClose: () => void;
  event: OrganiserEvent;
}) {
  const couponsQ = useCoupons(open ? event.id : null);
  const createMut = useCreateCoupon(event.id);
  const updateMut = useUpdateCoupon(event.id);
  const deleteMut = useDeleteCoupon(event.id);

  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expires, setExpires] = useState('');
  const [scope, setScope] = useState<string[] | null>(null);

  const tickets = (event.distanceCategories ?? []).filter((d) => d.id);
  const coupons = couponsQ.data ?? [];

  // The backend's code regex is `^[A-Z0-9]+$`, so normalise as they type
  // rather than rejecting on save.
  const onCode = (v: string) =>
    setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24));

  const pct = Number(percent);
  const codeTaken = coupons.some((c) => c.code === code);
  const canAdd =
    code.length > 0 && !codeTaken && pct >= 1 && pct <= 100;

  const reset = () => {
    setCode('');
    setPercent('');
    setMaxUses('');
    setExpires('');
    setScope(null);
  };

  const add = async () => {
    if (!canAdd) return;
    try {
      await createMut.mutateAsync({
        code,
        discountPercent: pct,
        maxUses: maxUses ? Number(maxUses) : null,
        validUntil: expires ? new Date(expires).toISOString() : null,
        appliesToDistanceIds: scope,
        status: 'active',
      });
      toast.success(`${code} created`);
      reset();
    } catch (e) {
      toast.error("Couldn't create that coupon", {
        description: describeOrganiserError(e),
      });
    }
  };

  const togglePause = async (c: Coupon) => {
    try {
      await updateMut.mutateAsync({
        couponId: c.id,
        body: { status: c.status === 'active' ? 'paused' : 'active' },
      });
    } catch (e) {
      toast.error("Couldn't change that coupon", {
        description: describeOrganiserError(e),
      });
    }
  };

  const remove = async (c: Coupon) => {
    if (c.usedCount > 0) {
      // Deleting a used code would orphan the discount on existing
      // registrations — pause it instead so the history stays intact.
      toast.error(`${c.code} has already been used`, {
        description: 'Pause it instead — deleting would break past orders.',
      });
      return;
    }
    try {
      await deleteMut.mutateAsync(c.id);
      toast.success(`${c.code} deleted`);
    } catch (e) {
      toast.error("Couldn't delete that coupon", {
        description: describeOrganiserError(e),
      });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Optional"
      title="Codes people type at"
      accent="checkout."
      intro="A percentage off, optionally capped by uses, an expiry, or which tickets it applies to."
      labelledBy="coupons-sheet-title"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
        >
          Done
        </button>
      }
    >
      {couponsQ.isError ? (
        <ErrorState
          title="Couldn't load coupons"
          message={describeOrganiserError(couponsQ.error)}
          onRetry={() => couponsQ.refetch()}
        />
      ) : couponsQ.isLoading ? (
        <Skeleton className="h-16" />
      ) : coupons.length === 0 ? (
        <p className="text-[13px] text-jet/45 leading-relaxed">
          No codes yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-jet/10 px-3.5 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-mono tracking-wide">
                  {c.code}
                </p>
                <p className="text-[11px] text-jet/45">
                  {c.discountPercent}% off ·{' '}
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ''} used
                  {c.status === 'paused' ? ' · paused' : ''}
                  {c.status === 'expired' ? ' · expired' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePause(c)}
                disabled={updateMut.isPending || c.status === 'expired'}
                className="text-[11px] text-jet/55 border-b border-jet/20 pb-px hover:text-jet disabled:opacity-40"
              >
                {c.status === 'active' ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                aria-label={`Delete ${c.code}`}
                title={
                  c.usedCount > 0 ? 'Already used — pause it instead' : 'Delete'
                }
                onClick={() => remove(c)}
                disabled={deleteMut.isPending}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-jet/35 hover:text-signal hover:bg-signal/5 disabled:opacity-40 transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-jet/[0.07] pt-4 flex flex-col gap-3">
        <p className="text-[11px] uppercase tracking-wider text-jet/50">
          Add a code
        </p>

        <div className="grid grid-cols-[1fr_84px] gap-2">
          <Field
            label="Code"
            htmlFor="cp-code"
            error={codeTaken ? 'That code already exists.' : null}
          >
            <input
              id="cp-code"
              value={code}
              onChange={(e) => onCode(e.target.value)}
              placeholder="EARLYBIRD"
              className={`${inputCls(codeTaken)} font-mono tracking-wide`}
            />
          </Field>
          <Field label="% off" htmlFor="cp-pct">
            <input
              id="cp-pct"
              inputMode="numeric"
              value={percent}
              onChange={(e) =>
                setPercent(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))
              }
              placeholder="20"
              className={inputCls(!!percent && (pct < 1 || pct > 100))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Max uses" htmlFor="cp-max" hint="Blank = unlimited">
            <input
              id="cp-max"
              inputMode="numeric"
              value={maxUses}
              onChange={(e) =>
                setMaxUses(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="∞"
              className={inputCls()}
            />
          </Field>
          <Field label="Expires" htmlFor="cp-exp" hint="Blank = never">
            <input
              id="cp-exp"
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className={inputCls()}
            />
          </Field>
        </div>

        {tickets.length > 1 && (
          <Field label="Applies to">
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={scope === null}
                onClick={() => setScope(null)}
                label="All tickets"
              />
              {tickets.map((t) => (
                <Chip
                  key={t.id}
                  active={!!scope?.includes(t.id!)}
                  onClick={() =>
                    setScope((cur) => {
                      const next = new Set(cur ?? []);
                      if (next.has(t.id!)) next.delete(t.id!);
                      else next.add(t.id!);
                      return next.size ? [...next] : null;
                    })
                  }
                  label={t.categoryName}
                />
              ))}
            </div>
          </Field>
        )}

        <button
          type="button"
          onClick={add}
          disabled={!canAdd || createMut.isPending}
          className="self-start px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createMut.isPending ? 'Adding…' : 'Add coupon'}
        </button>
      </div>
    </Sheet>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
        active
          ? 'bg-jet text-bone'
          : 'border border-jet/15 text-jet/60 hover:border-jet/35'
      }`}
    >
      {label}
    </button>
  );
}
