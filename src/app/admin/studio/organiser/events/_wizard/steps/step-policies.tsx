'use client';

import { MarkdownEditor } from '@/components/studio/MarkdownEditor';
import { Toggle } from '@/app/admin/studio/_components/form';
import {
  DEFAULT_REFUND_TEMPLATE,
  DEFAULT_REFUND_TEMPLATE_EXPERIENCE,
  DEFAULT_TERMS_TEMPLATE,
  DEFAULT_TERMS_TEMPLATE_EXPERIENCE,
  patchDraft,
  type WizardDraft,
} from '../wizard-state';

export function StepPolicies({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (next: WizardDraft) => void;
}) {
  const set = (patch: Partial<WizardDraft>) => onChange(patchDraft(draft, patch));
  const isExperience = draft.category === 'experience';
  const who = isExperience ? 'Guests' : 'Runners';
  const refundTemplate = isExperience
    ? DEFAULT_REFUND_TEMPLATE_EXPERIENCE
    : DEFAULT_REFUND_TEMPLATE;
  const termsTemplate = isExperience
    ? DEFAULT_TERMS_TEMPLATE_EXPERIENCE
    : DEFAULT_TERMS_TEMPLATE;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">
          Refund policy &amp; T&amp;Cs
        </h1>
        <p className="text-sm text-jet/60">
          Both are markdown. {who} agree to these at checkout. Both required
          to publish.
        </p>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl p-5">
        <MarkdownEditor
          label="Refund policy"
          required
          value={draft.refundPolicyMd ?? ''}
          onChange={(v) => set({ refundPolicyMd: v })}
          defaultTemplate={refundTemplate}
          rows={12}
          placeholder={`What ${who.toLowerCase()} can expect when they cancel.`}
        />

        <div className="mt-4 p-3 rounded-xl bg-jet/[0.03] flex flex-wrap gap-3 sm:gap-4 items-center text-[12px]">
          <p className="text-[10px] uppercase tracking-wider text-jet/50 w-full sm:w-auto">
            System refund rules
          </p>
          <label className="flex items-center gap-2">
            <Toggle
              checked={!!draft.autoRefundOnCancel}
              onChange={(v) => set({ autoRefundOnCancel: v })}
            />
            <span>Auto-refund if event cancelled</span>
          </label>
          <label className="flex items-center gap-2 flex-wrap">
            <span>Self-cancellation allowed until</span>
            <input
              type="number"
              min={0}
              value={draft.refundDeadlineDays ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') return set({ refundDeadlineDays: null });
                const n = Number(v);
                if (Number.isNaN(n) || n < 0) return;
                set({ refundDeadlineDays: n });
              }}
              className="w-16 px-2 py-1 rounded border border-jet/10"
            />
            <span>days before {isExperience ? 'event' : 'run'}</span>
          </label>
        </div>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl p-5">
        <MarkdownEditor
          label="Terms & conditions"
          required
          value={draft.termsMd ?? ''}
          onChange={(v) => set({ termsMd: v })}
          defaultTemplate={termsTemplate}
          rows={10}
          placeholder={`What ${who.toLowerCase()} agree to when they ${isExperience ? 'book' : 'register'}.`}
        />
      </div>
    </div>
  );
}
