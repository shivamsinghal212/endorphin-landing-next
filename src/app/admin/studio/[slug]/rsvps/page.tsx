import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { RsvpsContent } from './_rsvps-content';

export default async function StudioRsvpsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <RsvpsContent slug={club.slug} initialClub={club} />;
}
