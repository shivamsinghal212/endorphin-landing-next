'use client';

import { SectionCard } from '@/app/admin/studio/_components/form';

export function SettingsStub() {
  return (
    <SectionCard title="Settings">
      <div className="text-center py-6">
        <p className="text-3xl mb-2" aria-hidden>
          ⚙
        </p>
        <p className="font-display uppercase text-sm font-bold text-jet/70">
          Coming soon
        </p>
        <p className="text-xs text-jet/50 mt-2 max-w-sm mx-auto">
          Operational toggles for this event — close registrations early,
          duplicate as a template, archive, or hand the event off to a co-organiser.
        </p>
      </div>
    </SectionCard>
  );
}
