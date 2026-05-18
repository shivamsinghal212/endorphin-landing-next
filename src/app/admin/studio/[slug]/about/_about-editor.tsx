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
  TextArea,
  TextInput,
} from '../../_components/form';
import { ImageUploadField } from '../../../(super)/clubs/_components/image-upload';

interface FormState {
  name: string;
  city: string;
  establishedYear: string;
  kicker: string;
  subtitle: string;
  description: string;
  tags: string;
  logoUrl: string;
  headerImageUrl: string;
}

function fromClub(c: Club): FormState {
  return {
    name: c.name,
    city: c.city,
    establishedYear: c.establishedYear ? String(c.establishedYear) : '',
    kicker: c.kicker ?? '',
    subtitle: c.subtitle ?? '',
    description: c.description ?? '',
    tags: (c.tags ?? []).join(', '),
    logoUrl: c.logoUrl ?? '',
    headerImageUrl: c.headerImageUrl ?? '',
  };
}

export function AboutEditor({
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
      name: form.name.trim(),
      city: form.city.trim(),
      establishedYear: form.establishedYear
        ? Number(form.establishedYear)
        : null,
      kicker: form.kicker.trim() || null,
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      logoUrl: form.logoUrl.trim() || null,
      headerImageUrl: form.headerImageUrl.trim() || null,
    };
    try {
      const updated = await patchMut.mutateAsync(payload);
      const next = fromClub(updated);
      setBase(next);
      setForm(next);
      toast.success('About saved');
    } catch (e) {
      toast.error('Could not save', { description: describeError(e) });
    }
  };

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="About"
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
        title="Identity"
        description="What people see at the top of your club page."
      >
        <div className="grid sm:grid-cols-[1fr_180px] gap-3 mb-3">
          <div>
            <FieldLabel required>Name</FieldLabel>
            <TextInput
              value={form.name}
              onChange={(v) => update('name', v)}
              placeholder="Bandra Runners"
            />
          </div>
          <div>
            <FieldLabel>Established</FieldLabel>
            <TextInput
              value={form.establishedYear}
              onChange={(v) =>
                update('establishedYear', v.replace(/[^0-9]/g, ''))
              }
              placeholder="2019"
            />
          </div>
        </div>
        <div className="mb-3">
          <FieldLabel required>City</FieldLabel>
          <TextInput
            value={form.city}
            onChange={(v) => update('city', v)}
            placeholder="Mumbai"
          />
        </div>
        <div className="mb-3">
          <FieldLabel hint="One-line eyebrow above the name">Kicker</FieldLabel>
          <TextInput
            value={form.kicker}
            onChange={(v) => update('kicker', v)}
            placeholder="Bandra-based · since 2019"
          />
        </div>
        <div className="mb-3">
          <FieldLabel hint="The big quote/tagline">Subtitle</FieldLabel>
          <TextInput
            value={form.subtitle}
            onChange={(v) => update('subtitle', v)}
            placeholder="A pace for every soul."
          />
        </div>
        <div>
          <FieldLabel hint="Markdown supported on the public page">
            Description
          </FieldLabel>
          <TextArea
            rows={5}
            value={form.description}
            onChange={(v) => update('description', v)}
            placeholder="Tell folks who you are, what to expect, what makes your runs feel like home…"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Tags"
        description="Help runners discover you — comma-separated keywords."
      >
        <TextInput
          value={form.tags}
          onChange={(v) => update('tags', v)}
          placeholder="long run, tempo, beginner-friendly, coffee after"
        />
      </SectionCard>

      <SectionCard title="Visuals" description="Logo and header image.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Logo</FieldLabel>
            <ImageUploadField
              label="Logo"
              shape="square"
              value={form.logoUrl}
              onChange={(v) => update('logoUrl', v)}
              folder={`clubs/${slug}/logo`}
              hint="Square works best. Used in cards and the header."
            />
          </div>
          <div>
            <FieldLabel>Header image</FieldLabel>
            <ImageUploadField
              label="Header"
              shape="wide"
              value={form.headerImageUrl}
              onChange={(v) => update('headerImageUrl', v)}
              folder={`clubs/${slug}/header`}
              hint="Wide aspect — appears at the top of your public page."
            />
          </div>
        </div>
      </SectionCard>

    </ManageShell>
  );
}
