import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClub } from '@/lib/admin-api';
import { ClubFormContent } from '../_components/club-form';

export default async function AdminClubEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <ClubFormContent initialClub={club} isNew={false} />;
}
