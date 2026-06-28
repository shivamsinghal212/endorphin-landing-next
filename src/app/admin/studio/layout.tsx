import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { StudioAuthProvider } from '@/lib/studio/auth-context';
import { ImpersonationBanner } from './_components/impersonation';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studio = await getStudioAuth({ allowImpersonation: true });
  if (!studio) {
    // Send the user to the marketing home with the login modal open.
    // We always return them to /admin/studio (the role picker) post-sign
    // -in, which is the natural starting point for any studio task.
    redirect('/?login=1&next=%2Fadmin%2Fstudio');
  }
  return (
    <>
      <Header />
      {studio.impersonatedBy && (
        <ImpersonationBanner
          name={studio.name}
          email={studio.email}
        />
      )}
      <StudioAuthProvider value={studio}>{children}</StudioAuthProvider>
    </>
  );
}
