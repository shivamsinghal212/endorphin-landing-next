'use client';

import { ReactNode } from 'react';

export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <label className="text-[11px] uppercase tracking-wider text-jet/50">
        {children}
        {required && <span className="text-signal ml-0.5">·</span>}
      </label>
      {hint && <span className="text-[10px] text-jet/40 ml-auto">{hint}</span>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none disabled:bg-jet/[0.03] disabled:text-jet/50"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
    />
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors p-0.5 ${
        checked ? 'bg-signal' : 'bg-jet/20'
      } disabled:opacity-50`}
    >
      <span
        className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

export function SectionCard({
  title,
  description,
  children,
  rightSlot,
}: {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-display uppercase text-sm font-bold">{title}</p>
          {description && (
            <p className="text-xs text-jet/50 mt-0.5">{description}</p>
          )}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function StickySaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}) {
  if (!dirty && !saving) return null;
  return (
    <div className="sticky bottom-3 mt-6 z-20">
      <div className="bg-white border border-jet/10 rounded-xl shadow-lg p-3 flex items-center gap-3">
        <span className="text-xs text-jet/60 flex-1">
          {saving ? 'Saving…' : 'You have unsaved changes'}
        </span>
        {onDiscard && (
          <SecondaryButton onClick={onDiscard} disabled={saving}>
            Discard
          </SecondaryButton>
        )}
        <PrimaryButton onClick={onSave} loading={saving}>
          Save changes
        </PrimaryButton>
      </div>
    </div>
  );
}
