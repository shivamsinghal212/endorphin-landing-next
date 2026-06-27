'use client';

import type { RegistrationFormField } from '@/lib/organiser-api';

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet focus:border-jet outline-none';

export type CustomFormData = Record<string, string | string[]>;

export function validateCustomQuestions(
  fields: RegistrationFormField[] | null | undefined,
  data: CustomFormData,
): { ok: true } | { ok: false; firstMissingId: string } {
  if (!fields || fields.length === 0) return { ok: true };
  for (const f of fields) {
    if (!f.required) continue;
    const v = data[f.id];
    if (f.type === 'multi_select') {
      if (!Array.isArray(v) || v.length === 0) {
        return { ok: false, firstMissingId: f.id };
      }
    } else {
      if (typeof v !== 'string' || !v.trim()) {
        return { ok: false, firstMissingId: f.id };
      }
    }
  }
  return { ok: true };
}

export function CustomQuestions({
  fields,
  values,
  onChange,
}: {
  fields: RegistrationFormField[];
  values: CustomFormData;
  onChange: (next: CustomFormData) => void;
}) {
  if (fields.length === 0) return null;

  const setField = (id: string, v: string | string[]) =>
    onChange({ ...values, [id]: v });

  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet">
          A few quick questions
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {fields.map((f) => {
          const current = values[f.id];
          const strVal = typeof current === 'string' ? current : '';
          const arrVal = Array.isArray(current) ? current : [];
          return (
            <div key={f.id} id={`field-${f.id}`}>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
                  {f.label}
                  {f.required && <span className="text-signal ml-0.5">*</span>}
                </span>
                {(() => {
                  switch (f.type) {
                    case 'textarea':
                      return (
                        <textarea
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          placeholder={f.placeholder ?? undefined}
                          rows={3}
                          className={inputCls}
                          required={f.required}
                        />
                      );
                    case 'select':
                      return (
                        <select
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          className={inputCls}
                          required={f.required}
                        >
                          <option value="">Select…</option>
                          {(f.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      );
                    case 'multi_select':
                      return (
                        <div className="flex flex-wrap gap-2">
                          {(f.options ?? []).map((opt) => {
                            const checked = arrVal.includes(opt);
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() =>
                                  setField(
                                    f.id,
                                    checked
                                      ? arrVal.filter((x) => x !== opt)
                                      : [...arrVal, opt],
                                  )
                                }
                                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                  checked
                                    ? 'bg-jet text-bone border-jet'
                                    : 'bg-white text-jet border-jet/15 hover:border-jet/40'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      );
                    case 'number':
                      return (
                        <input
                          type="number"
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          placeholder={f.placeholder ?? undefined}
                          className={inputCls}
                          required={f.required}
                        />
                      );
                    case 'date':
                      return (
                        <input
                          type="date"
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          className={inputCls}
                          required={f.required}
                        />
                      );
                    case 'email':
                      return (
                        <input
                          type="email"
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          placeholder={f.placeholder ?? undefined}
                          autoComplete="email"
                          className={inputCls}
                          required={f.required}
                        />
                      );
                    case 'phone':
                      return (
                        <input
                          type="tel"
                          value={strVal}
                          // type="tel" doesn't restrict characters and
                          // inputMode is only a keyboard hint — strip anything
                          // that isn't a valid phone character as the user types.
                          onChange={(e) =>
                            setField(f.id, e.target.value.replace(/[^\d+()\-\s]/g, ''))
                          }
                          placeholder={f.placeholder ?? undefined}
                          autoComplete="tel"
                          inputMode="tel"
                          className={inputCls}
                          required={f.required}
                        />
                      );
                    case 'text':
                    default:
                      return (
                        <input
                          type="text"
                          value={strVal}
                          onChange={(e) => setField(f.id, e.target.value)}
                          placeholder={f.placeholder ?? undefined}
                          className={inputCls}
                          required={f.required}
                        />
                      );
                  }
                })()}
              </label>
              {f.helpText && (
                <p className="text-[11px] text-jet/50 mt-1">{f.helpText}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
