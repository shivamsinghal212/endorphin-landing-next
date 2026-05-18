import { Toaster } from 'sonner';
import AdminSessionProvider from './components/session-provider';
import { StudioQueryProvider } from './components/query-provider';

export const metadata = { title: 'Admin | Endorfin', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <StudioQueryProvider>
        {/* text-jet here cancels the global body `text-bone` set in
            globals.css for the marketing site. Without this, any element
            without an explicit text color renders cream-on-cream. */}
        <div className="min-h-screen bg-[#F8F6F3] text-jet">
          {children}
        </div>
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
