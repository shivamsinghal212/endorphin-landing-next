import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';
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
import '../../club-page.css';
import './event-detail.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const SITE = 'https://www.endorfin.run';
const TZ = 'Asia/Kolkata';

interface PageProps {
  params: Promise<{ slug: string; eventSlug: string }>;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  club_run: 'Run',
  club_race: 'Race',
  club_workshop: 'Workshop',
  club_social: 'Social',
  club_meetup: 'Meetup',
  club_cross_train: 'Cross-train',
  race_event: 'Race',
};

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
  const typeLabel = EVENT_TYPE_LABEL[event.eventType as string] || 'Run';
  const titleClean = event.title.trim().replace(/[.!?…]+$/, '');
  const dateLabel = fmtDate(event.startTime);
  const timeLabel = fmtTime(event.startTime);
  const shareDateLabel = [dateLabel, timeLabel].filter(Boolean).join(' · ');
  const url = canonicalUrl(club.slug, event);
  const kicker = [club.name, typeLabel].filter(Boolean).join(' · ');

  const hasImage = !!event.coverImageUrl;
  const fgStyle: CSSProperties | undefined = hasImage
    ? ({ ['--nr-flyer' as string]: `url('${event.coverImageUrl}')` } as CSSProperties)
    : undefined;

  return (
    <main id="main-content" className="overflow-x-hidden">
      <EventJsonLd club={club} event={event} />
      <Header />

      <div className="club-page">
        <div className="cep-top">
          <Link href={`/clubs/${club.slug}`} className="cep-back">
            ← {club.name}
          </Link>
        </div>

        <section className="nr-section" aria-label={event.title}>
          <div className="nr-inner">
            {hasImage ? (
              <div className="nr-photo" style={fgStyle}>
                <div className="nr-photo-bg" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="nr-photo-img"
                  src={event.coverImageUrl as string}
                  alt={event.title}
                  width={1200}
                  height={1500}
                />
                <div className="nr-photo-scrim" aria-hidden="true" />
                <span className="nr-photo-tag">{typeLabel}</span>
              </div>
            ) : (
              <div className="nr-empty">
                <div className="nr-empty-date" aria-hidden="true">
                  <span className="nr-empty-weekday">
                    {fmtIn(event.startTime, { weekday: 'short' })}
                  </span>
                  <span className="nr-empty-num">
                    {fmtIn(event.startTime, { day: 'numeric' })}
                  </span>
                  <span className="nr-empty-month">
                    {fmtIn(event.startTime, { month: 'long' })}
                  </span>
                </div>
                <span className="nr-empty-stencil">
                  {[event.locationName, timeLabel].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            <div className="nr-content">
              <div className="nr-content-top">
                <span className="nr-kicker">{kicker}</span>
                <h1 className="nr-title">{titleClean}</h1>
                {event.description && (
                  <p className="nr-summary">{event.description}</p>
                )}
              </div>

              <dl className="nr-meta">
                <div>
                  <dt>Date</dt>
                  <dd>{dateLabel || '—'}</dd>
                </div>
                <div>
                  <dt>Start</dt>
                  <dd>{timeLabel || '—'}</dd>
                </div>
                <div>
                  <dt>Where</dt>
                  <dd>{event.locationName || '—'}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{event.distanceKm != null ? `${event.distanceKm}K` : '—'}</dd>
                </div>
              </dl>

              <div className="nr-cta cep-cta">
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
                  <span className="nr-going">
                    <strong>{event.goingCount}</strong> going
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {event.locationAddress && (
          <section className="cep-extra" aria-label="Location">
            <p className="cep-extra-label">Address</p>
            <p className="cep-extra-body">{event.locationAddress}</p>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
