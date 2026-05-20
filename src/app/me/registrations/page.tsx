import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSessionToken } from '@/lib/session';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { RunnerProviders } from '@/app/running-events/[slug]/register/_components/runner-providers';
import { MyRegistrationsView } from './_my-registrations-view';

export const metadata: Metadata = {
  title: 'My events',
  robots: { index: false, follow: false },
};

export default async function MyRegistrationsPage() {
  const token = await getSessionToken();
  if (!token) {
    redirect('/?login=1&next=%2Fme%2Fregistrations');
  }
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
