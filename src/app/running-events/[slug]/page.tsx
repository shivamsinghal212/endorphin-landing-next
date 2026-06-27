import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { eventsApi, remindersApi, ApiError, type Event, type Reminder } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { getStudioAuth } from '@/lib/studio/server-auth';
import { eventPath } from '@/lib/event-path';
import { RunnerProviders } from './register/_components/runner-providers';
import ExperienceDetailView from './ExperienceDetailView';
import './experience-detail.css';
import {
  buildEventTitle,
  buildEventMetaDescription,
  buildEventNarrative,
} from '@/lib/event-seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Look up an event by slug, falling back to UUID id when the param looks
 * like one. Only returns null for genuine 404s — re-throws on transient
 * errors (5xx, network, timeout) so Next renders error.tsx instead of a
 * sticky `notFound()`.
 *
 * Retry policy: 3 attempts with exponential-ish backoff (300ms, 900ms,
 * 2100ms) — sized to absorb a Railway cold start (~3-5s warm-up) without
 * blowing past the user's patience. Network-level `TypeError: fetch
 * failed` and 5xx responses both trigger retries; only 404 short-circuits.
 */
async function loadEvent(slug: string, token: string | null): Promise<Event | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slug);
  const RETRY_DELAYS_MS = [300, 900, 2100];

  const tryFetch = async (
    fn: () => Promise<Event>,
    label: string,
  ): Promise<Event | 'not_found'> => {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return 'not_found';
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay != null) {
          console.warn(
            `[races/[slug]] ${label} attempt ${attempt + 1} failed for "${slug}", retrying in ${delay}ms:`,
            err instanceof Error ? err.message : err,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // All attempts exhausted — bubble up so Next renders error.tsx
        // (which auto-retries on user click) instead of 404'ing.
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
  if (!event) return { title: 'Event not found' };

  const url = `https://www.endorfin.run${eventPath(event)}`;
  const metaDescription = buildEventMetaDescription(event);
  return {
    title: buildEventTitle(event),
    description: metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      // Social cards read cleaner without the "| Endorfin" suffix.
      title: event.title,
      description: metaDescription,
      images: (event.coverImageUrl || event.imageUrl) ? [{ url: (event.coverImageUrl || event.imageUrl)! }] : undefined,
      siteName: 'Endorfin',
    },
  };
}

function buildJsonLd(event: Event) {
  const organizerName = event.organizerName || 'Endorfin';
  // Same factual text as the visible "About" section — never empty, so the
  // structured data always carries a real description for thin events.
  const description = buildEventNarrative(event);
  // No reliable backend signal for when registration opens — anchor 90 days
  // before the deadline (or before start, if no deadline). validThrough below
  // is the real, sourced value.
  const validFromAnchor = event.registrationEndDate || event.startTime;
  const offerValidFrom = new Date(
    new Date(validFromAnchor).getTime() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startTime,
    endDate: event.endTime || event.startTime,
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
    image: event.coverImageUrl || event.imageUrl || undefined,
    description,
    organizer: { '@type': 'Organization', name: organizerName },
    performer: { '@type': 'PerformingGroup', name: 'Event participants' },
    offers:
      event.priceMin != null
        ? {
            '@type': 'Offer',
            price: String(event.priceMin),
            priceCurrency: event.currency || 'INR',
            availability: event.soldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url: event.registrationUrl || `https://www.endorfin.run${eventPath(event)}`,
            validFrom: offerValidFrom,
            ...(event.registrationEndDate && { validThrough: event.registrationEndDate }),
          }
        : undefined,
    url: `https://www.endorfin.run${eventPath(event)}`,
  };
}

export default async function RaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const token = await getSessionToken();
  const event = await loadEvent(slug, token);
  if (!event) notFound();

  // Once the event resolves we know its id — check if the signed-in user
  // already has a reminder set so the bell renders pre-toggled. Fails
  // soft to "not set" on any error.
  let reminderIsSet = false;
  if (token) {
    try {
      const reminders: Reminder[] = await remindersApi.list(token);
      reminderIsSet = reminders.some(
        (r) => r.eventType === 'race' && r.eventId === event.id,
      );
    } catch {
      reminderIsSet = false;
    }
  }

  const jsonLd = buildJsonLd(event);
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.endorfin.run/' },
      { '@type': 'ListItem', position: 2, name: 'Running Events', item: 'https://www.endorfin.run/running-events' },
      {
        '@type': 'ListItem',
        position: 3,
        name: event.title,
        item: `https://www.endorfin.run${eventPath(event)}`,
      },
    ],
  };

  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      {/* Always wrap in RunnerProviders so ExperienceDetailView can call
       *  runner hooks (useMyRegistrations) safely. Pass studio=null for
       *  anonymous visitors; the hooks no-op via their `enabled: !!token`
       *  guard. Without this wrap, anonymous renders crashed with
       *  "No QueryClient set". */}
      <RaceDetailWithRunnerContext
        event={event}
        isAuthed={!!token}
        reminderIsSet={reminderIsSet}
      />
      <Footer />
    </main>
  );
}

/** Mounts RunnerProviders unconditionally so ExperienceDetailView can safely
 *  call runner hooks (useMyRegistrations). For anonymous visitors the
 *  studio resolves to null and hooks no-op via their `enabled: !!token`
 *  guard — no crash, no leaked queries. */
async function RaceDetailWithRunnerContext({
  event,
  isAuthed,
  reminderIsSet,
}: {
  event: Event;
  isAuthed: boolean;
  reminderIsSet: boolean;
}) {
  const studio = await getStudioAuth();
  // All event detail pages — races and experiences alike — render with the
  // experience layout (ExperienceDetailView). The two views show the same
  // event data, so we reuse the one design across both URL prefixes.
  return (
    <RunnerProviders studio={studio}>
      <ExperienceDetailView
        event={event}
        isAuthed={isAuthed}
        reminderIsSet={reminderIsSet}
      />
    </RunnerProviders>
  );
}
