'use client';

import { useState } from 'react';

export function TagsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...value, t]);
    setDraft('');
  };
  const remove = (t: string) => onChange(value.filter((x) => x !== t));
  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-jet/5 border border-jet/10 font-body text-xs text-jet"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-jet/40 hover:text-red-600 leading-none"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={add}
        placeholder="Type a tag and press Enter"
        className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
      />
    </div>
  );
}
