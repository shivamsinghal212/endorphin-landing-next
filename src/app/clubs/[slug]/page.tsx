import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getClub, type Club, type ClubAdminPerson } from '@/lib/admin-api';
import { clubsApi, type MyMembership } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import type { ClubEvent } from '../page';
import { ClubIcons } from './club-icons';
import { JoinClubButton } from './join-club-button';
import { RsvpButton } from './rsvp-button';
import { LastRunReel } from './last-run-reel';
import { ExpandableDescription } from './expandable-description';
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
  lastEvent: ClubEvent | null;
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
    lastEvent: past[0] || null,
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

function fmtDay(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? d.toLocaleString('en', { weekday: 'short' }) : '';
}

function fmtDayNum(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? String(d.getDate()).padStart(2, '0') : '';
}

function fmtMonth(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? d.toLocaleString('en', { month: 'short' }) : '';
}

function fmtDayDotMonth(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}·${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtTime12hFromIso(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function fmtDistance(km: number | null | undefined) {
  if (km == null) return '';
  return Number.isInteger(km) ? `${km}K` : `${km}K`;
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
  const club = await getClub(slug).catch(() => null);
  if (!club || !club.publishedAt) {
    return { title: 'Club not found', robots: { index: false, follow: false } };
  }

  const url = `https://www.endorfin.run/clubs/${club.slug}`;
  const title = `${club.name} — Running Club in ${club.city}`;

  // SEO best practice: description between 110–160 chars. Prefer the longer
  // of subtitle/description; pad with generated context if still short.
  let description = (club.description || '').trim();
  if (description.length < 80 && club.subtitle) {
    description = description
      ? `${club.subtitle} · ${description}`
      : club.subtitle.trim();
  }
  if (description.length < 110) {
    const prefix = description ? `${description} · ` : '';
    description = `${prefix}${club.name} is a running community in ${club.city}. Join Club on Endorfin.`;
  }
  if (description.length > 160) {
    description = description.slice(0, 157).trimEnd() + '…';
  }

  // `images` is deliberately omitted — Next's file convention at
  // opengraph-image.tsx auto-wires og:image + twitter:image to the
  // dynamic 1200x630 share card. Setting `images` here would override
  // that and point previews at the square logo instead.
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
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ─── page ───────────────────────────────────────────

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;
  const token = await getSessionToken();
  const [club, events, myMembership] = await Promise.all([
    getClub(slug).catch(() => null),
    getClubEvents(slug),
    token
      ? clubsApi.getMyMembership(slug, token).catch(() => null)
      : Promise.resolve(null as MyMembership | null),
  ]);
  if (!club || !club.publishedAt) notFound();

  const { nextEvent, upcomingEvents, lastEvent } = splitEvents(events);
  const isAuthed = !!token;

  return (
    <main id="main-content" className="overflow-x-hidden">
      <ClubIcons />
      <ClubJsonLd club={club} />
      <Header />
      <div className="club-page">
        <Hero
          club={club}
          isAuthed={isAuthed}
          myMembership={myMembership}
        />
        <Ribbon />
        <Stats club={club} />
        {nextEvent && (
          <NextRun
            event={nextEvent}
            slug={club.slug}
            clubName={club.name}
            joinForm={club.joinForm}
            requiresApproval={club.requiresApproval}
            isAuthed={isAuthed}
            myMembership={myMembership}
          />
        )}
        {upcomingEvents.length > 0 && (
          <Upcoming
            events={upcomingEvents}
            slug={club.slug}
            clubName={club.name}
            joinForm={club.joinForm}
            requiresApproval={club.requiresApproval}
            isAuthed={isAuthed}
            myMembership={myMembership}
          />
        )}
        {lastEvent && <LastRun event={lastEvent} />}
        {club.admins.length > 0 && <LedBy admins={club.admins} />}
        <CtaFooter club={club} />
      </div>
      <Footer />
    </main>
  );
}

// ─── JSON-LD ─────────────────────────────────────────

function ClubJsonLd({ club }: { club: Club }) {
  const url = `https://www.endorfin.run/clubs/${club.slug}`;
  const sameAs = [club.instagramUrl, club.stravaUrl, club.whatsappUrl].filter(Boolean);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    name: club.name,
    url,
    description: club.subtitle || club.description || undefined,
    sport: 'Running',
    address: {
      '@type': 'PostalAddress',
      addressLocality: club.city,
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
  if (club.stats.members) {
    data.numberOfEmployees = { '@type': 'QuantitativeValue', value: club.stats.members };
  }

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
}: {
  club: Club;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          {club.kicker && <span className="kicker">{club.kicker}</span>}
          <div className="hero-ident">
            {club.logoUrl && (
              <div className="club-logo hero-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.logoUrl} alt={`${club.name} logo`} />
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
        </div>
        <aside className="hero-right">
          {club.description && <ExpandableDescription text={club.description} />}
          <div className="hero-cta-stack">
            <JoinClubButton
              slug={club.slug}
              clubName={club.name}
              joinForm={club.joinForm}
              requiresApproval={club.requiresApproval}
              isAuthed={isAuthed}
              myMembership={myMembership}
            />
            <div className="socials-pill" aria-label="Share and follow">
              <a className="icon-dot" href={`https://www.endorfin.run/clubs/${club.slug}`} aria-label="Share">
                <svg aria-hidden="true"><use href="#i-share" /></svg>
              </a>
              {(club.whatsappUrl || club.instagramUrl || club.stravaUrl) && (
                <span className="pill-divider" aria-hidden="true" />
              )}
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
  return (
    <section className="stats" aria-label="Club stats">
      <div className="stat">
        <div className="stat-value">{s.members.toLocaleString('en-IN')}</div>
        <div className="stat-label kicker">Members</div>
      </div>
      <div className="stat">
        <div className="stat-value">{s.runsThisMonth.toLocaleString('en-IN')}</div>
        <div className="stat-label kicker">Runs this month</div>
      </div>
      <div className="stat">
        <div className="stat-value">{s.kmThisMonth.toLocaleString('en-IN')}</div>
        <div className="stat-label kicker">KM this month</div>
      </div>
      <div className="stat">
        <div className="stat-value">{s.yearsRunning.toLocaleString('en-IN')}</div>
        <div className="stat-label kicker">Years running</div>
      </div>
    </section>
  );
}

function NextRun({
  event,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: {
  event: ClubEvent;
  slug: string;
  clubName: string;
  joinForm: Club['joinForm'];
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  const bgStyle = event.coverImageUrl
    ? ({ ['--bg-image' as string]: `url('${event.coverImageUrl}')` } as React.CSSProperties)
    : undefined;
  const hasImage = !!event.coverImageUrl;
  const location = event.locationName;
  const time = fmtTime12hFromIso(event.startTime);
  const isRace = event.eventType === 'race_event';

  return (
    <section className={`next-run on-jet ${hasImage ? 'has-image' : ''}`} style={bgStyle}>
      <div className="kicker next-run-kicker" style={{ color: 'var(--text-muted)' }}>This week · Next run</div>
      <div className="next-run-grid">
        <div className="date-block">
          <div className="date-block-title">
            <div className="date-block-day">{fmtDay(event.startTime)}</div>
            <div className="date-block-date">{fmtDayDotMonth(event.startTime)}</div>
          </div>
          <div className="date-block-sub">
            {[time, location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="run-info">
          <h2 className="run-title">
            {event.title}
            {event.distanceKm != null && <> — <span className="distance">{fmtDistance(event.distanceKm)}</span></>}
          </h2>
          {event.description && <p className="run-description">{event.description}</p>}
        </div>
        <div className="next-run-cta">
          <span className="going-pill">{event.goingCount} going</span>
          {!isRace && (
            <RsvpButton
              slug={slug}
              clubName={clubName}
              eventId={event.id}
              joinForm={joinForm}
              requiresApproval={requiresApproval}
              isAuthed={isAuthed}
              myMembership={myMembership}
              variant="primary"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Upcoming({
  events,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: {
  events: ClubEvent[];
  slug: string;
  clubName: string;
  joinForm: Club['joinForm'];
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  return (
    <section className="upcoming">
      <div className="upcoming-header">
        <h2 className="upcoming-title">Upcoming</h2>
        <span className="kicker upcoming-count">{events.length} {events.length === 1 ? 'run' : 'runs'} scheduled</span>
      </div>

      {events.map((event) => (
        <UpcomingRow
          key={event.id}
          event={event}
          slug={slug}
          clubName={clubName}
          joinForm={joinForm}
          requiresApproval={requiresApproval}
          isAuthed={isAuthed}
          myMembership={myMembership}
        />
      ))}

      {events.length > 3 && (
        <div className="upcoming-more">
          <button className="btn btn-ghost" type="button">See all {events.length} runs</button>
        </div>
      )}
    </section>
  );
}

function UpcomingRow({
  event,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: {
  event: ClubEvent;
  slug: string;
  clubName: string;
  joinForm: Club['joinForm'];
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  const isRace = event.eventType === 'race_event';
  const tagLabel = isRace ? 'Race event' : 'Club run';
  const meta = [event.locationName, fmtTime12hFromIso(event.startTime)].filter(Boolean).join(' · ');

  return (
    <div className="upcoming-row">
      <div>
        <div className="row-date">{fmtDayNum(event.startTime)}</div>
        <div className="kicker row-date-sub">
          {fmtDay(event.startTime)} · {fmtMonth(event.startTime)}
        </div>
      </div>
      <div>
        <span className={`row-type ${isRace ? 'row-type-race' : 'row-type-club'}`}>{tagLabel}</span>
        <div className="row-title">{event.title}</div>
        <div className="row-meta" data-going={event.goingCount}>{meta}</div>
      </div>
      <span className="going-pill">{event.goingCount} going</span>
      <div className="row-cta">
        {isRace ? (
          <button className="btn btn-ghost" type="button">Details</button>
        ) : (
          <RsvpButton
            slug={slug}
            clubName={clubName}
            eventId={event.id}
            joinForm={joinForm}
            requiresApproval={requiresApproval}
            isAuthed={isAuthed}
            myMembership={myMembership}
          />
        )}
      </div>
    </div>
  );
}

function LastRun({ event }: { event: ClubEvent }) {
  const isRace = event.eventType === 'race_event';
  const recap = event.recap;
  const photos = recap?.photos ?? [];

  return (
    <section className="last-run">
      <div className="last-run-head">
        <div>
          <div className="kicker last-run-kicker">Last run · {fmtLastRunKickerDate(event.startTime)}</div>
          <span className={`last-run-tag ${isRace ? 'race' : ''}`}>{isRace ? 'Race event' : 'Club run'}</span>
          <h2 className="last-run-title">{event.title}</h2>
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

      {photos.length > 0 && <LastRunReel photos={photos} />}
    </section>
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

