import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClub } from '@/lib/admin-api';
import { EventsListContent } from './_events-list';

export default async function AdminClubEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <EventsListContent slug={club.slug} clubName={club.name} />;
}
