import { redirect } from 'next/navigation';
import { auth, isSuperAdminEmail } from '@/lib/auth';
import { DashboardContent } from '../components/dashboard-content';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect('/admin/login');

  // Non-super-admins land on their owner studio.
  if (!isSuperAdminEmail(session.user?.email)) redirect('/admin/studio');

  return <DashboardContent />;
}
