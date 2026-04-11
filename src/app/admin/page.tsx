import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardContent } from './components/dashboard-content';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect('/admin/login');

  return <DashboardContent />;
}
