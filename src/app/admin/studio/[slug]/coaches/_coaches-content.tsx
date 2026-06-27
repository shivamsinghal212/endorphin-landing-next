'use client';

import type { Club } from '@/lib/admin-api';
import { ManageShell } from '../_components/manage-shell';
import { SectionCard } from '../../_components/form';
import { CoachesEditor } from '../../../(super)/clubs/_components/coaches-editor';

export function CoachesContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="Coaches"
    >
      <SectionCard
        title="Coaches & trainers"
        description="Curated coach profiles shown on your public club page. Add photos, specialisations and an Instagram link. The first photo is the card cover."
      >
        <CoachesEditor slug={slug} initial={initialClub.coaches ?? []} />
      </SectionCard>
    </ManageShell>
  );
}
