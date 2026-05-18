import { redirect } from 'next/navigation';
import { auth, isSuperAdminEmail } from '@/lib/auth';
import { AdminSidebar } from '../components/sidebar';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  if (!isSuperAdminEmail(session.user?.email)) redirect('/admin/studio');

  return (
    <div className="flex">
      <AdminSidebar user={session.user!} />
      <main className="flex-1 min-h-screen ml-0 md:ml-64">
        <div className="p-6 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
