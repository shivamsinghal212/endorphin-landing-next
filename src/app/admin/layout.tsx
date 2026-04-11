import { auth } from '@/lib/auth';
import { AdminSidebar } from './components/sidebar';
import AdminSessionProvider from './components/session-provider';

export const metadata = { title: 'Admin | Endorfin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <AdminSessionProvider>
      <div className="min-h-screen bg-[#F8F6F3]">
        {session ? (
          <div className="flex">
            <AdminSidebar user={session.user!} />
            <main className="flex-1 min-h-screen ml-0 md:ml-64">
              <div className="p-6 md:p-8 max-w-7xl">{children}</div>
            </main>
          </div>
        ) : (
          children
        )}
      </div>
    </AdminSessionProvider>
  );
}
