import { Suspense } from 'react';
import { EventWizard } from '../../_wizard/wizard';

export const dynamic = 'force-dynamic';

export default async function EditEventWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <EventWizard mode="edit" eventId={id} />
    </Suspense>
  );
}
