'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/app/admin/studio/_components/form';
import {
  describeOrganiserError,
  useInitiateRefund,
} from '@/lib/studio/organiser-hooks';
import type { RegistrationRow } from '@/lib/organiser-api';
import { formatINR } from './_utils';

type Mode = 'full' | 'partial';

export function RefundDialog({
  eventId,
  registration,
  distanceLabel,
  open,
  onClose,
  onRefundQueued,
}: {
  eventId: string;
  registration: RegistrationRow | null;
  distanceLabel: string;
  open: boolean;
  onClose: () => void;
  onRefundQueued: (registrationId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [mode, setMode] = useState<Mode>('full');
  const [partialRupees, setPartialRupees] = useState('');
  const [reason, setReason] = useState('');
  const mutation = useInitiateRefund(eventId);

  // Open/close the native dialog imperatively.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Reset form whenever a new registration is loaded.
  useEffect(() => {
    if (open) {
      setMode('full');
      setPartialRupees('');
      setReason('');
    }
  }, [open, registration?.id]);

  if (!registration) {
    return (
      <dialog
        ref={ref}
        onClose={onClose}
        className="rounded-2xl p-0 m-auto backdrop:bg-jet/40 backdrop:backdrop-blur-sm"
      />
    );
  }

  const amountPaid = registration.amountPaid ?? 0;
  const partialPaise = Math.round(Number(partialRupees) * 100);
  const partialValid =
    mode === 'partial' &&
    Number.isFinite(partialPaise) &&
    partialPaise > 0 &&
    partialPaise <= amountPaid;
  const canSubmit = mode === 'full' || partialValid;

  const submit = async () => {
    if (!canSubmit) return;
    const payload: { registrationId: string; amountPaise?: number; reason?: string } = {
      registrationId: registration.id,
    };
    if (mode === 'partial') payload.amountPaise = partialPaise;
    if (reason.trim()) payload.reason = reason.trim().slice(0, 280);
    try {
      await mutation.mutateAsync(payload);
      toast.success(
        'Registration cancelled and refund queued — Razorpay will confirm within 5–10 days',
      );
      onRefundQueued(registration.id);
      onClose();
    } catch (err) {
      toast.error(describeOrganiserError(err));
    }
  };

  const runnerName = registration.user?.name || 'Anonymous';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        // Allow Escape to close but also notify parent state.
        e.preventDefault();
        ref.current?.close();
      }}
      className="m-auto rounded-2xl p-0 w-[calc(100vw-2rem)] max-w-md border border-jet/10 backdrop:bg-jet/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <p className="font-display uppercase text-sm font-bold mb-1">
          Cancel & refund
        </p>
        <div className="text-[12px] text-jet/60 mb-4">
          <p>
            <span className="text-jet/90 font-medium">{runnerName}</span>
            {' · '}
            {distanceLabel}
            {' · '}
            Paid {formatINR(amountPaid)}
          </p>
          <p className="mt-2 leading-snug">
            This cancels the registration and queues a Razorpay refund. The
            runner can re-register for the same distance afterwards.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-1.5">
              Refund type
            </p>
            <div className="flex items-center gap-2">
              <RadioPill
                label={`Full refund (${formatINR(amountPaid)})`}
                checked={mode === 'full'}
                onClick={() => setMode('full')}
              />
              <RadioPill
                label="Partial refund"
                checked={mode === 'partial'}
                onClick={() => setMode('partial')}
              />
            </div>
          </div>

          {mode === 'partial' && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-1.5">
                Amount (₹)
              </p>
              <TextInput
                value={partialRupees}
                onChange={setPartialRupees}
                placeholder={`Up to ${formatINR(amountPaid)}`}
                type="number"
              />
              {partialRupees && !partialValid && (
                <p className="text-[11px] text-signal mt-1">
                  Enter an amount between ₹1 and {formatINR(amountPaid)}.
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-1.5">
              Reason <span className="text-jet/40 normal-case">(optional)</span>
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 280))}
              rows={3}
              maxLength={280}
              placeholder="Shared with finance and audit logs only"
              className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
            />
            <p className="text-[10px] text-jet/40 mt-1 text-right">
              {reason.length}/280
            </p>
          </div>
        </div>

        <p className="text-[11px] text-jet/50 mt-4 bg-jet/[0.03] rounded-lg p-2.5">
          Razorpay processes refunds in 5–10 working days. The runner will get
          an email when complete.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <SecondaryButton onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={submit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          >
            Cancel & refund
          </PrimaryButton>
        </div>
      </div>
    </dialog>
  );
}

function RadioPill({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
        checked
          ? 'bg-jet text-bone border-jet'
          : 'bg-white text-jet/70 border-jet/15 hover:bg-jet/5'
      }`}
    >
      {label}
    </button>
  );
}
