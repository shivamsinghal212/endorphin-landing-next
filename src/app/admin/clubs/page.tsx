import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ClubsListContent } from './_components/clubs-list';

export default async function AdminClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  // Backwards-compat: old links used /admin/clubs?slug=… for the editor.
  const { slug } = await searchParams;
  if (slug) redirect(`/admin/clubs/${encodeURIComponent(slug)}`);

  return <ClubsListContent />;
}
