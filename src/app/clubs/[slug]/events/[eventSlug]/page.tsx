import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReminderButton } from '@/components/ReminderButton';
import ShareEventButton from '@/components/ShareEventButton';
import { getClub, type Club } from '@/lib/admin-api';
import { clubsApi, remindersApi, type MyMembership, type Reminder } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import type { ClubEvent } from '../../../page';
import { RsvpButton } from '../../rsvp-button';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const SITE = 'https://www.endorfin.run';
const TZ = 'Asia/Kolkata';

interface PageProps {
  params: Promise<{ slug: string; eventSlug: string }>;
}

/**
 * Fetch a single club event by slug (or UUID) from the public endpoint.
 * One quiet retry absorbs a Railway cold start; any other failure resolves
 * to null so the page 404s rather than throwing.
 */
async function fetchClubEvent(
  slug: string,
  eventIdent: string,
): Promise<ClubEvent | null> {
  const url = `${API_BASE}/api/v1/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventIdent)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`status ${res.status}`);
      return (await res.json()) as ClubEvent;
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      console.error(`[club-event] fetch failed for ${slug}/${eventIdent}:`, err);
      return null;
    }
  }
  return null;
}

function fmtIn(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(d);
}

const fmtDate = (iso: string | null | undefined) =>
  fmtIn(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso: string | null | undefined) =>
  fmtIn(iso, { hour: 'numeric', minute: '2-digit', hour12: true });

function canonicalUrl(clubSlug: string, event: ClubEvent): string {
  return `${SITE}/clubs/${clubSlug}/events/${event.slug || event.id}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, eventSlug } = await params;
  const [club, event] = await Promise.all([
    getClub(slug).catch(() => null),
    fetchClubEvent(slug, eventSlug),
  ]);
  if (!club || !event) {
    return { title: 'Event not found', robots: { index: false, follow: false } };
  }

  const url = canonicalUrl(club.slug, event);
  const dateLabel = fmtDate(event.startTime);
  const timeLabel = fmtTime(event.startTime);
  const where = event.locationName || club.city;
  const title = `${event.title} — ${club.name}`;
  const description =
    (event.description?.trim().slice(0, 155) ||
      `Join ${club.name} for ${event.title} on ${dateLabel}${timeLabel ? `, ${timeLabel}` : ''}${where ? ` in ${where}` : ''}. RSVP free on Endorfin.`).trim();

  // og:image / twitter:image are auto-wired by the sibling opengraph-image.tsx.
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Endorfin',
      locale: 'en_IN',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function EventJsonLd({ club, event }: { club: Club; event: ClubEvent }) {
  const url = canonicalUrl(club.slug, event);
  const t = event.eventType as string;
  const schemaType =
    t === 'club_workshop'
      ? 'EducationEvent'
      : t === 'club_social'
        ? 'SocialEvent'
        : 'SportsEvent';

  const item: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: event.title,
    startDate: event.startTime,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    organizer: { '@type': 'SportsClub', name: club.name, url: `${SITE}/clubs/${club.slug}` },
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url,
    },
  };
  if (event.endTime) item.endDate = event.endTime;
  if (event.description) item.description = event.description;
  if (event.coverImageUrl) item.image = event.coverImageUrl;
  if (schemaType === 'SportsEvent') item.sport = 'Running';
  if (event.locationName || event.locationAddress) {
    item.location = {
      '@type': 'Place',
      name: event.locationName || event.locationAddress,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.locationAddress || undefined,
        addressLocality: club.city,
        addressCountry: 'IN',
      },
    };
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Clubs', item: `${SITE}/clubs` },
      { '@type': 'ListItem', position: 3, name: club.name, item: `${SITE}/clubs/${club.slug}` },
      { '@type': 'ListItem', position: 4, name: event.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }}
      />
    </>
  );
}

export default async function ClubEventPage({ params }: PageProps) {
  const { slug, eventSlug } = await params;
  const token = await getSessionToken();

  const [club, event, myMembership, myReminders] = await Promise.all([
    getClub(slug).catch(() => null),
    fetchClubEvent(slug, eventSlug),
    token
      ? clubsApi.getMyMembership(slug, token).catch(() => null)
      : Promise.resolve(null as MyMembership | null),
    token
      ? remindersApi.list(token).catch(() => [] as Reminder[])
      : Promise.resolve([] as Reminder[]),
  ]);

  if (!club || !club.publishedAt || !event) notFound();

  const isAuthed = !!token;
  const reminderIsSet = myReminders.some(
    (r) => r.eventType === 'club_event' && r.eventId === event.id,
  );
  const isRace = event.eventType === 'race_event';
  const dateLabel = fmtDate(event.startTime);
  const timeLabel = fmtTime(event.startTime);
  const shareDateLabel = [dateLabel, timeLabel].filter(Boolean).join(' · ');
  const url = canonicalUrl(club.slug, event);

  return (
    <main id="main-content" className="overflow-x-hidden">
      <EventJsonLd club={club} event={event} />
      <Header />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        {/* Breadcrumb / back to club */}
        <nav className="mb-6 text-sm text-jet/50">
          <Link href={`/clubs/${club.slug}`} className="hover:text-jet underline-offset-2 hover:underline">
            ← {club.name}
          </Link>
        </nav>

        {event.coverImageUrl && (
          <div className="mb-7 overflow-hidden rounded-2xl border border-jet/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.coverImageUrl}
              alt={event.title}
              width={1200}
              height={900}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <p className="text-[11px] uppercase tracking-widest text-signal font-medium mb-3">
          {[club.name, isRace ? 'Race' : 'Run'].filter(Boolean).join(' · ')}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-jet leading-tight">
          {event.title}
        </h1>

        {/* Key facts */}
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-3 border-y border-jet/10 py-5">
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-jet/45">Date</dt>
            <dd className="mt-1 text-sm font-medium text-jet">{dateLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-jet/45">Start</dt>
            <dd className="mt-1 text-sm font-medium text-jet">{timeLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-jet/45">Where</dt>
            <dd className="mt-1 text-sm font-medium text-jet">{event.locationName || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-jet/45">Distance</dt>
            <dd className="mt-1 text-sm font-medium text-jet">
              {event.distanceKm != null ? `${event.distanceKm}K` : '—'}
            </dd>
          </div>
        </dl>

        {/* CTA row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isRace && (
            <RsvpButton
              slug={club.slug}
              clubName={club.name}
              eventId={event.id}
              joinForm={club.joinForm}
              requiresApproval={club.requiresApproval}
              isAuthed={isAuthed}
              myMembership={myMembership}
              variant="primary"
            />
          )}
          <ReminderButton
            eventType="club_event"
            eventId={event.id}
            eventStartTime={event.startTime}
            eventTitle={event.title}
            initialIsSet={reminderIsSet}
            isAuthed={isAuthed}
          />
          <ShareEventButton
            url={url}
            title={event.title}
            dateLabel={shareDateLabel}
            locationLabel={event.locationName}
            clubName={club.name}
            eventSlug={event.slug || event.id}
            source="event_page"
          />
          {event.goingCount > 0 && (
            <span className="text-sm text-jet/55">
              <strong className="text-jet">{event.goingCount}</strong> going
            </span>
          )}
        </div>

        {event.description && (
          <div className="mt-9 text-[15px] leading-relaxed text-jet/80 whitespace-pre-line">
            {event.description}
          </div>
        )}

        {event.locationAddress && (
          <p className="mt-6 text-sm text-jet/55">
            <span className="text-[10px] uppercase tracking-widest text-jet/45 block mb-1">
              Address
            </span>
            {event.locationAddress}
          </p>
        )}
      </article>

      <Footer />
    </main>
  );
}
