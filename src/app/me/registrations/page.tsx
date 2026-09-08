import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { RunnerProviders } from '@/app/running-events/[slug]/register/_components/runner-providers';
import { MyRegistrationsView } from './_my-registrations-view';

export const metadata: Metadata = {
  title: 'My events',
  robots: { index: false, follow: false },
};

export default async function MyRegistrationsPage() {
  // Single source of truth for "am I signed in": getStudioAuth() resolves the
  // marketing cookie AND, failing that, a NextAuth (Google) session. A prior
  // `getSessionToken()` pre-check here read the cookie ALONE, so anyone signed
  // in through Google got bounced to the login modal by this page while the
  // header — which does resolve both — showed them as signed in.
  const studio = await getStudioAuth();
  if (!studio) {
    redirect('/?login=1&next=%2Fme%2Fregistrations');
  }

  return (
    <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
      <Header />
      <RunnerProviders studio={studio}>
        <MyRegistrationsView />
      </RunnerProviders>
      <Footer />
    </main>
  );
}
