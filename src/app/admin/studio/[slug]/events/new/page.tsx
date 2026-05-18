import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { EventEditor } from '../[eventId]/_event-editor';

export default async function StudioNewEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <EventEditor slug={club.slug} clubName={club.name} eventId={null} />;
}
