'use client';

import { useState } from 'react';
import type {
  RegistrationFieldType,
  RegistrationFormField,
} from '@/lib/organiser-api';
import { makeTempFieldId, patchDraft, type WizardDraft } from '../wizard-state';

const FIELD_TYPES: { value: RegistrationFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Picker' },
  { value: 'multi_select', label: 'Multi-pick' },
];

const MAX_FIELDS = 15;

const BIND_OPTIONS: Array<{
  value: RegistrationFormField['bindToUserField'];
  label: string;
}> = [
  { value: null, label: "(don't save)" },
  { value: 'name', label: 'name' },
  { value: 'phone', label: 'phone' },
  { value: 'email', label: 'email' },
];

export function StepQuestions({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (next: WizardDraft) => void;
}) {
  const fields = draft.registrationForm ?? [];

  const setFields = (next: RegistrationFormField[]) =>
    onChange(patchDraft(draft, { registrationForm: next.length ? next : null }));

  const update = (id: string, patch: Partial<RegistrationFormField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const remove = (id: string) => setFields(fields.filter((f) => f.id !== id));

  const add = () => {
    if (fields.length >= MAX_FIELDS) return;
    setFields([
      ...fields,
      {
        id: makeTempFieldId(),
        label: '',
        type: 'text',
        required: false,
        placeholder: null,
        helpText: null,
        options: null,
        bindToUserField: null,
      },
    ]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const copy = fields.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setFields(copy);
  };

  // ── HTML5 drag for reorder ──────────────────────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">
          Custom questions
        </h1>
        <p className="text-sm text-jet/60">
          Anything extra you want to ask. Three is plenty; ten is too many.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        {/* Editor column */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          {fields.map((f, i) => (
            <div
              key={f.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => {
                if (overIndex === i) setOverIndex(null);
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                move(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`bg-white border rounded-2xl p-4 ${
                overIndex === i && dragIndex !== null
                  ? 'border-jet ring-2 ring-jet/20'
                  : 'border-jet/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-jet/30 cursor-grab active:cursor-grabbing select-none"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                >
                  ⠿
                </span>
                <input
                  value={f.label}
                  onChange={(e) => update(f.id, { label: e.target.value })}
                  placeholder="Question label"
                  className="flex-1 px-3 py-2 rounded-lg border border-jet/10 text-sm font-medium"
                />
                <select
                  value={f.type}
                  onChange={(e) =>
                    update(f.id, {
                      type: e.target.value as RegistrationFieldType,
                      // wipe options when leaving select-style types
                      options:
                        e.target.value === 'select' ||
                        e.target.value === 'multi_select'
                          ? f.options ?? []
                          : null,
                    })
                  }
                  className="px-2 py-2 rounded-lg border border-jet/10 text-sm bg-white"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="text-jet/30 hover:text-signal px-1"
                  aria-label="Remove question"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={f.placeholder ?? ''}
                  onChange={(e) =>
                    update(f.id, { placeholder: e.target.value || null })
                  }
                  placeholder="Placeholder"
                  className="px-3 py-2 rounded-lg border border-jet/10 text-sm"
                />
                <input
                  value={f.helpText ?? ''}
                  onChange={(e) =>
                    update(f.id, { helpText: e.target.value || null })
                  }
                  placeholder="Help text"
                  className="px-3 py-2 rounded-lg border border-jet/10 text-sm"
                />
              </div>

              {(f.type === 'select' || f.type === 'multi_select') && (
                <OptionsEditor
                  options={f.options ?? []}
                  onChange={(opts) => update(f.id, { options: opts })}
                />
              )}

              <div className="mt-3 p-2.5 rounded-lg bg-jet/[0.04] border border-jet/10 flex items-center gap-2 text-[12px] flex-wrap">
                <span className="text-jet/40">⟳</span>
                <span className="text-jet/70">Save to runner&apos;s profile as</span>
                <select
                  value={f.bindToUserField ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(f.id, {
                      bindToUserField:
                        v === '' ? null : (v as 'name' | 'phone' | 'email'),
                    });
                  }}
                  className="px-2 py-1 rounded border border-jet/10 text-[12px] bg-white"
                >
                  {BIND_OPTIONS.map((b) => (
                    <option key={b.label} value={b.value ?? ''}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center justify-between text-[12px]">
                <label className="flex items-center gap-1.5 text-jet/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => update(f.id, { required: e.target.checked })}
                    className="accent-jet"
                  />
                  Required
                </label>
                <div className="flex items-center gap-2 text-jet/40">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="hover:text-jet disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === fields.length - 1}
                    className="hover:text-jet disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            disabled={fields.length >= MAX_FIELDS}
            className="w-full py-3 rounded-2xl border border-dashed border-jet/20 text-sm text-jet/60 hover:bg-white disabled:opacity-50"
          >
            {fields.length >= MAX_FIELDS
              ? `Maximum ${MAX_FIELDS} questions`
              : '＋ Add question'}
          </button>
        </div>

        {/* Live preview */}
        <div className="col-span-12 lg:col-span-5">
          <div className="lg:sticky lg:top-20">
            <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2">
              Preview · what runners see
            </p>
            <Preview draft={draft} fields={fields} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  return (
    <div className="mt-2">
      <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-1.5">
        Options
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        {options.map((o, idx) => (
          <span
            key={`${o}-${idx}`}
            className="text-[12px] px-2.5 py-1 rounded-full bg-jet/[0.06] inline-flex items-center gap-1.5"
          >
            {o}
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== idx))}
              className="text-jet/40 hover:text-signal"
              aria-label={`Remove ${o}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              e.preventDefault();
              onChange([...options, draft.trim()]);
              setDraft('');
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              onChange([...options, draft.trim()]);
              setDraft('');
            }
          }}
          placeholder="+ add option"
          className="text-[12px] px-2.5 py-1 rounded-full border border-dashed border-jet/30 w-32"
        />
      </div>
    </div>
  );
}

function Preview({
  draft,
  fields,
}: {
  draft: WizardDraft;
  fields: RegistrationFormField[];
}) {
  const cheapest = draft.distanceCategories[0];
  return (
    <div className="bg-jet rounded-3xl p-3">
      <div className="bg-bone rounded-2xl p-5">
        <p className="font-display uppercase font-bold text-lg mb-1">Register</p>
        <p className="text-[11px] text-jet/55 mb-4">
          {draft.title || 'Your event'}
          {cheapest ? ` · ${cheapest.categoryName || 'distance'} · ₹${cheapest.price}` : ''}
        </p>
        {fields.length === 0 && (
          <p className="text-[12px] text-jet/50 italic">
            No custom questions yet — only platform fields will be asked.
          </p>
        )}
        {fields.map((f) => (
          <div key={f.id} className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-jet/50 mb-1">
              {f.label || 'Untitled question'}
              {f.required && <span className="text-signal ml-1">*</span>}
            </p>
            {renderPreviewField(f)}
            {f.helpText && (
              <p className="text-[10px] text-jet/40 mt-1">{f.helpText}</p>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled
          className="w-full mt-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium opacity-90"
        >
          Pay ₹{cheapest?.price ?? '—'} →
        </button>
      </div>
    </div>
  );
}

function renderPreviewField(f: RegistrationFormField) {
  const base =
    'w-full px-3 py-2 rounded-lg border border-jet/10 text-sm bg-white';
  switch (f.type) {
    case 'textarea':
      return (
        <textarea
          rows={3}
          placeholder={f.placeholder ?? ''}
          disabled
          className={base}
        />
      );
    case 'select':
      return (
        <select disabled className={base}>
          <option>Pick one…</option>
          {(f.options ?? []).map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      );
    case 'multi_select':
      return (
        <div className="flex flex-wrap gap-1">
          {(f.options ?? []).length === 0 ? (
            <span className="text-[11px] text-jet/40 italic">
              No options yet
            </span>
          ) : (
            (f.options ?? []).map((o, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full border border-jet/15"
              >
                {o}
              </span>
            ))
          )}
        </div>
      );
    case 'date':
      return <input type="date" disabled className={base} />;
    case 'number':
      return (
        <input
          type="number"
          placeholder={f.placeholder ?? ''}
          disabled
          className={base}
        />
      );
    case 'email':
      return (
        <input
          type="email"
          placeholder={f.placeholder ?? 'you@example.com'}
          disabled
          className={base}
        />
      );
    case 'phone':
      return (
        <input
          type="tel"
          placeholder={f.placeholder ?? '+91'}
          disabled
          className={base}
        />
      );
    case 'text':
    default:
      return (
        <input
          type="text"
          placeholder={f.placeholder ?? ''}
          disabled
          className={base}
        />
      );
  }
}
