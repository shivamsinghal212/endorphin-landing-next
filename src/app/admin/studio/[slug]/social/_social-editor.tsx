'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Club } from '@/lib/admin-api';
import { describeError, usePatchClub } from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import {
  FieldLabel,
  PrimaryButton,
  SectionCard,
  TextInput,
  Toggle,
} from '../../_components/form';

interface FormState {
  whatsappUrl: string;
  instagramUrl: string;
  stravaUrl: string;
  joinUrl: string;
  publishedAt: string | null;
  requiresApproval: boolean;
}

function fromClub(c: Club): FormState {
  return {
    whatsappUrl: c.whatsappUrl ?? '',
    instagramUrl: c.instagramUrl ?? '',
    stravaUrl: c.stravaUrl ?? '',
    joinUrl: c.joinUrl ?? '',
    publishedAt: c.publishedAt,
    requiresApproval: c.requiresApproval,
  };
}

export function SocialEditor({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const [base, setBase] = useState(() => fromClub(initialClub));
  const [form, setForm] = useState(() => fromClub(initialClub));
  const patchMut = usePatchClub(slug);

  const dirty = JSON.stringify(form) !== JSON.stringify(base);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    const payload = {
      whatsappUrl: form.whatsappUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      stravaUrl: form.stravaUrl.trim() || null,
      joinUrl: form.joinUrl.trim() || null,
      publishedAt: form.publishedAt,
      requiresApproval: form.requiresApproval,
    };
    try {
      const updated = await patchMut.mutateAsync(payload);
      const next = fromClub(updated);
      setBase(next);
      setForm(next);
      toast.success('Saved');
    } catch (e) {
      toast.error('Could not save', { description: describeError(e) });
    }
  };

  const togglePublished = () => {
    update('publishedAt', form.publishedAt ? null : new Date().toISOString());
  };

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="Social & links"
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
      <SectionCard
        title="Where you live online"
        description="These show up as buttons on your public page."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>WhatsApp group invite</FieldLabel>
            <TextInput
              value={form.whatsappUrl}
              onChange={(v) => update('whatsappUrl', v)}
              placeholder="https://chat.whatsapp.com/…"
            />
          </div>
          <div>
            <FieldLabel>Instagram</FieldLabel>
            <TextInput
              value={form.instagramUrl}
              onChange={(v) => update('instagramUrl', v)}
              placeholder="https://instagram.com/…"
            />
          </div>
          <div>
            <FieldLabel>Strava club</FieldLabel>
            <TextInput
              value={form.stravaUrl}
              onChange={(v) => update('stravaUrl', v)}
              placeholder="https://strava.com/clubs/…"
            />
          </div>
          <div>
            <FieldLabel hint="Optional fallback if you don't use the in-app join flow">
              External join URL
            </FieldLabel>
            <TextInput
              value={form.joinUrl}
              onChange={(v) => update('joinUrl', v)}
              placeholder="https://…"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Where this shows"
        description="Control who can find this club."
      >
        <div className="space-y-1">
          <label className="flex items-center justify-between py-2.5 cursor-pointer">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-jet/50">
                {form.publishedAt
                  ? 'Visible on the public clubs page.'
                  : 'Currently a draft — only visible to you.'}
              </p>
            </div>
            <Toggle
              checked={!!form.publishedAt}
              onChange={togglePublished}
            />
          </label>
          <label className="flex items-center justify-between py-2.5 cursor-pointer">
            <div>
              <p className="text-sm font-medium">Approval required to join</p>
              <p className="text-xs text-jet/50">
                Off means anyone with the link is in immediately. On routes new
                requests through Members.
              </p>
            </div>
            <Toggle
              checked={form.requiresApproval}
              onChange={(v) => update('requiresApproval', v)}
            />
          </label>
        </div>
      </SectionCard>

      <div className="bg-jet/[0.02] border border-dashed border-jet/15 rounded-2xl p-4 text-xs text-jet/60">
        <p className="font-display uppercase text-[11px] font-bold mb-1 text-jet/40">
          Heads up
        </p>
        Owners can change anything but can&apos;t delete a club. If you need a
        club removed, <a className="text-signal hover:underline">get in touch</a>.
      </div>

    </ManageShell>
  );
}
