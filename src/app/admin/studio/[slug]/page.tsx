import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { ManageHub } from './_components/manage-hub';

export default async function StudioClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <ManageHub slug={club.slug} initialClub={club} />;
}
