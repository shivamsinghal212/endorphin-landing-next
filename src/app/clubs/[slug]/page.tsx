import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import { getClub, type Club, type ClubUpcomingRun, type ClubAdminPerson } from '@/lib/admin-api';
import { ClubIcons } from './club-icons';
import { LastRunReel } from './last-run-reel';
import './club-page.css';

// Fraunces loaded only on the club page — keeps it off the rest of the app.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

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

function fmtTime12h(hhmm: string | null | undefined) {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  if (!Number.isFinite(h)) return hhmm;
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
  const description =
    club.subtitle ||
    club.description ||
    `${club.name} is a running community in ${club.city}. Join runs, track training, and connect with runners.`;

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
  const club = await getClub(slug).catch(() => null);
  if (!club || !club.publishedAt) notFound();

  return (
    <div className={`${fraunces.variable} club-page`}>
      <ClubIcons />
      <ClubJsonLd club={club} />
      <main className="page">
        <Masthead club={club} />
        <Hero club={club} />
        <Ribbon />
        <Stats club={club} />
        <NextRun club={club} />
        <Upcoming club={club} />
        {club.lastRun && <LastRun club={club} />}
        {club.admins.length > 0 && <LedBy admins={club.admins} />}
        <CtaFooter club={club} />
        <MetaFooter slug={club.slug} />
      </main>
    </div>
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

function Masthead({ club }: { club: Club }) {
  return (
    <header className="masthead">
      <div className="masthead-left">
        {/* Red circle-mark + Clash Display "endorfin" — matches <Logo/>. */}
        <a href="/" className="logo wordmark">
          <span className="wordmark-mark">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
              <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                <path d="M8 1.5a6.48 6.48 0 00-4.707 2.017.75.75 0 11-1.086-1.034A7.98 7.98 0 018 0a7.98 7.98 0 015.793 2.483.75.75 0 11-1.086 1.034A6.48 6.48 0 008 1.5zM1.236 5.279a.75.75 0 01.514.927 6.503 6.503 0 004.727 8.115.75.75 0 11-.349 1.459 8.003 8.003 0 01-5.82-9.986.75.75 0 01.928-.515zm13.528 0a.75.75 0 01.928.515 8.003 8.003 0 01-5.82 9.986.75.75 0 01-.35-1.459 6.503 6.503 0 004.728-8.115.75.75 0 01.514-.927z" />
                <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 8a5 5 0 1110 0A5 5 0 013 8z" opacity=".25" />
              </g>
            </svg>
          </span>
          endorfin
        </a>
        <span className="kicker breadcrumb">clubs&nbsp;·&nbsp;{club.city}&nbsp;·&nbsp;{club.slug}</span>
      </div>
    </header>
  );
}

function HeroName({ name }: { name: string }) {
  // Match the mockup exactly: 2-word names break after word one with a
  // trailing period on word two. Other lengths render as a single line
  // with a period appended.
  const clean = name.trim().replace(/\.$/, '');
  const words = clean.split(/\s+/);
  if (words.length === 2) {
    return <h1 className="hero-name">{words[0]}<br />{words[1]}.</h1>;
  }
  return <h1 className="hero-name">{clean}.</h1>;
}

function Hero({ club }: { club: Club }) {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          <div className="hero-kicker-row">
            {club.kicker && <span className="kicker">{club.kicker}</span>}
            {club.isVerified && (
              <span className="verified-pill" title="Endorfin-verified club">
                <svg className="check" aria-hidden="true"><use href="#i-verified" /></svg>
                Verified club
              </span>
            )}
          </div>
          <div className="hero-ident">
            {club.logoUrl && (
              <div className="club-logo hero-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.logoUrl} alt={`${club.name} logo`} />
              </div>
            )}
            <HeroName name={club.name} />
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
          {club.description && <p className="hero-description">{club.description}</p>}
          <div className="hero-cta-stack">
            {club.joinUrl && (
              <a className="btn btn-primary" href={club.joinUrl} target="_blank" rel="noopener">Join club</a>
            )}
            <div className="socials-pill" aria-label="Share and follow">
              <a className="icon-dot" href={`https://www.endorfin.run/clubs/${club.slug}`} aria-label="Share">
                <svg aria-hidden="true"><use href="#i-share" /></svg>
              </a>
              {(club.whatsappUrl || club.instagramUrl || club.stravaUrl) && (
                <span className="pill-divider" aria-hidden="true" />
              )}
              {club.whatsappUrl && (
                <a className="icon-dot" data-brand="whatsapp" href={club.whatsappUrl} target="_blank" rel="noopener" aria-label="WhatsApp group">
                  <svg aria-hidden="true"><use href="#i-whatsapp" /></svg>
                </a>
              )}
              {club.instagramUrl && (
                <a className="icon-dot" data-brand="instagram" href={club.instagramUrl} target="_blank" rel="noopener" aria-label="Instagram">
                  <svg aria-hidden="true"><use href="#i-instagram" /></svg>
                </a>
              )}
              {club.stravaUrl && (
                <a className="icon-dot" data-brand="strava" href={club.stravaUrl} target="_blank" rel="noopener" aria-label="Strava club">
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

function NextRun({ club }: { club: Club }) {
  const nr = club.nextRun;
  if (!nr) return null;

  const bgStyle = nr.bgImageUrl
    ? ({ ['--bg-image' as string]: `url('${nr.bgImageUrl}')` } as React.CSSProperties)
    : undefined;
  const hasImage = !!nr.bgImageUrl;

  return (
    <section className={`next-run on-jet ${hasImage ? 'has-image' : ''}`} style={bgStyle}>
      <div className="kicker next-run-kicker" style={{ color: 'var(--text-muted)' }}>This week · Next run</div>
      <div className="next-run-grid">
        <div className="date-block">
          <div className="date-block-title">
            <div className="date-block-day">{fmtDay(nr.date)}</div>
            <div className="date-block-date">{fmtDayDotMonth(nr.date)}</div>
          </div>
          <div className="date-block-sub">
            {[fmtTime12h(nr.time), nr.location].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="run-info">
          <h2 className="run-title">
            {nr.title}
            {nr.distanceKm != null && <> — <span className="distance">{fmtDistance(nr.distanceKm)}</span></>}
          </h2>
          {nr.description && <p className="run-description">{nr.description}</p>}
        </div>
        <div className="next-run-cta">
          <span className="going-pill">{nr.goingCount} going</span>
          {nr.rsvpUrl ? (
            <a className="btn btn-primary" href={nr.rsvpUrl} target="_blank" rel="noopener">RSVP</a>
          ) : (
            <button className="btn btn-primary" type="button">RSVP</button>
          )}
          <button className="btn btn-ghost-light" type="button">View details</button>
        </div>
      </div>
    </section>
  );
}

function Upcoming({ club }: { club: Club }) {
  const runs = club.upcomingRuns;
  if (runs.length === 0) return null;

  return (
    <section className="upcoming">
      <div className="upcoming-header">
        <h2 className="upcoming-title">Upcoming</h2>
        <span className="kicker upcoming-count">{runs.length} {runs.length === 1 ? 'run' : 'runs'} scheduled</span>
      </div>

      {runs.map((run, i) => <UpcomingRow key={run.id || i} run={run} />)}

      {runs.length > 3 && (
        <div className="upcoming-more">
          <button className="btn btn-ghost" type="button">See all {runs.length} runs</button>
        </div>
      )}
    </section>
  );
}

function UpcomingRow({ run }: { run: ClubUpcomingRun }) {
  const isRace = run.type === 'race_event';
  const tagLabel = isRace ? 'Race event' : 'Club run';
  const ctaLabel = isRace ? 'Details' : 'RSVP';
  const meta = [run.location, fmtTime12h(run.time)].filter(Boolean).join(' · ');

  return (
    <div className="upcoming-row">
      <div>
        <div className="row-date">{fmtDayNum(run.date)}</div>
        <div className="kicker row-date-sub">
          {fmtDay(run.date)} · {fmtMonth(run.date)}
        </div>
      </div>
      <div>
        <span className={`row-type ${isRace ? 'row-type-race' : 'row-type-club'}`}>{tagLabel}</span>
        <div className="row-title">{run.title}</div>
        <div className="row-meta" data-going={run.goingCount}>{meta}</div>
      </div>
      <span className="going-pill">{run.goingCount} going</span>
      <div className="row-cta">
        {run.rsvpUrl ? (
          <a className="btn btn-ghost" href={run.rsvpUrl} target="_blank" rel="noopener">{ctaLabel}</a>
        ) : (
          <button className="btn btn-ghost" type="button">{ctaLabel}</button>
        )}
      </div>
    </div>
  );
}

function LastRun({ club }: { club: Club }) {
  const lr = club.lastRun!;
  const isRace = lr.type === 'race_event';

  return (
    <section className="last-run">
      <div className="last-run-head">
        <div>
          <div className="kicker last-run-kicker">Last run · {fmtLastRunKickerDate(lr.date)}</div>
          <span className={`last-run-tag ${isRace ? 'race' : ''}`}>{isRace ? 'Race event' : 'Club run'}</span>
          <h2 className="last-run-title">{lr.title}</h2>
          {lr.summary && <p className="last-run-summary">{lr.summary}</p>}
        </div>
        <div className="last-run-meta" aria-label="Run summary">
          <div className="row">
            <span className="row-label">Showed up</span>
            <span className="row-value">{lr.stats.showedUp}</span>
          </div>
          {lr.stats.distanceKm != null && (
            <div className="row">
              <span className="row-label">Distance</span>
              <span className="row-value">{lr.stats.distanceKm}<span className="unit">km</span></span>
            </div>
          )}
          {lr.stats.paceGroups && (
            <div className="row">
              <span className="row-label">Pace</span>
              <span className="row-value">{lr.stats.paceGroups}</span>
            </div>
          )}
          {lr.stats.after && (
            <div className="row">
              <span className="row-label">After</span>
              <span className="row-value">{lr.stats.after}</span>
            </div>
          )}
        </div>
      </div>

      {lr.photos.length > 0 && <LastRunReel photos={lr.photos} />}
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
          <a className="icon-btn sm" data-brand="whatsapp" href={admin.whatsappUrl} target="_blank" rel="noopener" aria-label={`${admin.name} on WhatsApp`}>
            <svg aria-hidden="true"><use href="#i-whatsapp" /></svg>
          </a>
        )}
        {admin.instagramUrl && (
          <a className="icon-btn sm" data-brand="instagram" href={admin.instagramUrl} target="_blank" rel="noopener" aria-label={`${admin.name} on Instagram`}>
            <svg aria-hidden="true"><use href="#i-instagram" /></svg>
          </a>
        )}
        {admin.stravaUrl && (
          <a className="icon-btn sm" data-brand="strava" href={admin.stravaUrl} target="_blank" rel="noopener" aria-label={`${admin.name} on Strava`}>
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
          <a className="btn btn-ghost-light" href="https://apps.apple.com/app/endorfin/id6762107286" target="_blank" rel="noopener" aria-label="Download Endorfin on the App Store">
            <svg className="btn-icon" aria-hidden="true"><use href="#i-apple" /></svg>
            App Store
          </a>
          <a className="btn btn-primary" href="https://play.google.com/store/apps/details?id=com.endorfin.app" target="_blank" rel="noopener" aria-label="Get Endorfin on Google Play">
            <svg className="btn-icon" aria-hidden="true"><use href="#i-google-play" /></svg>
            Google Play
          </a>
        </div>
      </div>
    </section>
  );
}

function MetaFooter({ slug }: { slug: string }) {
  return (
    <footer className="meta-footer">
      <span className="kicker">endorfin.run/clubs/{slug}</span>
      <span className="kicker meta-right">© {new Date().getFullYear()} Endorfin</span>
    </footer>
  );
}
