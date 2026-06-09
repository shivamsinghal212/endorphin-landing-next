import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { CollaborationsContent } from './_collaborations-content';

export default async function StudioCollaborationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <CollaborationsContent slug={club.slug} initialClub={club} />;
}
