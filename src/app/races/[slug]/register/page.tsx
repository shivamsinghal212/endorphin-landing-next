import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { eventsApi, ApiError, type Event } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { getStudioAuth } from '@/lib/studio/server-auth';
import type { OrganiserEvent, RegistrationFormField } from '@/lib/organiser-api';
import { RegistrationForm } from './_components/registration-form';
import { RunnerProviders } from './_components/runner-providers';
import '../race-detail.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolve the event by slug, with a UUID fallback. Mirrors the pattern in
 * the sibling race-detail page so the registration entry-point behaves the
 * same way for transient backend errors and 404s.
 */
async function loadEvent(slug: string, token: string | null): Promise<Event | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
  try {
    return await eventsApi.getBySlug(slug, token ?? undefined);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404 && isUuid) {
      try {
        return await eventsApi.getById(slug, token ?? undefined);
      } catch (err2) {
        if (err2 instanceof ApiError && err2.status === 404) return null;
        throw err2;
      }
    }
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug, null).catch(() => null);
  const title = event ? `Register · ${event.title}` : 'Register';
  return {
    title,
    // This is a transactional flow — keep it out of the index.
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({ params }: PageProps) {
  const { slug } = await params;
  const token = await getSessionToken();
  if (!token) {
    // The marketing-site login modal returns the user here post-auth.
    const next = encodeURIComponent(`/races/${slug}/register`);
    redirect(`/?login=1&next=${next}`);
  }

  const studio = await getStudioAuth();
  if (!studio) {
    const next = encodeURIComponent(`/races/${slug}/register`);
    redirect(`/?login=1&next=${next}`);
  }

  const event = await loadEvent(slug, token);
  if (!event) notFound();

  // Only Endorfin-hosted (organizer-owned) events run through our checkout.
  // Third-party events still bounce out via their external registrationUrl
  // on the detail page, so this route should never serve them.
  if (event.eventSourceType !== 'organizer') {
    return (
      <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="font-display uppercase text-2xl md:text-3xl font-bold mb-3">
            Registration is hosted elsewhere
          </h1>
          <p className="text-sm text-jet/70 mb-6">
            This event is not run through Endorfin checkout. Use the organiser&rsquo;s
            registration link on the event page.
          </p>
          <Link
            href={`/races/${event.slug || event.id}`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90"
          >
            ← Back to event
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  // The public event payload may not (yet) include the organiser-side
  // extras (`collectTshirt`, `tshirtSizes`, `collectAddress`, `shipsMedal`,
  // `registrationForm`). When the backend surfaces them we'll read straight
  // through; for now we read defensively via an index lookup so this works
  // either way.
  type EventWithExtras = Event &
    Partial<
      Pick<
        OrganiserEvent,
        | 'collectTshirt'
        | 'tshirtSizes'
        | 'collectAddress'
        | 'shipsMedal'
        | 'registrationForm'
      >
    >;
  const extended = event as EventWithExtras;
  const extras = {
    collectTshirt: Boolean(extended.collectTshirt),
    tshirtSizes: (extended.tshirtSizes ?? null) as string[] | null,
    collectAddress: Boolean(extended.collectAddress),
    shipsMedal: Boolean(extended.shipsMedal),
    registrationForm:
      (extended.registrationForm ?? null) as RegistrationFormField[] | null,
  };

  return (
    <main id="main-content" className="overflow-x-hidden bg-bone min-h-screen text-jet">
      <Header />
      <RunnerProviders studio={studio}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <nav className="text-xs text-jet/50 mb-3">
            <Link href={`/races/${event.slug || event.id}`} className="hover:underline">
              ← {event.title}
            </Link>
          </nav>
          <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight text-jet mb-2">
            Register
          </h1>
          <p className="text-sm text-jet/60 mb-8 max-w-2xl">
            You&rsquo;re registering for <strong className="text-jet">{event.title}</strong>
            {event.locationName ? ` in ${event.locationName}` : ''}. Payment is processed
            securely via Razorpay.
          </p>
          <RegistrationForm bundle={{ event, extras }} />
        </div>
      </RunnerProviders>
      <Footer />
    </main>
  );
}
