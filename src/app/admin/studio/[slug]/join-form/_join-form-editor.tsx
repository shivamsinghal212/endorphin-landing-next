'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Club, JoinFormField, JoinFormFieldType } from '@/lib/admin-api';
import { describeError, usePatchClub } from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import {
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  TextInput,
  Toggle,
} from '../../_components/form';

const FIELD_TYPES: { value: JoinFormFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Picker (single choice)' },
];

let tempId = 0;
const makeId = () => `tmp_${Date.now()}_${tempId++}`;

export function JoinFormEditor({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const [base, setBase] = useState<JoinFormField[]>(initialClub.joinForm ?? []);
  const [fields, setFields] = useState<JoinFormField[]>(
    initialClub.joinForm ?? [],
  );
  const [requiresApproval, setRequiresApproval] = useState(
    initialClub.requiresApproval,
  );
  const [baseRequires, setBaseRequires] = useState(initialClub.requiresApproval);
  const patchMut = usePatchClub(slug);

  const dirty =
    JSON.stringify(fields) !== JSON.stringify(base) ||
    requiresApproval !== baseRequires;

  const updateField = (id: string, patch: Partial<JoinFormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: makeId(),
        label: '',
        type: 'text',
        required: false,
        options: null,
        placeholder: null,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    const cleanFields: JoinFormField[] = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        id: f.id.startsWith('tmp_') ? f.label.toLowerCase().replace(/\s+/g, '_').slice(0, 32) : f.id,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        placeholder: f.placeholder?.trim() || null,
        options:
          f.type === 'select'
            ? (f.options ?? [])
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
      }));
    try {
      const updated = await patchMut.mutateAsync({
        joinForm: cleanFields,
        requiresApproval,
      });
      const nextFields = updated.joinForm ?? [];
      setBase(nextFields);
      setFields(nextFields);
      setBaseRequires(updated.requiresApproval);
      setRequiresApproval(updated.requiresApproval);
      toast.success('Join form saved');
    } catch (e) {
      toast.error('Could not save', { description: describeError(e) });
    }
  };

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="Join form"
      rightAction={
        <PrimaryButton
          onClick={handleSave}
          loading={patchMut.isPending}
          disabled={!dirty}
        >
          {dirty ? 'Save changes' : 'Saved'}
        </PrimaryButton>
      }
    >
      <SectionCard title="How people get in">
        <label className="flex items-center justify-between py-2.5 cursor-pointer">
          <div>
            <p className="text-sm font-medium">Approval required</p>
            <p className="text-xs text-jet/50">
              On = you review every request. Off = everyone gets in.
            </p>
          </div>
          <Toggle
            checked={requiresApproval}
            onChange={setRequiresApproval}
          />
        </label>
      </SectionCard>

      <SectionCard
        title="Questions"
        description="Ask new members anything you'll want to know upfront."
        rightSlot={
          <SecondaryButton onClick={addField}>+ Add question</SecondaryButton>
        }
      >
        {fields.length === 0 ? (
          <p className="text-sm text-jet/50 py-6 text-center">
            No questions yet. We&apos;ll just ask for name and email when
            someone joins.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="border border-jet/10 rounded-xl p-4 bg-[#F8F6F3]/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-jet/40">
                    Q{i + 1}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => move(f.id, -1)}
                      disabled={i === 0}
                      className="text-jet/40 hover:text-jet disabled:opacity-30 px-1"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(f.id, 1)}
                      disabled={i === fields.length - 1}
                      className="text-jet/40 hover:text-jet disabled:opacity-30 px-1"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeField(f.id)}
                      className="text-jet/40 hover:text-signal px-2 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-[1fr_160px] gap-3 mb-3">
                  <div>
                    <FieldLabel>Question label</FieldLabel>
                    <TextInput
                      value={f.label}
                      onChange={(v) => updateField(f.id, { label: v })}
                      placeholder="What pace are you running these days?"
                    />
                  </div>
                  <div>
                    <FieldLabel>Type</FieldLabel>
                    <select
                      value={f.type}
                      onChange={(e) =>
                        updateField(f.id, {
                          type: e.target.value as JoinFormFieldType,
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <FieldLabel hint="Optional helper text inside the field">
                    Placeholder
                  </FieldLabel>
                  <TextInput
                    value={f.placeholder ?? ''}
                    onChange={(v) =>
                      updateField(f.id, { placeholder: v })
                    }
                    placeholder="e.g. 5:30 per km"
                  />
                </div>
                {f.type === 'select' && (
                  <div className="mb-3">
                    <FieldLabel hint="One option per line">Options</FieldLabel>
                    <textarea
                      value={(f.options ?? []).join('\n')}
                      onChange={(e) =>
                        updateField(f.id, {
                          options: e.target.value.split('\n'),
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
                      placeholder={'Beginner\nIntermediate\nAdvanced'}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      updateField(f.id, { required: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-jet/20"
                  />
                  Required
                </label>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

    </ManageShell>
  );
}

