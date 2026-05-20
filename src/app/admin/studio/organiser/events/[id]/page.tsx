import { EventShell } from './_components/event-shell';

export const metadata = {
  title: 'Manage event | Endorfin Studio',
  robots: { index: false, follow: false },
};

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventShell eventId={id} />;
}
