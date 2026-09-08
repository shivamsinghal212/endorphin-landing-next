import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { RunnerProviders } from '../_components/runner-providers';
import { SuccessView } from './_success-view';
import { BookingSuccessView } from './_booking-success-view';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string; booking?: string }>;
}

export const metadata: Metadata = {
  title: 'Registration complete',
  robots: { index: false, follow: false },
};

export default async function SuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { id, booking } = await searchParams;

  if (!id && !booking) {
    redirect(`/running-events/${encodeURIComponent(slug)}`);
  }

  const query = booking
    ? `booking=${encodeURIComponent(booking)}`
    : `id=${encodeURIComponent(id!)}`;

  // Single source of truth for "am I signed in": getStudioAuth() resolves the
  // marketing cookie AND, failing that, a NextAuth (Google) session. A prior
  // `getSessionToken()` pre-check here read the cookie ALONE, so anyone signed
  // in through Google got bounced to the login modal by this page while the
  // header — which does resolve both — showed them as signed in.
  const studio = await getStudioAuth();
  if (!studio) {
    const next = encodeURIComponent(`/running-events/${slug}/register/success?${query}`);
    redirect(`/?login=1&next=${next}`);
  }

  return (
    <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
      <Header />
      <RunnerProviders studio={studio}>
        {booking ? (
          <BookingSuccessView bookingId={booking} slug={slug} />
        ) : (
          <SuccessView registrationId={id!} slug={slug} />
        )}
      </RunnerProviders>
      <Footer />
    </main>
  );
}
