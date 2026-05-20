'use client';

import { SectionCard } from '@/app/admin/studio/_components/form';

export function VerificationsStub() {
  return (
    <SectionCard title="Verifications">
      <div className="text-center py-6">
        <p className="text-3xl mb-2" aria-hidden>
          ✓
        </p>
        <p className="font-display uppercase text-sm font-bold text-jet/70">
          Coming soon
        </p>
        <p className="text-xs text-jet/50 mt-2 max-w-sm mx-auto">
          A queue for run-proof submissions — review each runner's evidence,
          accept or reject in bulk, and trigger result-window notifications.
        </p>
      </div>
    </SectionCard>
  );
}
