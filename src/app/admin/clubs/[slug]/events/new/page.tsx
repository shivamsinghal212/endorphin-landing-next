import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClub } from '@/lib/admin-api';
import { EventFormContent } from '../_event-form';

export default async function AdminClubEventNewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <EventFormContent slug={club.slug} initialEvent={null} isNew />;
}
