import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { CoachesContent } from './_coaches-content';

export default async function StudioCoachesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <CoachesContent slug={club.slug} initialClub={club} />;
}
