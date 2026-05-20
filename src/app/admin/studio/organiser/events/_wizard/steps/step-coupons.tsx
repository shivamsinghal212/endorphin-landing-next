'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Coupon, CouponCreate, CouponUpdate } from '@/lib/organiser-api';
import {
  describeOrganiserError,
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/lib/studio/organiser-hooks';
import {
  validateCouponCode,
  validateDiscountPercent,
} from '@/lib/studio/event-validators';
import { FieldLabel } from '@/app/admin/studio/_components/form';
import type { WizardDraft } from '../wizard-state';

export function StepCoupons({ draft }: { draft: WizardDraft }) {
  const eventId = draft._eventId ?? null;
  const couponsQ = useCoupons(eventId);
  const createMut = useCreateCoupon(eventId ?? '');
  const updateMut = useUpdateCoupon(eventId ?? '');
  const deleteMut = useDeleteCoupon(eventId ?? '');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  // Coupons live server-side and can only be created once the event has an
  // id. The wizard flow guarantees that after Step 1 — but on the off chance
  // the user lands here without an event id (e.g. a saved local draft) we
  // surface a friendly hold message instead of a broken UI.
  if (!eventId) {
    return (
      <div className="bg-white border border-jet/10 rounded-2xl p-8 text-center">
        <h1 className="font-display uppercase text-2xl font-bold mb-2">
          Coupons
        </h1>
        <p className="text-sm text-jet/60 max-w-sm mx-auto">
          Finish step 1 (Basics) so we can save the event — then come back here
          to add coupons.
        </p>
      </div>
    );
  }

  const coupons = couponsQ.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setEditorOpen(true);
  };

  const onSubmit = async (
    body: CouponCreate,
    coupon: Coupon | null,
  ) => {
    // Client-side uniqueness — backend also enforces, but a fast inline check
    // saves a round trip and surfaces a clearer error against the same code.
    const codeUpper = body.code.toUpperCase();
    if (
      coupons.some(
        (c) => c.code.toUpperCase() === codeUpper && c.id !== coupon?.id,
      )
    ) {
      toast.error('That code is already in use for this event');
      return;
    }
    try {
      if (coupon) {
        const patch: CouponUpdate = body;
        await updateMut.mutateAsync({ couponId: coupon.id, body: patch });
        toast.success('Coupon updated');
      } else {
        await createMut.mutateAsync(body);
        toast.success('Coupon added');
      }
      setEditorOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error('Could not save', { description: describeOrganiserError(e) });
    }
  };

  const onDelete = async (c: Coupon) => {
    if (c.usedCount > 0) return;
    if (!confirm(`Delete ${c.code}?`)) return;
    try {
      await deleteMut.mutateAsync(c.id);
      toast.success('Coupon deleted');
    } catch (e) {
      toast.error('Could not delete', { description: describeOrganiserError(e) });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">
          Discount coupons
        </h1>
        <p className="text-sm text-jet/60">
          Codes are case-insensitive and stack with nothing else. Optional —
          skip this step if you don&apos;t run promos.
        </p>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl divide-y divide-jet/5">
        {couponsQ.isLoading ? (
          <div className="p-6 text-sm text-jet/50">Loading…</div>
        ) : coupons.length === 0 ? (
          <div className="p-6 text-sm text-jet/50 text-center">
            No coupons yet. Add one below or skip this step.
          </div>
        ) : (
          coupons.map((c) => (
            <CouponRow
              key={c.id}
              coupon={c}
              distances={draft.distanceCategories}
              onEdit={() => openEdit(c)}
              onDelete={() => onDelete(c)}
            />
          ))
        )}
        <div className="p-4">
          <button
            type="button"
            onClick={openCreate}
            className="text-sm text-jet/60 hover:text-jet inline-flex items-center gap-2"
          >
            ＋ Add coupon
          </button>
        </div>
      </div>

      {editorOpen && (
        <CouponEditor
          coupon={editing}
          existingCodes={coupons
            .filter((c) => c.id !== editing?.id)
            .map((c) => c.code.toUpperCase())}
          distances={draft.distanceCategories.map((d, i) => ({
            id: d.id ?? `tmp-${i}`,
            name: d.categoryName || `Distance ${i + 1}`,
          }))}
          onCancel={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSubmit={onSubmit}
          submitting={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

function CouponRow({
  coupon,
  distances,
  onEdit,
  onDelete,
}: {
  coupon: Coupon;
  distances: WizardDraft['distanceCategories'];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const appliesTo =
    !coupon.appliesToDistanceIds || coupon.appliesToDistanceIds.length === 0
      ? 'All distances'
      : coupon.appliesToDistanceIds
          .map((id) => distances.find((d) => d.id === id)?.categoryName ?? id)
          .join(', ');

  const usedText = coupon.maxUses
    ? `${coupon.usedCount} / ${coupon.maxUses}`
    : `${coupon.usedCount} / unlimited`;

  const validUntilLabel = coupon.validUntil
    ? new Date(coupon.validUntil).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const statusClasses =
    coupon.status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : coupon.status === 'paused'
      ? 'bg-jet/10 text-jet/60'
      : 'bg-jet/[0.04] text-jet/40';

  return (
    <div
      className={`p-4 flex items-center gap-3 sm:gap-4 flex-wrap ${
        coupon.status !== 'active' ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`font-mono text-sm font-semibold tracking-wide px-3 py-1.5 rounded-lg ${
          coupon.status === 'active' ? 'bg-jet text-bone' : 'bg-jet/10 text-jet'
        }`}
      >
        {coupon.code}
      </div>
      <div className="flex-1 min-w-full sm:min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
        <Cell label="Discount" value={`${coupon.discountPercent}%`} />
        <Cell label="Used" value={usedText} />
        <Cell label="Valid until" value={validUntilLabel} />
        <Cell label="Applies to" value={appliesTo} />
      </div>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium ${statusClasses}`}
      >
        {coupon.status}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="text-jet/40 hover:text-jet text-xs px-2 py-1"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={coupon.usedCount > 0}
          title={
            coupon.usedCount > 0
              ? 'Coupon has been used — pause it instead'
              : undefined
          }
          className="text-jet/40 hover:text-signal text-xs px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-jet/40">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function CouponEditor({
  coupon,
  existingCodes,
  distances,
  onCancel,
  onSubmit,
  submitting,
}: {
  coupon: Coupon | null;
  existingCodes: string[];
  distances: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSubmit: (body: CouponCreate, coupon: Coupon | null) => Promise<void>;
  submitting: boolean;
}) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [discount, setDiscount] = useState<string>(
    coupon?.discountPercent ? String(coupon.discountPercent) : '',
  );
  const [maxUses, setMaxUses] = useState<string>(
    coupon?.maxUses ? String(coupon.maxUses) : '',
  );
  const [validUntil, setValidUntil] = useState<string>(
    coupon?.validUntil ? coupon.validUntil.slice(0, 10) : '',
  );
  const [appliesAll, setAppliesAll] = useState<boolean>(
    !coupon || !coupon.appliesToDistanceIds || coupon.appliesToDistanceIds.length === 0,
  );
  const [appliesIds, setAppliesIds] = useState<string[]>(
    coupon?.appliesToDistanceIds ?? [],
  );
  const [status, setStatus] = useState<'active' | 'paused'>(
    coupon?.status === 'paused' ? 'paused' : 'active',
  );

  const codeUpper = code.toUpperCase().trim();
  const codeCheck = validateCouponCode(codeUpper);
  const duplicate = codeUpper && existingCodes.includes(codeUpper);
  const discountNum = Number(discount);
  const discountCheck = validateDiscountPercent(discountNum);
  const canSubmit =
    !!codeUpper && codeCheck.ok && !duplicate && discountCheck.ok && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    const body: CouponCreate = {
      code: codeUpper,
      discountPercent: discountNum,
      maxUses: maxUses ? Number(maxUses) : null,
      validUntil: validUntil ? new Date(`${validUntil}T23:59:59+05:30`).toISOString() : null,
      appliesToDistanceIds: appliesAll ? null : appliesIds,
      status,
    };
    void onSubmit(body, coupon);
  };

  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-display uppercase text-sm font-bold">
          {coupon ? 'Edit coupon' : 'New coupon'}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-jet/40 hover:text-signal text-sm"
        >
          ✕ Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 md:col-span-1">
          <FieldLabel required>Code</FieldLabel>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase ${
              code && (!codeCheck.ok || duplicate)
                ? 'border-signal'
                : 'border-jet/10'
            }`}
          />
          {code && !codeCheck.ok && (
            <p className="text-[10px] text-signal mt-1">⚠ {codeCheck.error}</p>
          )}
          {duplicate && (
            <p className="text-[10px] text-signal mt-1">
              ⚠ &quot;{codeUpper}&quot; already exists for this event
            </p>
          )}
        </div>
        <div>
          <FieldLabel required>Discount %</FieldLabel>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            min={1}
            max={100}
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${
              discount && !discountCheck.ok ? 'border-signal' : 'border-jet/10'
            }`}
          />
          <p className="text-[10px] text-jet/40 mt-1">Between 1 and 100</p>
        </div>
        <div>
          <FieldLabel>Max uses</FieldLabel>
          <input
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Unlimited"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-jet/10 text-sm"
          />
        </div>
        <div>
          <FieldLabel>Valid until</FieldLabel>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-jet/10 text-sm"
          />
        </div>
      </div>

      <div className="mt-3">
        <FieldLabel>Applies to</FieldLabel>
        <div className="mt-1 flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAppliesAll(true)}
            className={`text-[11px] px-2.5 py-1 rounded-full ${
              appliesAll ? 'bg-jet text-bone' : 'border border-jet/15'
            }`}
          >
            All distances
          </button>
          {distances.map((d) => {
            const sel = !appliesAll && appliesIds.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setAppliesAll(false);
                  setAppliesIds((prev) =>
                    prev.includes(d.id)
                      ? prev.filter((x) => x !== d.id)
                      : [...prev, d.id],
                  );
                }}
                className={`text-[11px] px-2.5 py-1 rounded-full ${
                  sel ? 'bg-jet text-bone' : 'border border-jet/15'
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[12px]">
        <span className="text-jet/50">Status</span>
        <button
          type="button"
          onClick={() => setStatus('active')}
          className={`px-2.5 py-1 rounded-full text-[11px] ${
            status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'border border-jet/15'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setStatus('paused')}
          className={`px-2.5 py-1 rounded-full text-[11px] ${
            status === 'paused'
              ? 'bg-jet/10 text-jet/60'
              : 'border border-jet/15'
          }`}
        >
          Paused
        </button>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-jet/15 text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="px-3 py-1.5 rounded-lg bg-jet text-bone text-xs font-medium disabled:opacity-50"
        >
          {submitting ? 'Saving…' : coupon ? 'Save coupon' : 'Add coupon'}
        </button>
      </div>
    </div>
  );
}
