import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { RunnerProviders } from '@/app/running-events/[slug]/register/_components/runner-providers';
import { RegistrationDetailView } from './_registration-detail-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: 'Registration',
  robots: { index: false, follow: false },
};

export default async function RegistrationDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Single source of truth for "am I signed in": getStudioAuth() resolves the
  // marketing cookie AND, failing that, a NextAuth (Google) session. A prior
  // `getSessionToken()` pre-check here read the cookie ALONE, so anyone signed
  // in through Google got bounced to the login modal by this page while the
  // header — which does resolve both — showed them as signed in.
  const studio = await getStudioAuth();
  if (!studio) {
    redirect(`/?login=1&next=${encodeURIComponent(`/me/registrations/${id}`)}`);
  }

  return (
    <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
      <Header />
      <RunnerProviders studio={studio}>
        <RegistrationDetailView registrationId={id} />
      </RunnerProviders>
      <Footer />
    </main>
  );
}
