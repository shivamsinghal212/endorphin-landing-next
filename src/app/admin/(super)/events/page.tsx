import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { EventsTable } from './events-table';

export default async function AdminEvents() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <EventsTable />;
}
