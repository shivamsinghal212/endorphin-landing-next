'use client';

import { SectionCard } from '@/app/admin/studio/_components/form';

export function CommunicationsStub() {
  return (
    <SectionCard title="Communications">
      <div className="text-center py-6">
        <p className="text-3xl mb-2" aria-hidden>
          ✉
        </p>
        <p className="font-display uppercase text-sm font-bold text-jet/70">
          Coming soon
        </p>
        <p className="text-xs text-jet/50 mt-2 max-w-sm mx-auto">
          Broadcast updates to registered runners by distance or status —
          confirmation emails, race-day briefings, and post-event recaps.
        </p>
      </div>
    </SectionCard>
  );
}
