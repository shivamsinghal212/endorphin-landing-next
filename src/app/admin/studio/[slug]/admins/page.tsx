import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { AdminsContent } from './_admins-content';

export default async function StudioAdminsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <AdminsContent slug={club.slug} initialClub={club} />;
}
