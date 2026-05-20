'use client';

import { useMemo } from 'react';
import type { MeProfile } from '@/lib/runner-api';

export type ProfileFieldKey = 'name' | 'email' | 'phone' | 'birthdate' | 'gender';

export interface ProfileDraft {
  name: string;
  email: string;
  phone: string;
  birthdate: string; // YYYY-MM-DD
  gender: string;
}

export function missingProfileFields(me: MeProfile | null | undefined): ProfileFieldKey[] {
  if (!me) return [];
  const out: ProfileFieldKey[] = [];
  if (!me.name?.trim()) out.push('name');
  if (!me.email?.trim()) out.push('email');
  if (!me.phone?.trim()) out.push('phone');
  if (!me.birthdate) out.push('birthdate');
  if (!me.gender) out.push('gender');
  return out;
}

export function profileDraftFromMe(me: MeProfile | null | undefined): ProfileDraft {
  return {
    name: me?.name ?? '',
    email: me?.email ?? '',
    phone: me?.phone ?? '',
    birthdate: me?.birthdate ?? '',
    gender: (me?.gender as string) ?? '',
  };
}

const FIELD_LABEL: Record<ProfileFieldKey, string> = {
  name: 'Full name',
  email: 'Email',
  phone: 'Phone (10 digits)',
  birthdate: 'Date of birth',
  gender: 'Gender',
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export function ProfileGate({
  draft,
  setDraft,
  missing,
}: {
  draft: ProfileDraft;
  setDraft: (next: ProfileDraft) => void;
  missing: ProfileFieldKey[];
}) {
  const missingSet = useMemo(() => new Set(missing), [missing]);
  if (missing.length === 0) return null;

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet">
          Finish your profile
        </p>
        <p className="text-xs text-jet/60 mt-0.5">
          We just need a few details before you can register. Saved to your profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {missingSet.has('name') && (
          <Field label={FIELD_LABEL.name}>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              autoComplete="name"
              required
              className={inputCls}
            />
          </Field>
        )}
        {missingSet.has('email') && (
          <Field label={FIELD_LABEL.email}>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              required
              className={inputCls}
            />
          </Field>
        )}
        {missingSet.has('phone') && (
          <Field label={FIELD_LABEL.phone}>
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) =>
                update('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
              }
              inputMode="numeric"
              autoComplete="tel"
              required
              className={inputCls}
            />
          </Field>
        )}
        {missingSet.has('birthdate') && (
          <Field label={FIELD_LABEL.birthdate}>
            <input
              type="date"
              value={draft.birthdate}
              onChange={(e) => update('birthdate', e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        )}
        {missingSet.has('gender') && (
          <Field label={FIELD_LABEL.gender}>
            <select
              value={draft.gender}
              onChange={(e) => update('gender', e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </section>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet focus:border-jet outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
