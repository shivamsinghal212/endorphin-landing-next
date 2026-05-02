import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClub } from '@/lib/admin-api';
import { EventEditClient } from './_event-edit-client';

export default async function AdminClubEventEditPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { slug, eventId } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <EventEditClient slug={club.slug} eventId={eventId} />;
}
