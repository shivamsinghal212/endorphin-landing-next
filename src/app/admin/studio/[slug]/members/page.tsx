import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { MembersContent } from './_members-content';

export default async function StudioMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <MembersContent slug={club.slug} initialClub={club} />;
}
