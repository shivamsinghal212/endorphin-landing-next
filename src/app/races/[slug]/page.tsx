import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { eventsApi, ApiError, type Event } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import RaceDetailView from './RaceDetailView';
import './race-detail.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Look up an event by slug, falling back to UUID id when the param looks
 * like one. Only returns null for genuine 404s — re-throws on transient
 * errors (5xx, network, timeout) so Next renders error.tsx instead of a
 * sticky `notFound()`. One quick retry per backend call to absorb cold-
 * start blips on Railway.
 */
async function loadEvent(slug: string, token: string | null): Promise<Event | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slug);

  const tryFetch = async (
    fn: () => Promise<Event>,
    label: string,
  ): Promise<Event | 'not_found'> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return 'not_found';
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        // Final attempt failed for a non-404 reason — bubble up so Next
        // renders error.tsx (which auto-retries) instead of 404'ing.
        console.error(`[races/[slug]] ${label} failed for "${slug}":`, err);
        throw err;
      }
    }
    return 'not_found';
  };

  const slugResult = await tryFetch(
    () => eventsApi.getBySlug(slug, token ?? undefined),
    'getBySlug',
  );
  if (slugResult !== 'not_found') return slugResult;

  if (isUuid) {
    const idResult = await tryFetch(
      () => eventsApi.getById(slug, token ?? undefined),
      'getById',
    );
    if (idResult !== 'not_found') return idResult;
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // Metadata can fail soft — we don't want bad SEO copy to crash render.
  const event = await loadEvent(slug, null).catch(() => null);
  if (!event) return { title: 'Race not found — Endorfin' };

  const url = `https://www.endorfin.run/races/${event.slug || event.id}`;
  return {
    title: `${event.title} — Endorfin`,
    description: event.description?.slice(0, 200) || `Register for ${event.title} on Endorfin.`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: event.title,
      description: event.description?.slice(0, 200) || undefined,
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
      siteName: 'Endorfin',
    },
  };
}

function buildJsonLd(event: Event) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startTime,
    endDate: event.endTime || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      event.eventType === 'virtual'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venueName || event.locationName || 'India',
      address: event.locationAddress
        ? { '@type': 'PostalAddress', streetAddress: event.locationAddress, addressCountry: 'IN' }
        : { '@type': 'PostalAddress', addressLocality: event.locationName || undefined, addressCountry: 'IN' },
    },
    image: event.imageUrl || undefined,
    description: event.description || undefined,
    organizer: event.organizerName
      ? { '@type': 'Organization', name: event.organizerName }
      : undefined,
    offers:
      event.priceMin != null
        ? {
            '@type': 'Offer',
            price: String(event.priceMin),
            priceCurrency: event.currency || 'INR',
            availability: event.soldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url: event.registrationUrl || `https://www.endorfin.run/races/${event.slug || event.id}`,
          }
        : undefined,
    url: `https://www.endorfin.run/races/${event.slug || event.id}`,
  };
}

export default async function RaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const token = await getSessionToken();
  const event = await loadEvent(slug, token);
  if (!event) notFound();

  const jsonLd = buildJsonLd(event);

  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      <RaceDetailView event={event} />
      <Footer />
    </main>
  );
}
