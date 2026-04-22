import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ClubsAdminContent } from './clubs-form';

export default async function AdminClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const { slug } = await searchParams;
  return <ClubsAdminContent initialSlug={slug ?? ''} />;
}
