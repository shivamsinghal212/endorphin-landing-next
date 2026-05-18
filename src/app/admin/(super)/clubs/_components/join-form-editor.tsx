'use client';

import type { JoinFormField, JoinFormFieldType } from '@/lib/admin-api';

const inputCls =
  'px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors';

const TYPES: { value: JoinFormFieldType; label: string }[] = [
  { value: 'text', label: 'Text (single line)' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Select (options)' },
  { value: 'number', label: 'Number' },
];

function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function JoinFormEditor({
  fields,
  onChange,
}: {
  fields: JoinFormField[];
  onChange: (v: JoinFormField[]) => void;
}) {
  const update = (i: number, patch: Partial<JoinFormField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...fields,
      {
        id: `field_${fields.length + 1}`,
        label: '',
        type: 'text',
        required: false,
        options: null,
        placeholder: null,
      },
    ]);

  if (fields.length === 0) {
    return (
      <div>
        <p className="font-body text-sm text-jet/50 mb-3">
          No join form. Members will tap Join with no form data.
        </p>
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
        >
          + Add field
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((f, i) => {
        const isSelect = f.type === 'select';
        const optionsCsv = (f.options ?? []).join('\n');
        return (
          <div key={i} className="rounded-lg border border-jet/10 p-3 space-y-2 bg-jet/[0.015]">
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-jet/40 w-6">{i + 1}.</span>
              <input
                value={f.label}
                onChange={(e) => {
                  const label = e.target.value;
                  // Auto-derive id from label until user customizes id manually.
                  const derivedId = slugifyId(label);
                  update(i, {
                    label,
                    id: !f.id || f.id === slugifyId(f.label) ? derivedId : f.id,
                  });
                }}
                placeholder="Question label *"
                className={`${inputCls} flex-1`}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === fields.length - 1}
                  className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="font-body text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={f.type}
                onChange={(e) =>
                  update(i, {
                    type: e.target.value as JoinFormFieldType,
                    options: e.target.value === 'select' ? f.options ?? [] : null,
                  })
                }
                className={inputCls}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                value={f.id}
                onChange={(e) =>
                  update(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                }
                placeholder="Field id (auto)"
                className={inputCls}
              />
              <input
                value={f.placeholder ?? ''}
                onChange={(e) => update(i, { placeholder: e.target.value || null })}
                placeholder="Placeholder hint"
                className={`${inputCls} col-span-2`}
              />
              <label className="flex items-center gap-2 col-span-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="w-4 h-4 accent-signal cursor-pointer"
                />
                <span className="font-body text-sm text-jet">Required</span>
              </label>
              {isSelect && (
                <div className="col-span-2">
                  <label className="block font-body text-xs font-medium text-jet/50 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={optionsCsv}
                    onChange={(e) =>
                      update(i, {
                        options: e.target.value
                          .split('\n')
                          .map((o) => o.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={4}
                    placeholder={'Option A\nOption B\nOption C'}
                    className={`${inputCls} w-full resize-none`}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-body font-medium hover:bg-jet/5 transition-colors cursor-pointer"
      >
        + Add field
      </button>
    </div>
  );
}
