import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ClubFormContent } from '../_components/club-form';

export default async function AdminClubNewPage() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <ClubFormContent initialClub={null} isNew />;
}
