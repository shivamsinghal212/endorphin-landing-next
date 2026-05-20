import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSessionToken } from '@/lib/session';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { RunnerProviders } from '../_components/runner-providers';
import { SuccessView } from './_success-view';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}

export const metadata: Metadata = {
  title: 'Registration complete',
  robots: { index: false, follow: false },
};

export default async function SuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { id } = await searchParams;

  if (!id) {
    redirect(`/races/${encodeURIComponent(slug)}`);
  }

  const token = await getSessionToken();
  if (!token) {
    const next = encodeURIComponent(`/races/${slug}/register/success?id=${id}`);
    redirect(`/?login=1&next=${next}`);
  }
  const studio = await getStudioAuth();
  if (!studio) {
    const next = encodeURIComponent(`/races/${slug}/register/success?id=${id}`);
    redirect(`/?login=1&next=${next}`);
  }

  return (
    <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
      <Header />
      <RunnerProviders studio={studio}>
        <SuccessView registrationId={id} slug={slug} />
      </RunnerProviders>
      <Footer />
    </main>
  );
}
