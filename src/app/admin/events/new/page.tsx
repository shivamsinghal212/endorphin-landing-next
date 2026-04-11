import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CreateEventContent } from './create-event';

export default async function AdminCreateEvent() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <CreateEventContent />;
}
