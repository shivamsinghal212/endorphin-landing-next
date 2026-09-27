'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  describeOrganiserError,
  useSubmitPayoutAccount,
} from '@/lib/studio/organiser-hooks';
import { Field, Sheet, SheetActions, inputCls } from './_sheet';

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;

/** Collect the bank account ticket money is paid out to.
 *
 *  Submitting doesn't link anything yet — the details are emailed to us, we
 *  create the Razorpay account by hand, and the checklist row reads
 *  "Processing" until payouts go live.
 */
export function PayoutSheet({
  open,
  onClose,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
}) {
  const mut = useSubmitPayoutAccount(eventId);
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [pan, setPan] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) setTouched(false);
  }, [open]);

  const errors = {
    name: name.trim().length < 2 ? 'Name exactly as on the bank account' : null,
    account: !/^\d{9,18}$/.test(account) ? '9–18 digits' : null,
    confirm: confirm !== account ? "Account numbers don't match" : null,
    ifsc: !IFSC.test(ifsc) ? '11 characters, e.g. HDFC0001234' : null,
    pan: !PAN.test(pan) ? '10 characters, e.g. ABCDE1234F' : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (e: string | null) => (touched ? e : null);

  const onSave = async () => {
    setTouched(true);
    if (!valid) return;
    try {
      await mut.mutateAsync({
        beneficiaryName: name.trim(),
        accountNumber: account,
        ifsc,
        pan,
      });
      toast.success("Bank details received — we'll set up your payouts");
      onClose();
    } catch (e) {
      toast.error("Couldn't save bank details", {
        description: describeOrganiserError(e),
      });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Payouts"
      title="Where should we"
      accent="send the money?"
      intro="Ticket money, minus the payment gateway fee, goes straight to this account once it's set up. We verify it with our payment partner, usually within a day."
      busy={mut.isPending}
      footer={
        <SheetActions
          onCancel={onClose}
          onSave={onSave}
          saving={mut.isPending}
          saveLabel="Submit"
        />
      }
    >
      <Field label="Account holder name" htmlFor="po-name" required error={show(errors.name)}>
        <input
          id="po-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={inputCls(!!show(errors.name))}
        />
      </Field>
      <Field label="Account number" htmlFor="po-acc" required error={show(errors.account)}>
        <input
          id="po-acc"
          inputMode="numeric"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 18))}
          className={`${inputCls(!!show(errors.account))} font-mono`}
        />
      </Field>
      <Field label="Confirm account number" htmlFor="po-acc2" required error={show(errors.confirm)}>
        <input
          id="po-acc2"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 18))}
          onPaste={(e) => e.preventDefault()}
          className={`${inputCls(!!show(errors.confirm))} font-mono`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="IFSC" htmlFor="po-ifsc" required error={show(errors.ifsc)}>
          <input
            id="po-ifsc"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
            className={`${inputCls(!!show(errors.ifsc))} font-mono`}
          />
        </Field>
        <Field label="PAN" htmlFor="po-pan" required error={show(errors.pan)}>
          <input
            id="po-pan"
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
            className={`${inputCls(!!show(errors.pan))} font-mono`}
          />
        </Field>
      </div>
    </Sheet>
  );
}
