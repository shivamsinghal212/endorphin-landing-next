import { Toaster } from 'sonner';
import Header from '@/components/Header';
import AdminSessionProvider from '../admin/components/session-provider';
import { StudioQueryProvider } from '../admin/components/query-provider';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { StudioAuthProvider } from '@/lib/studio/auth-context';

/** Public composer shell.
 *
 *  Mirrors the studio layout's providers with one deliberate difference:
 *  **no redirect when `studio` is null.** Anyone can open /create and build
 *  the whole event; sign-in is asked for at the moment they commit it, not
 *  on the way in. `StudioAuthProvider` accepts null, so `useAdminToken()`
 *  simply resolves to null for anonymous visitors and the composer keeps
 *  its draft in localStorage until there's somewhere to send it.
 */
export default async function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studio = await getStudioAuth({ allowImpersonation: true });
  return (
    <AdminSessionProvider>
      <StudioQueryProvider>
        <StudioAuthProvider value={studio}>
          <Header />
          {/* `admin-theme` flips the light palette + cancels the marketing
              site's global cream body text (see globals.css). The ground is
              #F8F6F3 to match /admin — signed in, this is a studio surface,
              and bone (#F5F0EB) read as a different app. */}
          <div className="admin-theme min-h-screen bg-[#F8F6F3] text-jet">
            {children}
          </div>
        </StudioAuthProvider>
        <Toaster
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-poppins), sans-serif',
              borderRadius: '12px',
            },
          }}
        />
      </StudioQueryProvider>
    </AdminSessionProvider>
  );
}
