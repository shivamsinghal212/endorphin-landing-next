'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { JoinFormField } from '@/lib/admin-api';
import { joinClubAction } from '@/app/actions/clubs';

interface JoinClubFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after backend confirms — caller usually router.refresh()'s. */
  onSuccess?: (status: 'pending' | 'active') => void;
  slug: string;
  clubName: string;
  fields: JoinFormField[];
  /** When true, copy reads "join the club" instead of "send a request". */
  autoJoin: boolean;
}

// Tolerate admins who saved an unknown field type — fall back to a plain text
// input so the form still submits.
function normalizeType(t: string): JoinFormField['type'] {
  if (t === 'text' || t === 'textarea' || t === 'select' || t === 'number') return t;
  return 'text';
}

export default function JoinClubFormModal({
  open,
  onClose,
  onSuccess,
  slug,
  clubName,
  fields,
  autoJoin,
}: JoinClubFormModalProps) {
  // Drop duplicate-id fields, keeping the *last* occurrence — matches mobile
  // dedupe behavior so the value that wins on submit also renders.
  const safeFields = useMemo(() => {
    const seen = new Map<string, JoinFormField>();
    for (const f of fields) seen.set(f.id, f);
    return Array.from(seen.values());
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues({});
      setErrors({});
      setSubmitError(null);
    }
  }, [open]);

  function set(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
  }

  function validate(): { ok: boolean; errors: Record<string, string> } {
    const next: Record<string, string> = {};
    for (const f of safeFields) {
      const raw = values[f.id];
      const blank = raw === undefined || raw.trim() === '';
      if (f.required && blank) {
        next[f.id] = 'This field is required';
        continue;
      }
      if (!blank && normalizeType(f.type) === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n)) next[f.id] = 'Must be a number';
      }
    }
    return { ok: Object.keys(next).length === 0, errors: next };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const v = validate();
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const f of safeFields) {
      const raw = values[f.id];
      if (raw === undefined || raw.trim() === '') continue;
      payload[f.id] = normalizeType(f.type) === 'number' ? Number(raw) : raw.trim();
    }
    startTransition(async () => {
      const r = await joinClubAction(
        slug,
        safeFields.length === 0 ? null : payload,
      );
      if (r.ok && r.data) {
        onSuccess?.(r.data.status);
      } else if (!r.ok) {
        setSubmitError(r.error);
      }
    });
  }

  const hasFields = safeFields.length > 0;
  const submitLabel = autoJoin ? 'Join club' : 'Send request';
  const submittingLabel = autoJoin ? 'Joining…' : 'Sending…';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="v1lm-overlay" />
        <Dialog.Content
          className="v1lm-modal"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (pending) e.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">Join {clubName}</Dialog.Title>

          <button
            type="button"
            className="v1lm-close"
            aria-label="Close"
            onClick={onClose}
            disabled={pending}
          >
            <CloseIcon />
          </button>

          <div className="v1lm-body">
            <form onSubmit={handleSubmit} className="v1lm-form">
              <span
                className="text-[10px] font-semibold tracking-[0.18em] text-[#5C544A] uppercase mb-1"
              >
                Join
              </span>
              <h2 className="v1lm-h2">
                {clubName}
                <span className="v1lm-red">.</span>
              </h2>
              <p className="v1lm-sub">
                {autoJoin
                  ? hasFields
                    ? 'Tell us a bit about yourself and you’re in.'
                    : 'No questions to answer — tap below to join.'
                  : hasFields
                    ? 'Answer a few quick questions and the club admins will review your request.'
                    : 'No questions to answer — tap below to send a request.'}
              </p>

              {hasFields && (
                <div className="flex flex-col gap-3 mt-4">
                  {safeFields.map((f) => (
                    <FieldRow
                      key={f.id}
                      field={f}
                      value={values[f.id] ?? ''}
                      onChange={(v) => set(f.id, v)}
                      error={errors[f.id]}
                      disabled={pending}
                    />
                  ))}
                </div>
              )}

              {submitError && (
                <div className="v1lm-feedback is-error mt-3" role="alert">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                className="v1lm-btn-primary mt-5"
                disabled={pending}
              >
                {pending ? submittingLabel : submitLabel}
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: JoinFormField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const type = normalizeType(field.type);
  const id = `jcfm-${field.id}`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-medium tracking-[0.12em] text-[#5C544A] uppercase"
      >
        {field.label}
        {field.required ? <span className="text-[#E6232A]"> *</span> : null}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={id}
          className="rounded-md border border-black/20 bg-white px-3.5 py-2.5 text-[14px] font-sans focus:border-black focus:outline-none disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          className="rounded-md border border-black/20 bg-white px-3.5 py-2.5 text-[14px] font-sans focus:border-black focus:outline-none disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="" disabled>
            {field.placeholder ?? 'Select…'}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="v1lm-input"
          type={type === 'number' ? 'text' : 'text'}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? undefined}
          disabled={disabled}
        />
      )}

      {error && (
        <span className="text-[12px] text-[#E6232A] font-medium">{error}</span>
      )}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
