'use client';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors';

export function Field({
  label,
  value,
  onChange,
  textarea,
  type = 'text',
  placeholder,
  rows = 4,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      {label && (
        <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      )}
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
      {hint && <p className="mt-1 font-body text-xs text-jet/40">{hint}</p>}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 accent-signal cursor-pointer"
      />
      <span>
        <span className="font-body text-sm text-jet">{label}</span>
        {hint && <span className="block font-body text-xs text-jet/40">{hint}</span>}
      </span>
    </label>
  );
}
