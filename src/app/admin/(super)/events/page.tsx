import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { EventsTable } from './events-table';
import { PendingEventsSection } from './pending-events';

export default async function AdminEvents() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return (
    <>
      <PendingEventsSection />
      <EventsTable />
    </>
  );
}
