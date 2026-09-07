import { Toaster } from 'sonner';
import Header from '@/components/Header';
import AdminSessionProvider from '../admin/components/session-provider';
import { StudioQueryProvider } from '../admin/components/query-provider';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { StudioAuthProvider } from '@/lib/studio/auth-context';
import CreateModalShell from './_modal-shell';

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
          {/* Dark, like the rest of the site. This used to carry
              `admin-theme` + #F8F6F3 to match /admin, on the reasoning that
              a signed-in visitor is on a studio surface — but /create is
              reached from the marketing site, and a white sheet dropped into
              a black page read as a different product. The studio pages keep
              their light theme; only this public composer is dark.
              On desktop CreateModalShell lifts it into a centred modal, so
              the page background drops out there and the card carries the
              surface instead. */}
          {/* color-scheme:dark makes the browser paint its own controls dark —
              without it the datetime-local calendar glyph and picker render
              near-black on our near-black field and vanish. */}
          <div
            className="cx-root relative min-h-screen bg-[#0C0B10] text-bone"
            style={{ colorScheme: 'dark' }}
          >
            <CreateModalShell>{children}</CreateModalShell>
          </div>
        </StudioAuthProvider>
        <Toaster
          position="bottom-right"
          theme="dark"
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
