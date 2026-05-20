import { Suspense } from 'react';
import { EventWizard } from '../_wizard/wizard';

export const dynamic = 'force-dynamic';

export default function NewEventWizardPage() {
  return (
    <Suspense fallback={null}>
      <EventWizard mode="new" />
    </Suspense>
  );
}
