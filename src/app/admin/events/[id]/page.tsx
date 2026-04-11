import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { EventDetailContent } from './event-detail';

export default async function AdminEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { id } = await params;
  return <EventDetailContent eventId={id} />;
}
