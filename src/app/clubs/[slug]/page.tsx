import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getClub, type Club, type ClubAdminPerson } from '@/lib/admin-api';
import { clubsApi, type MyMembership } from '@/lib/api';
import { getSessionEmail, getSessionToken } from '@/lib/session';
import type { ClubEvent } from '../page';
import { ClaimClubLink } from './claim-club-link';
import { ClubIcons } from './club-icons';
import { JoinClubButton } from './join-club-button';
import { RunGallery } from './run-gallery';
import { PreviousRunsList } from './previous-runs-list';
import { ExpandableDescription } from './expandable-description';
import { NextRun } from './next-run';
import { UpcomingList } from './upcoming-list';
import './club-page.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

async function getClubEvents(slug: string): Promise<ClubEvent[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/clubs/${encodeURIComponent(slug)}/events`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as ClubEvent[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function splitEvents(events: ClubEvent[]): {
  nextEvent: ClubEvent | null;
  upcomingEvents: ClubEvent[];
  pastEvents: ClubEvent[];
} {
  const now = Date.now();
  const future: ClubEvent[] = [];
  const past: ClubEvent[] = [];
  for (const e of events) {
    const t = Date.parse(e.startTime);
    if (!Number.isFinite(t)) continue;
    if (t >= now) future.push(e);
    else past.push(e);
  }
  future.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  past.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
  const [nextEvent, ...upcomingEvents] = future;
  return {
    nextEvent: nextEvent || null,
    upcomingEvents,
    pastEvents: past,
  };
}

// Refresh the public page within 60s of any admin save.
export const revalidate = 60;

// ─── helpers ────────────────────────────────────────

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtLastRunKickerDate(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  const weekday = d.toLocaleString('en', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' });
  return `${weekday} ${day} ${month}`;
}

function getInitial(name: string) {
  return (name.trim()[0] || '?').toUpperCase();
}

// ─── metadata ───────────────────────────────────────

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [club, events] = await Promise.all([
    getClub(slug).catch(() => null),
    getClubEvents(slug),
  ]);
  if (!club || !club.publishedAt) {
    return { title: 'Club not found', robots: { index: false, follow: false } };
  }

  const url = `https://www.endorfin.run/clubs/${club.slug}`;
  const title = `${club.name} — Running Club in ${club.city}`;

  // SEO best practice: description between 110-160 chars, front-loaded
  // with city + a sub-locality so SERP previews never truncate the value
  // prop. Pull distinct sub-localities from the past-events locations and
  // fall back to the description / subtitle / generic context as needed.
  const subLocalities = uniqueNeighborhoods(events).slice(0, 2);
  const localityPhrase =
    subLocalities.length > 0
      ? `Weekend runs in ${subLocalities.join(' and ')}`
      : `Run club based out of ${club.city}`;
  const membersPhrase =
    club.stats?.members && club.stats.members >= 100
      ? `${shortNum(club.stats.members)}+ members`
      : '';

  let description = `${club.name} — ${club.city}'s run club. ${localityPhrase}.`;
  if (membersPhrase) description += ` ${membersPhrase}.`;
  if (description.length < 110 && (club.description || club.subtitle)) {
    const extra = (club.description || club.subtitle || '').trim();
    description = `${description} ${extra}`.trim();
  }
  if (description.length > 160) {
    // Trim on word boundary, preserve a clean period.
    description = description.slice(0, 157).replace(/[\s.,;]+$/, '') + '…';
  }

  // `images` is deliberately omitted — Next's file convention at
  // opengraph-image.tsx auto-wires og:image + twitter:image to the
  // dynamic 1200x630 share card. Setting `images` here would override
  // that and point previews at the square logo instead.
  return {
    title,
    description,
    keywords: club.tags && club.tags.length > 0 ? club.tags.join(', ') : undefined,
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
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// Compact numeric formatter — turns 11205 → "11k", 2350 → "2.3k", <1000 → bare.
function shortNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}

// Tier-1 Indian city → state lookup used to enrich PostalAddress
// (addressRegion) and SERP/AI locality context. Falls back to undefined
// when the city isn't known so we never emit a wrong region.
const CITY_TO_STATE: Record<string, string> = {
  Mumbai: 'Maharashtra',
  Thane: 'Maharashtra',
  'Navi Mumbai': 'Maharashtra',
  Pune: 'Maharashtra',
  Nagpur: 'Maharashtra',
  Nashik: 'Maharashtra',
  Bangalore: 'Karnataka',
  Bengaluru: 'Karnataka',
  Mysore: 'Karnataka',
  Mysuru: 'Karnataka',
  Hyderabad: 'Telangana',
  Chennai: 'Tamil Nadu',
  Coimbatore: 'Tamil Nadu',
  Delhi: 'Delhi',
  'New Delhi': 'Delhi',
  Gurgaon: 'Haryana',
  Gurugram: 'Haryana',
  Noida: 'Uttar Pradesh',
  Lucknow: 'Uttar Pradesh',
  Kolkata: 'West Bengal',
  Ahmedabad: 'Gujarat',
  Surat: 'Gujarat',
  Vadodara: 'Gujarat',
  Jaipur: 'Rajasthan',
  Jodhpur: 'Rajasthan',
  Udaipur: 'Rajasthan',
  Kochi: 'Kerala',
  Thiruvananthapuram: 'Kerala',
  Chandigarh: 'Chandigarh',
  Indore: 'Madhya Pradesh',
  Bhopal: 'Madhya Pradesh',
};

// Pull a deduped, deduped-by-primary-token list of neighborhoods/areas
// from the events list. Used for "Where we run" rendering, meta
// description and JSON-LD `areaServed` enrichment.
function uniqueNeighborhoods(events: ClubEvent[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of events) {
    const raw = (e.locationAddress || e.locationName || '').trim();
    if (!raw) continue;
    // Use the first comma segment as the canonical area label.
    const primary = raw.split(',')[0].trim();
    if (!primary) continue;
    const key = primary.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(primary);
  }
  return out;
}

// ─── page ───────────────────────────────────────────

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;
  const token = await getSessionToken();
  const [club, events, myMembership, userEmail] = await Promise.all([
    getClub(slug).catch(() => null),
    getClubEvents(slug),
    token
      ? clubsApi.getMyMembership(slug, token).catch(() => null)
      : Promise.resolve(null as MyMembership | null),
    getSessionEmail(),
  ]);
  if (!club || !club.publishedAt) notFound();

  const { nextEvent, upcomingEvents, pastEvents } = splitEvents(events);
  const isAuthed = !!token;

  // Locality + activity context derived from existing event data so we
  // can enrich every metadata surface (JSON-LD, "Where we run" section,
  // FAQ answers) without needing new backend fields.
  const futureEvents = [nextEvent, ...upcomingEvents].filter(
    Boolean,
  ) as ClubEvent[];
  const neighborhoods = uniqueNeighborhoods(pastEvents);
  const totalRunsHosted = pastEvents.length;

  return (
    <main id="main-content" className="overflow-x-hidden">
      <ClubIcons />
      <ClubJsonLd
        club={club}
        totalRunsHosted={totalRunsHosted}
        neighborhoods={neighborhoods}
      />
      <ClubBreadcrumbJsonLd club={club} />
      <ClubEventsJsonLd club={club} events={futureEvents} />
      <ClubFaqJsonLd club={club} neighborhoods={neighborhoods} />
      <Header />
      <div className="club-page">
        <Hero
          club={club}
          isAuthed={isAuthed}
          myMembership={myMembership}
          userEmail={userEmail}
        />
        <Ribbon />
        <Stats club={club} />
        <NextRun
          event={nextEvent}
          club={club}
          isAuthed={isAuthed}
          myMembership={myMembership}
        />
        {upcomingEvents.length > 0 && (
          <UpcomingList
            events={upcomingEvents}
            slug={club.slug}
            clubName={club.name}
            joinForm={club.joinForm}
            requiresApproval={club.requiresApproval}
            isAuthed={isAuthed}
            myMembership={myMembership}
          />
        )}
        {pastEvents.length > 0 && <PreviousRuns events={pastEvents} />}
        <CommentsSay events={pastEvents} />
        <BrandsStrip collaborations={club.collaborations} />
        {club.admins.length > 0 && <LedBy admins={club.admins} />}
        <CtaFooter club={club} />
      </div>
      <Footer />
    </main>
  );
}

// ─── JSON-LD ─────────────────────────────────────────

function ClubJsonLd({
  club,
  totalRunsHosted,
  neighborhoods,
}: {
  club: Club;
  totalRunsHosted: number;
  neighborhoods: string[];
}) {
  const url = `https://www.endorfin.run/clubs/${club.slug}`;
  // WhatsApp invite links are ephemeral (they rotate / expire) and carry
  // no entity-disambiguation value for the Knowledge Graph. Only
  // Instagram + Strava belong in sameAs.
  const sameAs = [club.instagramUrl, club.stravaUrl].filter(Boolean);

  // Prefer the longer description for AI/LLM citation quality; fall back
  // to the one-line subtitle only if description is empty.
  const description = (club.description || club.subtitle || '').trim() || undefined;

  const addressRegion = CITY_TO_STATE[club.city];

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    name: club.name,
    url,
    description,
    sport: 'Running',
    address: {
      '@type': 'PostalAddress',
      addressLocality: club.city,
      ...(addressRegion ? { addressRegion } : {}),
      addressCountry: 'IN',
    },
  };
  if (club.logoUrl) {
    data.logo = { '@type': 'ImageObject', url: club.logoUrl };
    data.image = club.logoUrl;
  }
  if (club.establishedYear) {
    data.foundingDate = String(club.establishedYear);
  }
  if (sameAs.length > 0) {
    data.sameAs = sameAs;
  }
  if (club.stats?.members) {
    // `numberOfMembers` is the semantically correct property for a club's
    // community size on Organization/SportsClub. `numberOfEmployees`
    // (previously used) implies paid staff and was a misuse.
    data.numberOfMembers = {
      '@type': 'QuantitativeValue',
      value: club.stats.members,
    };
  }
  if (totalRunsHosted > 0) {
    // Cumulative event count strengthens the "active entity" signal AI
    // assistants use to score citation candidates.
    data.event = {
      '@type': 'QuantitativeValue',
      value: totalRunsHosted,
      description: 'runs hosted',
    };
  }
  if (club.tags && club.tags.length > 0) {
    data.keywords = club.tags.join(', ');
  }
  if (club.admins && club.admins.length > 0) {
    const members = club.admins
      .filter((a) => a.name)
      .map((a) => {
        const member: Record<string, unknown> = {
          '@type': 'Person',
          name: a.name,
        };
        const memberSameAs = [
          a.instagramUrl,
          a.stravaUrl,
          a.whatsappUrl,
        ].filter(Boolean);
        if (memberSameAs.length > 0) member.sameAs = memberSameAs;
        if (a.role) member.jobTitle = a.role;
        return member;
      });
    if (members.length > 0) data.member = members;
  }
  // Locality coverage — surface the distinct neighborhoods this club
  // operates in via `areaServed` so map-aware AI assistants and
  // Google's Knowledge Graph see the club as locally relevant without
  // needing a visual section on the page. Cap at 8 to keep the
  // structured-data payload tight.
  if (neighborhoods.length > 0) {
    data.areaServed = neighborhoods.slice(0, 8).map((n) => ({
      '@type': 'Place',
      name: n,
      address: {
        '@type': 'PostalAddress',
        addressLocality: club.city,
        ...(addressRegion ? { addressRegion } : {}),
        addressCountry: 'IN',
      },
    }));
  }
  // Recency signals — AI assistants (Perplexity, Google AIO, Bing
  // Copilot) all rank by freshness; we already have the timestamps on
  // every Club row, so emit them.
  if (club.publishedAt) data.datePublished = club.publishedAt;
  if (club.updatedAt) data.dateModified = club.updatedAt;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// One JSON-LD block per upcoming event so each future run is eligible
// for Google's Event rich-result carousel. Past events are deliberately
// excluded — Google demotes Events whose date has passed.
function ClubEventsJsonLd({
  club,
  events,
}: {
  club: Club;
  events: ClubEvent[];
}) {
  if (events.length === 0) return null;
  const clubUrl = `https://www.endorfin.run/clubs/${club.slug}`;
  const addressRegion = CITY_TO_STATE[club.city];

  return (
    <>
      {events.map((e) => {
        // Map the API event-type taxonomy to the most specific
        // Schema.org type that's still indexable by Google:
        //   workshop → EducationEvent
        //   social   → SocialEvent
        //   anything else (run / race / meetup / cross-train) → SportsEvent
        const t = e.eventType as string;
        const schemaType =
          t === 'club_workshop'
            ? 'EducationEvent'
            : t === 'club_social'
              ? 'SocialEvent'
              : 'SportsEvent';

        const item: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': schemaType,
          name: e.title,
          startDate: e.startTime,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          organizer: {
            '@type': 'SportsClub',
            name: club.name,
            url: clubUrl,
          },
        };
        if (e.endTime) item.endDate = e.endTime;
        if (e.description) item.description = e.description;
        if (e.coverImageUrl) item.image = e.coverImageUrl;
        if (e.locationName || e.locationAddress) {
          item.location = {
            '@type': 'Place',
            name: e.locationName || e.locationAddress,
            address: {
              '@type': 'PostalAddress',
              streetAddress: e.locationAddress || undefined,
              addressLocality: club.city,
              ...(addressRegion ? { addressRegion } : {}),
              addressCountry: 'IN',
            },
          };
        }
        if (schemaType === 'SportsEvent') {
          item.sport = 'Running';
        }
        // Free events — explicit `Offer` with price 0 unlocks the
        // "Free" badge in event rich results.
        item.offers = {
          '@type': 'Offer',
          price: 0,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: clubUrl,
        };

        return (
          <script
            key={e.id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          />
        );
      })}
    </>
  );
}

// 2-3 Q&A pairs that directly answer the high-intent queries this page
// can realistically rank for. Google restricted FAQ rich results to
// gov/healthcare in Aug 2023, but AI assistants (Perplexity, ChatGPT
// Browse, Bing Copilot) still extract answers from FAQPage markup.
function ClubFaqJsonLd({
  club,
  neighborhoods,
}: {
  club: Club;
  neighborhoods: string[];
}) {
  const qas: { q: string; a: string }[] = [];

  // Where do they meet?
  const where =
    neighborhoods.length > 0
      ? `${club.name} meets at venues across ${club.city} including ${neighborhoods.slice(0, 3).join(', ')}.`
      : `${club.name} meets in and around ${club.city} for weekend community runs.`;
  qas.push({ q: `Where does ${club.name} meet?`, a: where });

  // What do they do after runs?
  if (club.postRunActivities && club.postRunActivities.length > 0) {
    qas.push({
      q: `What activities does ${club.name} organise after runs?`,
      a: `Post-run activities include ${club.postRunActivities
        .slice(0, 5)
        .join(', ')}.`,
    });
  }

  // How do I join?
  if (club.joinUrl || club.whatsappUrl || club.instagramUrl) {
    const channels: string[] = [];
    if (club.whatsappUrl) channels.push('the WhatsApp group');
    if (club.instagramUrl) channels.push('Instagram');
    if (club.joinUrl) channels.push('the sign-up form');
    qas.push({
      q: `How do I join ${club.name}?`,
      a: `Tap "Join club" on this page and you'll be connected via ${channels.join(', ')}. Most clubs are free and beginner-friendly.`,
    });
  }

  if (qas.length === 0) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qas.map((p) => ({
      '@type': 'Question',
      name: p.q,
      acceptedAnswer: { '@type': 'Answer', text: p.a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function ClubBreadcrumbJsonLd({ club }: { club: Club }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.endorfin.run/' },
      { '@type': 'ListItem', position: 2, name: 'Run Clubs', item: 'https://www.endorfin.run/clubs' },
      {
        '@type': 'ListItem',
        position: 3,
        name: club.name,
        item: `https://www.endorfin.run/clubs/${club.slug}`,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── sections ────────────────────────────────────────

function HeroName({ name, isVerified }: { name: string; isVerified: boolean }) {
  // Match the mockup: 2-word names break after word one with a trailing
  // period on word two; other lengths render single-line with period.
  // Verified tick renders inline directly after the final period.
  const clean = name.trim().replace(/\.$/, '');
  const words = clean.split(/\s+/);
  const tick = isVerified ? (
    <span className="verified-inline" aria-label="Verified club">
      <svg aria-hidden="true"><use href="#i-verified" /></svg>
    </span>
  ) : null;
  if (words.length === 2) {
    return (
      <h1 className="hero-name">
        {words[0]}
        <br />
        <span className="hero-name-lastline">{words[1]}.{tick}</span>
      </h1>
    );
  }
  // 3+ words: let the head wrap naturally at the column width; pin only
  // the final word + period + tick in a nowrap span so the tick never
  // splits from the last word.
  const head = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];
  return (
    <h1 className="hero-name">
      {head}{' '}
      <span className="hero-name-lastline">{last}.{tick}</span>
    </h1>
  );
}

function Hero({
  club,
  isAuthed,
  myMembership,
  userEmail,
}: {
  club: Club;
  isAuthed: boolean;
  myMembership: MyMembership | null;
  userEmail: string | null;
}) {
  return (
    <section className={`hero ${club.headerImageUrl ? 'has-cover' : ''}`}>
      {club.headerImageUrl && (
        <div className="hero-cover" aria-hidden="true">
          {/* Cover is the LCP element on mobile; declare intrinsic
              dimensions so the browser reserves space (kills CLS) and
              fetchpriority="high" so it doesn't queue behind other
              media. eslint-disable: external CDN, no Next/Image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={club.headerImageUrl}
            alt=""
            loading="eager"
            fetchPriority="high"
            width={1600}
            height={900}
          />
        </div>
      )}
      <div className="hero-grid">
        <div>
          {club.kicker && <span className="kicker">{club.kicker}</span>}
          <div className="hero-ident">
            {club.logoUrl && (
              <div className="club-logo hero-logo">
                {/* Fixed-size square (CSS clamps the displayed size).
                    Declaring the intrinsic dimensions kills CLS. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={club.logoUrl}
                  alt={`${club.name} logo`}
                  width={160}
                  height={160}
                />
              </div>
            )}
            <HeroName name={club.name} isVerified={club.isVerified} />
          </div>
          {club.subtitle && <p className="club-subtitle">{club.subtitle}</p>}
          {club.tags.length > 0 && (
            <div className="hero-tags">
              {club.tags.map((tag, i) => (
                <span key={tag} className={`tag ${i === 0 ? 'tag-filled' : 'tag-ghost'}`}>{tag}</span>
              ))}
            </div>
          )}
          {club.description && <ExpandableDescription text={club.description} />}
        </div>
        <aside className="hero-right">
          <div className="hero-cta-stack">
            <div className="join-pill" aria-label="Share and join">
              <div className="join-pill-icons">
                <a className="icon-dot" href={`https://www.endorfin.run/clubs/${club.slug}`} aria-label="Share">
                  <svg aria-hidden="true"><use href="#i-share" /></svg>
                </a>
                {club.whatsappUrl && (
                  <a className="icon-dot" data-brand="whatsapp" href={club.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp group">
                    <svg aria-hidden="true"><use href="#i-whatsapp" /></svg>
                  </a>
                )}
                {club.instagramUrl && (
                  <a className="icon-dot" data-brand="instagram" href={club.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg aria-hidden="true"><use href="#i-instagram" /></svg>
                  </a>
                )}
                {club.stravaUrl && (
                  <a className="icon-dot" data-brand="strava" href={club.stravaUrl} target="_blank" rel="noopener noreferrer" aria-label="Strava club">
                    <svg aria-hidden="true"><use href="#i-strava" /></svg>
                  </a>
                )}
              </div>
              <span className="join-pill-divider" aria-hidden="true" />
              <JoinClubButton
                slug={club.slug}
                clubName={club.name}
                joinForm={club.joinForm}
                requiresApproval={club.requiresApproval}
                isAuthed={isAuthed}
                myMembership={myMembership}
              />
            </div>
            {!club.isClaimed && !myMembership?.role && (
              <ClaimClubLink
                slug={club.slug}
                clubName={club.name}
                isAuthed={isAuthed}
                userEmail={userEmail}
              />
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Ribbon() {
  const words = [
    '5K', '·', '10K', '·', 'Half Marathon', '·', 'Marathon', '·', 'Ultra', '·',
    'Trail', '·', 'Run', '·', 'Discover', '·', 'Connect', '·', 'Repeat', '·',
  ];
  return (
    <section className="ribbon" aria-hidden="true">
      <div className="ribbon-track">
        {words.map((w, i) => <span key={`a-${i}`}>{w}</span>)}
        {words.map((w, i) => <span key={`b-${i}`}>{w}</span>)}
      </div>
    </section>
  );
}

function Stats({ club }: { club: Club }) {
  const s = club.stats;
  // Only render tiles whose value is meaningful (> 0). If nothing
  // qualifies, skip the entire band so we don't show an empty grid.
  const tiles = [
    { v: s.members, l: 'Members' },
    { v: s.runsThisMonth, l: 'Runs this month' },
    { v: s.kmThisMonth, l: 'KM this month' },
    { v: s.yearsRunning, l: 'Years running' },
  ].filter((t) => t.v > 0);

  if (tiles.length === 0) return null;

  return (
    <section className="stats" aria-label="Club stats">
      {tiles.map((t) => (
        <div className="stat" key={t.l}>
          <div className="stat-value">{t.v.toLocaleString('en-IN')}</div>
          <div className="stat-label kicker">{t.l}</div>
        </div>
      ))}
    </section>
  );
}

// Wrap a remote image URL in the images.weserv.nl proxy so the browser
// always gets a proper image/* response with permissive CORS headers.
// Without this, Instagram's CDN occasionally returns an HTML error page
// (expired token, geo-block, rate-limit) which trips CORB and leaves
// the avatar broken. weserv re-fetches server-side and re-emits as
// JPEG. The `default=` param renders a neutral gray placeholder if the
// upstream URL itself 404s, so the avatar circle never goes empty.
function proxyAvatar(url: string): string {
  const cleaned = url.replace(/^https?:\/\//, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}&w=80&h=80&fit=cover&output=jpg&default=eeeae3`;
}

function CommentsSay({ events }: { events: ClubEvent[] }) {
  // Pick one standout comment per event for the roller. Two-pass
  // selection so AI assistants get citable prose, not "🔥🔥":
  //   1. Prefer comments with >=20 characters of text, sorted by likes.
  //   2. Fall back to the most-liked emoji/short comment only if no
  //      substantive comment exists for that event.
  const MIN_TEXT_LEN = 20;
  const quotes: {
    text: string;
    user: string;
    from: string;
    avatar: string | null;
  }[] = [];
  for (const e of events) {
    const cs = e.topComments;
    if (!cs || cs.length === 0) continue;
    const nonEmpty = cs.filter((c) => c.text && c.text.trim().length > 0);
    if (nonEmpty.length === 0) continue;
    const substantive = nonEmpty.filter(
      (c) => (c.text || '').trim().length >= MIN_TEXT_LEN,
    );
    const pool = substantive.length > 0 ? substantive : nonEmpty;
    const top = [...pool].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
    if (!top || !top.text) continue;
    quotes.push({
      text: top.text.trim(),
      user: top.user || 'someone',
      from: e.title,
      avatar: top.userPictureUrl || null,
    });
    if (quotes.length >= 6) break;
  }
  if (quotes.length === 0) return null;

  return (
    <section className="say">
      <div className="say-head">
        <h2 className="say-title">What people are saying</h2>
      </div>
      <div className="say-window" aria-live="polite">
        <div
          className="say-track"
          // Step timing: ~2.5s per comment — quick enough to feel like
          // a live feed but slow enough to read short replies.
          style={{ animationDuration: `${quotes.length * 2.5}s` }}
        >
          {[...quotes, ...quotes].map((q, i) => (
            <div className="say-row" key={i} aria-hidden={i >= quotes.length}>
              <span className="say-row-av" aria-hidden="true">
                {/* Primary: scraped Instagram picture URL. We push every
                    avatar through the images.weserv.nl proxy so the
                    browser always sees an image/* response (Instagram's
                    raw CDN occasionally returns HTML, which trips
                    CORB). weserv's own `default=` param hands off to
                    unavatar when the IG URL itself fails. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyAvatar(
                    q.avatar ||
                      `https://unavatar.io/instagram/${encodeURIComponent(q.user)}`,
                  )}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </span>
              <div className="say-row-body">
                <p className="say-row-text">{q.text}</p>
                <div className="say-row-head">
                  <span className="say-row-who">@{q.user}</span>
                  <span className="say-row-sep" aria-hidden="true">·</span>
                  <span className="say-row-where">{q.from}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandsStrip({
  collaborations,
}: {
  collaborations: Club['collaborations'];
}) {
  if (!collaborations || collaborations.length === 0) return null;
  // De-dupe by brand name (some brands appear at multiple posts); keep the
  // most recent evidence link per brand.
  const seen = new Map<
    string,
    { name: string; role: string | null; href: string | null }
  >();
  for (const c of collaborations) {
    const key = c.brandName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      name: c.brandName,
      role: c.role,
      href: c.evidencePostUrl,
    });
  }
  const list = Array.from(seen.values());

  return (
    <section className="brands">
      <div className="brands-head">
        <h2 className="brands-title">Brand collaborations</h2>
        <span className="kicker brands-count">
          {list.length} {list.length === 1 ? 'partner' : 'partners'}
        </span>
      </div>
      <div className="brands-grid">
        {list.map((b) =>
          b.href ? (
            <a
              key={b.name}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-cell"
              title={b.role ? `${b.name} · ${b.role}` : b.name}
            >
              <div className="brand-name">{b.name}</div>
              <div className="brand-role">{b.role || 'Partner'}</div>
            </a>
          ) : (
            <div key={b.name} className="brand-cell brand-cell-static">
              <div className="brand-name">{b.name}</div>
              <div className="brand-role">{b.role || 'Partner'}</div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function PreviousRuns({ events }: { events: ClubEvent[] }) {
  const [latest, ...earlier] = events;
  return (
    <section className="previous-runs on-jet">
      <header className="previous-runs-header">
        <h2 className="previous-runs-title">Previous runs</h2>
        <span className="kicker previous-runs-count">
          {events.length} {events.length === 1 ? 'run' : 'runs'}
        </span>
      </header>
      <LatestRun event={latest} />
      {earlier.length > 0 && <PreviousRunsList events={earlier} />}
    </section>
  );
}

function LatestRun({ event }: { event: ClubEvent }) {
  const isRace = event.eventType === 'race_event';
  const recap = event.recap;
  const photos = recap?.photos ?? [];
  const videos = recap?.videos ?? [];

  return (
    <article className="latest-run">
      <div className="last-run-head">
        <div>
          <div className="kicker last-run-kicker">Latest · {fmtLastRunKickerDate(event.startTime)}</div>
          <span className={`last-run-tag ${isRace ? 'race' : ''}`}>{isRace ? 'Race event' : 'Club run'}</span>
          <h3 className="last-run-title">{event.title}</h3>
          {recap?.summary && <p className="last-run-summary">{recap.summary}</p>}
        </div>
        <div className="last-run-meta" aria-label="Run summary">
          {recap?.showedUp != null && (
            <div className="row">
              <span className="row-label">Showed up</span>
              <span className="row-value">{recap.showedUp}</span>
            </div>
          )}
          {event.distanceKm != null && (
            <div className="row">
              <span className="row-label">Distance</span>
              <span className="row-value">{event.distanceKm}<span className="unit">km</span></span>
            </div>
          )}
          {recap?.paceGroups && (
            <div className="row">
              <span className="row-label">Pace</span>
              <span className="row-value">{recap.paceGroups}</span>
            </div>
          )}
          {recap?.after && (
            <div className="row">
              <span className="row-label">After</span>
              <span className="row-value">{recap.after}</span>
            </div>
          )}
        </div>
      </div>

      {(photos.length > 0 || videos.length > 0) && (
        <RunGallery photos={photos} videos={videos} />
      )}
    </article>
  );
}

function LedBy({ admins }: { admins: ClubAdminPerson[] }) {
  return (
    <section className="led-by">
      <div className="kicker led-by-kicker">Led by</div>
      <div className="admins-grid">
        {admins.map((admin, i) => <AdminCard key={i} admin={admin} index={i} />)}
      </div>
    </section>
  );
}

function AdminCard({ admin, index }: { admin: ClubAdminPerson; index: number }) {
  const anySocial = !!(admin.whatsappUrl || admin.instagramUrl || admin.stravaUrl);
  const initialClass = index % 2 === 0 ? 'initial-jet' : 'initial-red';
  const avatarStyle = admin.avatarUrl ? { backgroundImage: `url('${admin.avatarUrl}')` } : undefined;

  return (
    <div className={`admin-card ${anySocial ? 'clickable' : ''}`}>
      <div
        className={`admin-avatar ${admin.avatarUrl ? '' : initialClass}`}
        style={avatarStyle}
      >
        {admin.avatarUrl ? '' : getInitial(admin.name)}
      </div>
      <div className="admin-info">
        <div className="admin-name">{admin.name}</div>
        {admin.role && <div className="kicker admin-role">{admin.role}</div>}
      </div>
      <div className="admin-socials">
        {admin.whatsappUrl && (
          <a className="icon-btn sm" data-brand="whatsapp" href={admin.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`${admin.name} on WhatsApp`}>
            <svg aria-hidden="true"><use href="#i-whatsapp" /></svg>
          </a>
        )}
        {admin.instagramUrl && (
          <a className="icon-btn sm" data-brand="instagram" href={admin.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${admin.name} on Instagram`}>
            <svg aria-hidden="true"><use href="#i-instagram" /></svg>
          </a>
        )}
        {admin.stravaUrl && (
          <a className="icon-btn sm" data-brand="strava" href={admin.stravaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${admin.name} on Strava`}>
            <svg aria-hidden="true"><use href="#i-strava" /></svg>
          </a>
        )}
      </div>
    </div>
  );
}

function CtaFooter({ club }: { club: Club }) {
  return (
    <section className="cta-footer">
      <div className="cta-grid">
        <div>
          <h2 className="cta-heading">
            Get run reminders.<br />
            <span className="accent">Join the club.</span>
          </h2>
          <p className="cta-sub">Install Endorfin to RSVP to {club.name} runs, get reminders, and track your training.</p>
        </div>
        <div className="cta-buttons">
          <a className="btn btn-ghost-light" href="https://apps.apple.com/app/endorfin/id6762107286" target="_blank" rel="noopener noreferrer" aria-label="Download Endorfin on the App Store">
            <svg className="btn-icon" aria-hidden="true"><use href="#i-apple" /></svg>
            App Store
          </a>
          <a className="btn btn-primary" href="https://play.google.com/store/apps/details?id=com.endorfin.app" target="_blank" rel="noopener noreferrer" aria-label="Get Endorfin on Google Play">
            <svg className="btn-icon" aria-hidden="true"><use href="#i-google-play" /></svg>
            Google Play
          </a>
        </div>
      </div>
    </section>
  );
}

