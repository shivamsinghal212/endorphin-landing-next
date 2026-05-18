import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { EventsListContent } from './_events-list';

export default async function StudioEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <EventsListContent slug={club.slug} initialClub={club} />;
}
