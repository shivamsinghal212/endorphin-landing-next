import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { EventEditor } from './_event-editor';

export default async function StudioEventEditPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return (
    <EventEditor
      slug={club.slug}
      clubName={club.name}
      eventId={eventId === 'new' ? null : eventId}
    />
  );
}
