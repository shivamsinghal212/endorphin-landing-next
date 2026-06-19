'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import HeroSearchPanel, {
  cityChip,
  TAG_CHIPS,
  type DiscoverHit,
  type QuickChip,
} from '@/components/HeroSearchPanel';
import { ClaimClubModal } from './[slug]/claim-club-link';
import { JoinClubModal } from './[slug]/join-club-modal';
import type { MyClubClaim, MyClubMembership } from '@/lib/api';
import type { ApiClub, ClubEvent } from './page';

type Membership = MyClubMembership;
type Claim = MyClubClaim;

const PAGE_SIZE = 24;

// ─── small utilities ────────────────────────

function initials(name: string) {
  const w = (name || '').trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

function formatMembers(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(Math.floor(n / 100) / 10).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

// Real club queries the discover search can answer — cycled in the search
// input placeholder with a typewriter effect (module-level const: the
// useTypewriter hook needs a referentially stable array).
const CLUB_SEARCH_EXAMPLES = [
  'run clubs in Mumbai',
  'women-only run clubs',
  'HYROX training clubs',
  'marathon training clubs in Delhi',
  'trail running clubs in Bangalore',
  'early morning run clubs in Pune',
];

// Pin to IST so SSR (UTC server) and the client (any TZ) format dates
// identically — without timeZone, locale formatting uses the runtime's
// local zone and hydration mismatches (React #418) for anyone outside it.
const IST = 'Asia/Kolkata';

function fmtDayShort(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
}

function fmtDateFull(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', timeZone: IST });
}

function fmtTimeShort(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}

// ─── Membership CTA ─────────────────────────

function MembershipCta({
  name,
  slug,
  membership,
  onJoin,
  className,
}: {
  name: string;
  slug: string;
  membership: Membership | null;
  onJoin: (club: { name: string; slug: string }) => void;
  className?: string;
}) {
  const status = membership?.status;
  const role = membership?.role;
  if (status === 'active' && role === 'owner') {
    return (
      <span className={`v1c-btn v1c-btn-owner ${className ?? ''}`} role="status" aria-label={`You own ${name}`}>
        Your club
      </span>
    );
  }
  if (status === 'active' && role === 'admin') {
    return (
      <span className={`v1c-btn v1c-btn-owner ${className ?? ''}`} role="status" aria-label={`You admin ${name}`}>
        Club admin
      </span>
    );
  }
  if (status === 'active' && role === 'member') {
    return (
      <span className={`v1c-btn v1c-btn-success ${className ?? ''}`} role="status" aria-label={`Already a member of ${name}`}>
        Already a member
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className={`v1c-btn v1c-btn-pending ${className ?? ''}`} role="status" aria-label={`Pending request for ${name}`}>
        Request pending
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`v1c-btn v1c-btn-primary ${className ?? ''}`}
      onClick={() => onJoin({ name, slug })}
    >
      Join club
    </button>
  );
}

const VerifiedTick = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" aria-label="Verified">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.8 5.8a1 1 0 01-1.4 0L7 12.6a1 1 0 011.4-1.4l1.8 1.8 5.1-5.1a1 1 0 011.4 1.4z"
    />
  </svg>
);

// ─── Flagship card (top-5-by-members featured strip) ──
// Original /clubs design verbatim — full ApiClub data (4-stat block,
// tags row, next-run with location + distance, CTAs). The featured 5
// are fetched via the legacy /clubs/{slug} + /events endpoints in
// page.tsx; the all-clubs grid below stays on the lean DiscoverHit.
function pickNextEvent(events: ClubEvent[] | undefined): ClubEvent | null {
  if (!events || events.length === 0) return null;
  const now = Date.now();
  const future = events
    .filter((e) => {
      const t = Date.parse(e.startTime);
      return Number.isFinite(t) && t >= now;
    })
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return future[0] || null;
}

function FlagshipCard({
  c,
  membership,
  onJoin,
  isLcp = false,
}: {
  c: ApiClub;
  membership: Membership | null;
  onJoin: (club: { name: string; slug: string }) => void;
  isLcp?: boolean;
}) {
  const stats = c.stats || {};
  const nr = pickNextEvent(c.events);
  const href = `/clubs/${c.slug}`;

  const bgImageUrl = c.headerImageUrl || c.logoUrl || null;
  const bgIsLogoFallback = !c.headerImageUrl && !!c.logoUrl;

  return (
    <article className="v1c-flagship-card">
      <div
        className={`v1c-flagship-card-bg${bgIsLogoFallback ? ' is-logo-fallback' : ''}`}
        style={bgImageUrl ? { backgroundImage: `url('${bgImageUrl}')` } : undefined}
        aria-hidden
      />
      <div className="v1c-flagship-main">
        <div>
          <div className="v1c-flagship-kicker">
            {c.city}
            {c.establishedYear ? ` · Est ${c.establishedYear}` : ''}
            {c.isVerified && (
              <span className="v1c-flagship-verified" aria-label="Verified">
                <VerifiedTick />
              </span>
            )}
          </div>
          <div className="v1c-flagship-head">
            <div className="v1c-flagship-logo">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logoUrl}
                  alt={`${c.name} logo`}
                  loading={isLcp ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={isLcp ? 'high' : 'low'}
                />
              ) : (
                initials(c.name)
              )}
            </div>
            <h3 className="v1c-flagship-title">{c.name}</h3>
          </div>
          {c.subtitle && <p className="v1c-flagship-subtitle">{c.subtitle}</p>}
        </div>
        {/* Skip any stat block whose value is 0 (or null/undefined).
            Empty stats look like missing data rather than "this club is
            new" — hiding them keeps the card honest. */}
        <div className="v1c-flagship-stats">
          {stats.members ? (
            <div className="v1c-flagship-stat-block">
              <div className="v1c-flagship-stat-label">Members</div>
              <div className="v1c-flagship-stat-value">
                {stats.members.toLocaleString('en-IN')}
              </div>
            </div>
          ) : null}
          {stats.runsThisMonth ? (
            <div className="v1c-flagship-stat-block">
              <div className="v1c-flagship-stat-label">Runs / month</div>
              <div className="v1c-flagship-stat-value">{stats.runsThisMonth}</div>
            </div>
          ) : null}
          {stats.kmThisMonth ? (
            <div className="v1c-flagship-stat-block">
              <div className="v1c-flagship-stat-label">Km / month</div>
              <div className="v1c-flagship-stat-value">{stats.kmThisMonth}</div>
            </div>
          ) : null}
          {stats.yearsRunning ? (
            <div className="v1c-flagship-stat-block">
              <div className="v1c-flagship-stat-label">Years</div>
              <div className="v1c-flagship-stat-value">{stats.yearsRunning}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="v1c-flagship-side">
        <div>
          {c.tags && c.tags.length > 0 && (
            <div className="v1c-flagship-tags">
              {c.tags.map((t) => (
                <span key={t} className="v1c-flagship-tag">{t}</span>
              ))}
            </div>
          )}
          {nr && (
            <div className="v1c-flagship-nextrun">
              <div className="v1c-flagship-nextrun-kicker">
                Next run · {fmtDateFull(nr.startTime)}
                {fmtTimeShort(nr.startTime) ? ` · ${fmtTimeShort(nr.startTime)}` : ''}
              </div>
              <div className="v1c-flagship-nextrun-title">{nr.title || 'Next run'}</div>
              <div className="v1c-flagship-nextrun-meta">
                {nr.locationName || '—'}
                {nr.distanceKm != null && (
                  <>
                    <span className="v1c-dot">·</span>
                    {nr.distanceKm}K
                  </>
                )}
              </div>
              {nr.goingCount ? (
                <span className="v1c-flagship-nextrun-going">{nr.goingCount} going</span>
              ) : null}
            </div>
          )}
        </div>
        <div className="v1c-flagship-ctas">
          <MembershipCta name={c.name} slug={c.slug} membership={membership} onJoin={onJoin} />
          <Link href={href} className="v1c-btn v1c-btn-ghost-light">
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Compact club card (all-clubs grid) ──
// Matches the original portrait card design — header image with vignette,
// floating logo, title + verified tick, city + est year, tags, member
// count footer with next-event indicator.
function ClubCard({
  c,
  membership,
  onJoin,
  hidden,
}: {
  c: DiscoverHit;
  membership: Membership | null;
  onJoin: (club: { name: string; slug: string }) => void;
  // Hidden cards stay in the SSR HTML for SEO; only display:none'd
  // via the .is-hidden modifier. "Load more" toggles the class off.
  hidden: boolean;
}) {
  if (!c.slug) return null;
  const href = `/clubs/${c.slug}`;
  const nr = c.nextEvent;
  const headerImg = c.imageUrl;
  const membersFormatted = formatMembers(c.members);

  return (
    <article className={`v1c-club-card ${hidden ? 'is-hidden' : ''}`}>
      <Link href={href} className="v1c-club-card-body-link" aria-label={`View ${c.title}`}>
        <div className="v1c-club-card-header">
          <div className="v1c-club-card-header-fallback">{initials(c.title)}</div>
          {headerImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headerImg}
              alt={c.title}
              loading="lazy"
              className="is-logo-fallback"
            />
          )}
        </div>
        <div className="v1c-club-card-body">
          <div className="v1c-club-card-logo">
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt={`${c.title} logo`} loading="lazy" />
            ) : (
              initials(c.title)
            )}
          </div>
          <div className="v1c-club-card-top">
            <h3 className="v1c-club-card-title">{c.title}</h3>
            {c.isVerified && (
              <span className="v1c-club-card-verified" aria-label="Verified">
                <VerifiedTick />
              </span>
            )}
          </div>
          <div className="v1c-club-card-city">
            {c.city}
            {c.establishedYear ? ` · Est ${c.establishedYear}` : ''}
          </div>
          {c.tags && c.tags.length > 0 && (
            <div className="v1c-club-card-tags">
              {c.tags.slice(0, 3).map((t) => (
                <span key={t} className="v1c-club-card-tag">{t}</span>
              ))}
            </div>
          )}
          {/* Dedicated next-event row — date + title, not just "Sun · 5K".
              Gives the card real signal about why someone might join this
              club (not just "342 members"). */}
          {nr && (
            <div className="v1c-club-card-nextevent">
              <div className="v1c-club-card-nextevent-kicker">
                Next run · {fmtDayShort(nr.startTime)}
                {fmtTimeShort(nr.startTime) ? ` · ${fmtTimeShort(nr.startTime)}` : ''}
                {nr.distanceKm != null ? ` · ${nr.distanceKm}K` : ''}
              </div>
              <div className="v1c-club-card-nextevent-title">{nr.title || 'Next run'}</div>
            </div>
          )}
          <div className="v1c-club-card-foot">
            {membersFormatted && (
              <span className="v1c-club-card-stat">
                <strong>{membersFormatted}</strong> members
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="v1c-club-card-actions">
        <MembershipCta
          name={c.title}
          slug={c.slug}
          membership={membership}
          onJoin={onJoin}
          className="v1c-club-card-join"
        />
      </div>
    </article>
  );
}

// ─── Onboard banner (unchanged) ──
function OnboardClubBanner() {
  const [handle, setHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const cleanHandle = (raw: string) =>
    raw
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@/, '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanHandle(handle);
    if (!cleaned) return;
    posthog.capture('club_onboard_request', { instagram_handle: cleaned });
    // POST to the backend queue. We don't gate on success — even if the
    // API write fails (offline, server down) the mailto still fires
    // so the request reaches us out-of-band.
    try {
      await fetch('https://api.endorfin.run/api/v1/clubs/onboard-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramHandle: cleaned }),
      });
    } catch {
      // Swallow — mailto is the fallback path.
    }
    setSubmitted(true);
  }

  return (
    <div className="v1c-onboard-card">
      <div className="v1c-onboard-copy">
        <h2 className="v1c-onboard-title">
          Don&rsquo;t see your club here<span className="v1c-red">?</span>
        </h2>
        <p className="v1c-onboard-sub">
          Drop your Instagram handle and our team will reach out to get your club
          onboarded — verified listing, member tools, the works.
        </p>
      </div>
      {submitted ? (
        <div className="v1c-onboard-thanks" role="status" aria-live="polite">
          <strong>Thanks — we&rsquo;ll be in touch.</strong>
          <span>
            We&rsquo;ve logged your request. If anything urgent, reach us at{' '}
            <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
          </span>
        </div>
      ) : (
        <form className="v1c-onboard-form" onSubmit={onSubmit}>
          <div className="v1c-onboard-input-wrap">
            <span className="v1c-onboard-input-prefix" aria-hidden>@</span>
            <input
              type="text"
              className="v1c-onboard-input"
              placeholder="your_club_handle"
              aria-label="Your club's Instagram handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <button
            type="submit"
            className="v1c-btn v1c-btn-primary v1c-onboard-submit"
            disabled={!cleanHandle(handle)}
          >
            Get my club listed →
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Studio admin promotion tabs (unchanged) ──
type AdminTab = 'members' | 'events' | 'rsvps' | 'profile';
interface AdminMockRow {
  avatar: string; avatarRed?: boolean; name: string; meta: string; action: string;
  actionKind: 'yes' | 'muted' | 'gold';
}
interface AdminPanelData {
  num: string; heading: string; copy: string; bullets: string[];
  mock: { title: string; titleStrong: string; rightMeta: string; rows: AdminMockRow[] };
}
const ADMIN_PANELS: Record<AdminTab, AdminPanelData> = {
  members: {
    num: '01',
    heading: 'Approve the runners who’ll show up.',
    copy: 'Every join request lands in Studio with the answers you asked for — pace, goals, whatever you put on the form. Approve in a tap. Promote anyone to co-admin.',
    bullets: ['Pending requests with full join-form answers', 'Approve, decline (with optional reason)', 'Promote members → co-admins'],
    mock: { titleStrong: 'Pending', title: ' · 3 requests', rightMeta: 'Today',
      rows: [
        { avatar: 'AK', name: 'Aarav Kapoor', meta: '5:30/km · training for ADHM', action: 'Approve', actionKind: 'yes' },
        { avatar: 'SM', name: 'Simran Mehta', meta: '6:10/km · returning runner', action: 'Approve', actionKind: 'yes' },
        { avatar: 'VI', name: 'Vikram Iyer', meta: '4:50/km · sub-90 half goal', action: 'Approve', actionKind: 'yes' },
        { avatar: 'NP', name: 'Neel Patil', meta: 'New to running · friend of Aarav', action: 'Review', actionKind: 'muted' },
      ] } },
  events: {
    num: '02',
    heading: 'Plan runs, not logistics.',
    copy: 'Schedule the next run with start time, meet point, and distance. Members see it in the app the moment you publish. Free or paid — your call. No more "where do we meet?" at 5am.',
    bullets: ['Date, time, start point, distance', 'Free runs or paid events with ₹ at signup', 'Upcoming + past archive in one place'],
    mock: { titleStrong: 'Upcoming', title: ' · this week', rightMeta: '+ New event',
      rows: [
        { avatar: 'SU', avatarRed: true, name: 'Sunday Long Run · 25K', meta: '26 May · 5:30 am · Marine Drive', action: '48 going', actionKind: 'muted' },
        { avatar: 'TT', name: 'Track Workout · paid', meta: '28 May · 6:00 am · ₹300 · 14 paid', action: '₹300', actionKind: 'gold' },
        { avatar: 'TE', name: 'Tempo Tuesday · 8K', meta: '29 May · 6:00 am · JLN Track', action: '22 going', actionKind: 'muted' },
        { avatar: 'RR', name: 'Recovery Saturday · 5K', meta: '03 Jun · 7:00 am · Lodhi Garden', action: '12 going', actionKind: 'muted' },
      ] } },
  rsvps: {
    num: '03',
    heading: 'Know who’s actually showing up.',
    copy: 'Pick any upcoming run. See the full roster — first-timers, regulars, the people you should say hi to. No more flying blind to the start point.',
    bullets: ['Per-event roster with avatars + names', 'Live going count, refreshed in real time', 'Spot first-timers before they arrive'],
    mock: { titleStrong: 'Sunday Long Run', title: ' · 25K · 48 going', rightMeta: 'Live',
      rows: [
        { avatar: 'RJ', name: 'Rhea Joshi', meta: 'Regular · 14 runs with the club', action: 'Going', actionKind: 'yes' },
        { avatar: 'DK', name: 'Dev Khurana', meta: 'Regular · 11 runs', action: 'Going', actionKind: 'yes' },
        { avatar: 'AP', avatarRed: true, name: 'Anu Prasad', meta: 'First-timer · joined yesterday', action: 'Going', actionKind: 'gold' },
        { avatar: 'SM', name: 'Sanjay Mishra', meta: 'Regular · PB chase day', action: 'Going', actionKind: 'yes' },
      ] } },
  profile: {
    num: '04',
    heading: 'A public listing that represents you.',
    copy: 'Tagline, city, year, tags. Link WhatsApp, Instagram, Strava. Customise the join form. Add co-admins so you’re not the bottleneck. Your club, the way you want it on the internet.',
    bullets: ['About · tagline · tags · established year', 'Linked channels: WhatsApp · Instagram · Strava', 'Custom join form + approval toggle'],
    mock: { titleStrong: 'Public listing', title: ' · Live', rightMeta: 'View public →',
      rows: [
        { avatar: '✎', name: 'About', meta: 'Morning runs across South Delhi · since 2019', action: 'Edit', actionKind: 'yes' },
        { avatar: '◎', name: 'Social & links', meta: 'WhatsApp ✓ · Instagram ✓ · Strava —', action: 'Edit', actionKind: 'yes' },
        { avatar: '✦', name: 'Join form', meta: '3 questions · approval required', action: 'Customise', actionKind: 'yes' },
        { avatar: '◐', name: 'Co-admins', meta: 'You + 2 others can edit this club', action: 'Manage', actionKind: 'yes' },
      ] } },
};
const TAB_ORDER: { key: AdminTab; label: string }[] = [
  { key: 'members', label: '01 · Members' },
  { key: 'events', label: '02 · Events' },
  { key: 'rsvps', label: '03 · RSVPs' },
  { key: 'profile', label: '04 · Profile' },
];
function AdminPanel({ data }: { data: AdminPanelData }) {
  return (
    <div className="v1c-admin-panel" role="tabpanel">
      <div>
        <div className="v1c-admin-panel-num">{data.num}</div>
        <h3>{data.heading}</h3>
        <p>{data.copy}</p>
        <div className="v1c-admin-panel-list">
          {data.bullets.map((b) => (
            <div key={b} className="v1c-admin-panel-list-item">{b}</div>
          ))}
        </div>
      </div>
      <div className="v1c-admin-mock">
        <div className="v1c-admin-mock-head">
          <span><strong>{data.mock.titleStrong}</strong>{data.mock.title}</span>
          <span>{data.mock.rightMeta}</span>
        </div>
        <div className="v1c-admin-mock-rows">
          {data.mock.rows.map((row, i) => (
            <div key={i} className="v1c-admin-mock-row">
              <div className={`v1c-admin-mock-av ${row.avatarRed ? 'red' : ''}`}>{row.avatar}</div>
              <div className="v1c-admin-mock-main">
                <div className="v1c-admin-mock-name">{row.name}</div>
                <div className="v1c-admin-mock-meta">{row.meta}</div>
              </div>
              <span className={`v1c-admin-mock-action ${row.actionKind}`}>{row.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pagination bar (top + bottom of the all-clubs grid) ──
// Prev / page indicator / Next. Renders nothing when there's only one
// page so we don't waste vertical space on small datasets.
function PaginationBar({
  pageIndex,
  totalPages,
  onChange,
  position = 'top',
}: {
  pageIndex: number;
  totalPages: number;
  onChange: (next: number) => void;
  position?: 'top' | 'bottom';
}) {
  if (totalPages <= 1) return null;
  const isFirst = pageIndex === 0;
  const isLast = pageIndex >= totalPages - 1;
  return (
    <nav
      className={`v1c-pagination v1c-pagination-${position}`}
      aria-label={position === 'top' ? 'Pagination, top' : 'Pagination, bottom'}
    >
      <button
        type="button"
        className="v1c-pagination-btn"
        onClick={() => onChange(pageIndex - 1)}
        disabled={isFirst}
        aria-label="Previous page"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Prev
      </button>
      <span className="v1c-pagination-pos" aria-live="polite">
        Page <strong>{pageIndex + 1}</strong> of {totalPages}
      </span>
      <button
        type="button"
        className="v1c-pagination-btn"
        onClick={() => onChange(pageIndex + 1)}
        disabled={isLast}
        aria-label="Next page"
      >
        Next
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}

// ─── Experiences rails (events-first, national /clubs only) ──
// Ported from design-mockups/clubs-v1a-rails-classic.html. Three rails —
// "Events around you", "Events this weekend" (both DiscoverHit events) and
// "Run Clubs By City" (clubs we already fetched, grouped by city). Event
// cards link to the real /clubs/{slug}/events/{eventSlug} pages; the city
// rail's "See all" links to the real /run-clubs/[city] landing pages.

const CITY_GROUPS = ['Delhi NCR', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Others'] as const;
type CityGroup = (typeof CITY_GROUPS)[number];

// Map a club's free-text city onto one of the rail's city groups.
function cityGroupOf(city: string | null): CityGroup {
  const c = (city || '').toLowerCase();
  if (/delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad/.test(c)) return 'Delhi NCR';
  if (/mumbai|bombay|thane/.test(c)) return 'Mumbai';
  if (/bengaluru|bangalore/.test(c)) return 'Bangalore';
  if (/pune/.test(c)) return 'Pune';
  if (/hyderabad|secunderabad/.test(c)) return 'Hyderabad';
  if (/chennai|madras/.test(c)) return 'Chennai';
  return 'Others';
}

// "See all" target for a city group → its /run-clubs/[city] landing.
// "Others" has no single city page, so it gets no link.
const CITY_GROUP_HREF: Record<CityGroup, string | null> = {
  'Delhi NCR': '/run-clubs/delhi',
  Mumbai: '/run-clubs/mumbai',
  Bangalore: '/run-clubs/bengaluru',
  Pune: '/run-clubs/pune',
  Hyderabad: '/run-clubs/hyderabad',
  Chennai: '/run-clubs/chennai',
  Others: null,
};

// Stable, ASCII id slug for a city group — used to wire tab/tabpanel aria
// (e.g. "Delhi NCR" → "delhi-ncr").
function cityGroupId(g: CityGroup): string {
  return g.toLowerCase().replace(/\s+/g, '-');
}

// Event link mirrors page.tsx's eventHref: /clubs/{clubSlug}/events/{slug||id}.
function eventHref(hit: DiscoverHit): string | null {
  if (!hit.clubSlug) return null;
  return `/clubs/${hit.clubSlug}/events/${hit.slug || hit.id}`;
}

// Short experience-type label for the card chip — the ONLY element over
// the image. Prefer a tag, else derive from event type / distance.
function eventTypeLabel(hit: DiscoverHit): string {
  if (hit.tags && hit.tags.length) return hit.tags[0];
  if (hit.eventType === 'race_event') return 'Race';
  if (hit.distanceKm != null) return `${hit.distanceKm}K run`;
  return 'Club run';
}

const RunIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="13" cy="4" r="1.6" />
    <path d="M5 20l3-5 3 2 1-4-3-3 4-1 2 3 3 1" />
  </svg>
);

function EventCard({ hit, clubLogo }: { hit: DiscoverHit; clubLogo?: string | null }) {
  const href = eventHref(hit);
  const img = hit.imageUrl;
  const day = fmtDayShort(hit.startTime);
  const time = fmtTimeShort(hit.startTime);
  const dist = hit.distanceKm != null ? `${hit.distanceKm}K` : null;
  const club = hit.clubName || '';

  const inner = (
    <>
      <div className="v1c-exp-media">
        {img ? (
          <>
            <div className="v1c-exp-bg" style={{ backgroundImage: `url(${img})` }} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={hit.title} loading="lazy" />
          </>
        ) : (
          <div className="v1c-exp-media-fallback" aria-hidden>{initials(hit.title)}</div>
        )}
        <span className="v1c-exp-badge"><RunIcon />{eventTypeLabel(hit)}</span>
      </div>
      <div className="v1c-exp-body">
        {club && (
          <div className="v1c-exp-byline">
            <span className="v1c-exp-mono">
              {clubLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clubLogo} alt="" loading="lazy" />
              ) : (
                initials(club)
              )}
            </span>
            <span className="v1c-exp-club">
              <span>{club}</span>
              {hit.isVerified && <VerifiedTick className="v1c-exp-verified" />}
            </span>
          </div>
        )}
        <h3 className="v1c-exp-title">{hit.title}</h3>
        <div className="v1c-exp-evtmeta">
          {day}
          {time && (<><span className="v1c-exp-sep">·</span>{time}</>)}
          {dist && (<><span className="v1c-exp-sep">·</span>{dist}</>)}
        </div>
      </div>
    </>
  );

  return href ? (
    <Link href={href} className="v1c-exp-card" aria-label={hit.title}>{inner}</Link>
  ) : (
    <div className="v1c-exp-card">{inner}</div>
  );
}

function ExpClubCard({ c }: { c: DiscoverHit }) {
  if (!c.slug) return null;
  const img = c.imageUrl;
  const members = formatMembers(c.members);
  return (
    <Link href={`/clubs/${c.slug}`} className="v1c-exp-club-card" aria-label={c.title}>
      <div className="v1c-exp-club-cover">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={c.title} loading="lazy" />
        ) : (
          <div className="v1c-exp-media-fallback" aria-hidden>{initials(c.title)}</div>
        )}
      </div>
      <div className="v1c-exp-club-name">
        <span>{c.title}</span>
        {c.isVerified && <VerifiedTick className="v1c-exp-verified" />}
      </div>
      <div className="v1c-exp-club-meta">
        {c.city}
        {members && (<><span className="v1c-exp-sep">·</span>{members} members</>)}
      </div>
    </Link>
  );
}

function EventRail({
  title,
  hits,
  isOpen,
  onToggle,
  clubLogos = {},
}: {
  title: string;
  hits: DiscoverHit[];
  isOpen: boolean;
  onToggle: () => void;
  // clubSlug → logo URL, built from the already-fetched clubs list (the
  // club_event payload itself carries no club logo, only the event cover).
  clubLogos?: Record<string, string>;
}) {
  if (!hits.length) return null;
  return (
    <section className="v1c-exp-rail">
      <div className="v1c-exp-rail-head">
        <h2 className="v1c-exp-rail-title">{title}</h2>
        {hits.length > 4 && (
          <button type="button" className="v1c-exp-seeall" onClick={onToggle} aria-expanded={isOpen}>
            {isOpen ? 'Show less' : 'See all'}
          </button>
        )}
      </div>
      <div className={isOpen ? 'v1c-exp-grid' : 'v1c-exp-scroller v1c-exp-evlist'}>
        {hits.map((h) => (
          <EventCard key={h.id} hit={h} clubLogo={h.clubSlug ? clubLogos[h.clubSlug] : null} />
        ))}
      </div>
    </section>
  );
}

function ClubsByCityRail({ clubs }: { clubs: DiscoverHit[] }) {
  const [active, setActive] = useState<CityGroup>('Delhi NCR');

  const byGroup = useMemo(() => {
    const m: Record<CityGroup, DiscoverHit[]> = {
      'Delhi NCR': [], Mumbai: [], Bangalore: [], Pune: [], Hyderabad: [], Chennai: [], Others: [],
    };
    for (const c of clubs) m[cityGroupOf(c.city)].push(c);
    return m;
  }, [clubs]);

  const seeAll = CITY_GROUP_HREF[active];
  const activeList = byGroup[active];

  return (
    <section className="v1c-exp-rail">
      <div className="v1c-exp-rail-head">
        <h2 className="v1c-exp-rail-title">Run Clubs By City</h2>
        {seeAll && activeList.length > 0 && (
          <Link href={seeAll} className="v1c-exp-seeall">See all</Link>
        )}
      </div>
      <div className="v1c-exp-citychips" role="tablist" aria-label="Run clubs by city">
        {CITY_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            id={`v1c-citytab-${cityGroupId(g)}`}
            aria-selected={active === g}
            aria-controls={`v1c-citypanel-${cityGroupId(g)}`}
            className={`v1c-exp-citychip ${active === g ? 'is-active' : ''}`}
            onClick={() => setActive(g)}
          >
            {g}
          </button>
        ))}
      </div>
      {/* Render every city group's clubs into the DOM (only the active tab is
          visible — inactive panels carry the `hidden` attribute). This keeps
          every /clubs/{slug} anchor crawlable from the hub, so the national
          page flows link equity to all club profiles, not just the active
          tab's. `hidden` + loading="lazy" means off-screen logos don't fetch. */}
      {CITY_GROUPS.map((g) => {
        const list = byGroup[g];
        return (
          <div
            key={g}
            role="tabpanel"
            id={`v1c-citypanel-${cityGroupId(g)}`}
            aria-labelledby={`v1c-citytab-${cityGroupId(g)}`}
            hidden={active !== g}
          >
            {list.length ? (
              <div className="v1c-exp-scroller">
                {list.map((c) => <ExpClubCard key={c.id} c={c} />)}
              </div>
            ) : (
              <div className="v1c-exp-empty">No clubs listed in {g} yet.</div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── Compact search (national /clubs only) ──
// Replaces the tall hero (big headline + stats + HeroSearchPanel) with a
// SweatPals-style compact bar: one search field with an inline city picker,
// a row of date-window chips, and a Filters reveal for club tags. Submitting
// fans out TWO /discover/smart queries (kind=club_event + kind=club) and
// renders the hits as two lists — Events and Clubs — in place of the three
// default rails. Empty on both → fall back to Mumbai. The shared
// HeroSearchPanel is left untouched; it still powers the homepage,
// /running-events, and the /run-clubs/[city] city pages.

const DISCOVER = 'https://api.endorfin.run/api/v1/discover/smart';

type SearchWindow = 'today' | 'tomorrow' | 'this_weekend' | 'this_month';
// The discover event-type values, exposed as the "Type" filter. Verified
// against the API: the working param is `eventType` (singular, repeatable) —
// the plural `eventTypes` is silently ignored. `club_social` is omitted
// (only a handful of upcoming events ever carry it).
type EventTypeKey = 'club_run' | 'club_race' | 'club_cross_train';
// Distance buckets for events, mapped to the API's distanceMin/distanceMax
// (both verified working). Single-select — picking a bucket sets the range.
type DistanceKey = '5k' | '10k' | 'half' | 'full';

interface ClubSearchFilters {
  q: string;
  city: string; // '' = All India; otherwise an API-canonical city name
  window: SearchWindow | '';
  // Event-side filters — applied to the kind=club_event query only.
  types: EventTypeKey[];
  distance: DistanceKey | '';
  // Club-side filters — applied to the kind=club query only.
  tags: string[];
  verified: boolean;
}

const WINDOW_CHIPS: { key: SearchWindow; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'this_weekend', label: 'This weekend' },
  { key: 'this_month', label: 'This month' },
];

// Event "Type" chips → `eventType` param (multi). Labels are runner-facing;
// cross-training is where yoga/HYROX/pickleball sessions live, so it's the
// closest event-side proxy for activity filtering (events have no filterable
// activity/tags field — verified against the API).
const TYPE_CHIPS: { key: EventTypeKey; label: string }[] = [
  { key: 'club_run', label: 'Runs' },
  { key: 'club_race', label: 'Races' },
  { key: 'club_cross_train', label: 'Cross-training' },
];

// Distance buckets → distanceMin/distanceMax (km). null bound = open-ended.
// NOTE: ~half of upcoming events have no distance set (cross-train/social/
// some races), so this is opt-in and never a default.
const DISTANCE_CHIPS: { key: DistanceKey; label: string; min: number | null; max: number | null }[] = [
  { key: '5k', label: '5K & under', min: null, max: 5 },
  { key: '10k', label: '5–10K', min: 5, max: 10 },
  { key: 'half', label: 'Half (10–21K)', min: 10, max: 21.1 },
  { key: 'full', label: 'Full+ (21K+)', min: 21.1, max: null },
];

// Club tag filters revealed behind the "Filters" control. Tags are matched
// against clubs.tags by the API (strict, multi). Picked by real club counts
// (e.g. social-run 29, pickleball 22, marathon-training 13) — the old `trail`
// and `beginner-friendly` chips matched ~0 real tags and were dropped.
const SEARCH_TAGS: { tag: string; label: string }[] = [
  { tag: 'social-run', label: 'Social' },
  { tag: 'marathon-training', label: 'Marathon' },
  { tag: 'pickleball', label: 'Pickleball' },
  { tag: 'women-only', label: 'Women only' },
  { tag: 'hyrox', label: 'HYROX' },
  { tag: 'trail-running', label: 'Trail' },
  { tag: 'yoga', label: 'Yoga' },
];

// City picker options. Values are the API-canonical city names the discover
// endpoint understands (it normalizes aliases like New Delhi→Delhi); "Delhi
// NCR" maps to "Delhi", which covers the bulk of NCR listings.
const SEARCH_CITIES: { value: string; label: string }[] = [
  { value: '', label: 'All India' },
  { value: 'Delhi', label: 'Delhi NCR' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
];

// "Delhi NCR" (picker value "Delhi") spans multiple municipalities, but the
// discover `city=` filter is single-value (no comma/repeat support — verified
// against the API). So an NCR search fans out one request per city and merges,
// mirroring NCR_CITIES in page.tsx (the at-rest rails). Without this, searching
// from "Delhi NCR" only matches Delhi proper and silently drops events in
// Ghaziabad/Faridabad/etc. — e.g. "yoga" returned 1 of 3 NCR events.
const NCR_SEARCH_CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad'] as const;

// The cities a search should actually query for a given picker value: NCR fans
// out, everything else (including "" = All India) is a single query.
function searchCitiesFor(city: string): string[] {
  return city === 'Delhi' ? [...NCR_SEARCH_CITIES] : [city];
}

// Map the visitor's IP-resolved city onto one of the picker values so the
// bar opens pre-scoped to where they are. Unknown city → All India.
function canonicalCity(geo: string | null | undefined): string {
  if (!geo) return '';
  const c = geo.toLowerCase();
  if (/delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad/.test(c)) return 'Delhi';
  if (/mumbai|bombay|thane|navi mumbai/.test(c)) return 'Mumbai';
  if (/bengaluru|bangalore/.test(c)) return 'Bengaluru';
  if (/pune/.test(c)) return 'Pune';
  if (/hyderabad|secunderabad/.test(c)) return 'Hyderabad';
  if (/chennai|madras/.test(c)) return 'Chennai';
  return '';
}

function cityLabelOf(value: string): string {
  return SEARCH_CITIES.find((c) => c.value === value)?.label ?? value;
}

// Today (IST calendar day, YYYY-MM-DD) as the lower bound for "upcoming"
// event queries — sort=upcoming sorts but doesn't filter past events.
function istTodayFloor(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

// Merge a multi-city event fan-out: dedupe by id, soonest-first (events with no
// startTime sort last), cap. Matches mergeUpcoming() in page.tsx.
function mergeSearchEvents(hits: DiscoverHit[], limit: number): DiscoverHit[] {
  const seen = new Set<string>();
  const at = (h: DiscoverHit) => (h.startTime ? new Date(h.startTime).getTime() : Infinity);
  return hits
    .filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)))
    .sort((a, b) => at(a) - at(b))
    .slice(0, limit);
}

// Merge a multi-city club fan-out: dedupe by id, strongest relevance first
// (members as tiebreaker), cap. Single-city queries already arrive score-sorted,
// so this is a no-op reorder for them.
function mergeSearchClubs(hits: DiscoverHit[], limit: number): DiscoverHit[] {
  const seen = new Set<string>();
  return hits
    .filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.members ?? 0) - (a.members ?? 0))
    .slice(0, limit);
}

// A search is "empty" — and therefore returns the page to its default rails
// rather than entering results mode — when it carries no query, no window,
// no tags, and the city is still the visitor's own (the idle baseline).
function isEmptySearch(f: ClubSearchFilters, baseCity: string): boolean {
  return (
    !f.q.trim() &&
    !f.window &&
    f.types.length === 0 &&
    !f.distance &&
    f.tags.length === 0 &&
    !f.verified &&
    f.city === baseCity
  );
}

const SearchGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const CaretGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const FilterGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5h18M6 12h12M10 19h4" />
  </svg>
);

function ClubsSearchBar({
  filters,
  showFilters,
  onQChange,
  onSubmit,
  onCityChange,
  onWindowToggle,
  onTypeToggle,
  onDistanceToggle,
  onTagToggle,
  onVerifiedToggle,
  onToggleFilters,
  onCloseFilters,
  onClearFilters,
}: {
  filters: ClubSearchFilters;
  showFilters: boolean;
  onQChange: (q: string) => void;
  onSubmit: () => void;
  onCityChange: (city: string) => void;
  onWindowToggle: (w: SearchWindow) => void;
  onTypeToggle: (t: EventTypeKey) => void;
  onDistanceToggle: (d: DistanceKey) => void;
  onTagToggle: (tag: string) => void;
  onVerifiedToggle: () => void;
  onToggleFilters: () => void;
  onCloseFilters: () => void;
  onClearFilters: () => void;
}) {
  const cityLbl = cityLabelOf(filters.city);
  const activeFilterCount =
    filters.types.length +
    (filters.distance ? 1 : 0) +
    filters.tags.length +
    (filters.verified ? 1 : 0);
  return (
    <div className="v1c-search">
      <form
        className="v1c-search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="v1c-search-field">
          <span className="v1c-search-ic" aria-hidden><SearchGlyph /></span>
          <input
            className="v1c-search-input"
            type="text"
            value={filters.q}
            placeholder="Search clubs & events"
            onChange={(e) => onQChange(e.target.value)}
            aria-label="Search run clubs and events"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>
        <label className="v1c-search-city">
          <span className="v1c-search-city-val">
            {cityLbl}
            <CaretGlyph />
          </span>
          <select
            value={filters.city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="Choose city"
          >
            {SEARCH_CITIES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="v1c-search-submit" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </form>

      <div className="v1c-search-chips" role="group" aria-label="Date filters">
        {WINDOW_CHIPS.map((w) => {
          const active = filters.window === w.key;
          return (
            <button
              key={w.key}
              type="button"
              className={`v1c-search-chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onWindowToggle(w.key)}
            >
              {w.label}
            </button>
          );
        })}
        <button
          type="button"
          className={`v1c-search-chip v1c-search-filters-btn ${showFilters || activeFilterCount ? 'is-active' : ''}`}
          aria-expanded={showFilters}
          onClick={onToggleFilters}
        >
          <FilterGlyph />
          Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      <Dialog.Root open={showFilters} onOpenChange={(o) => (o ? onToggleFilters() : onCloseFilters())}>
        <Dialog.Portal>
          <Dialog.Overlay className="v1c-fmodal-overlay" />
          <Dialog.Content className="v1c-fmodal" aria-describedby={undefined}>
            <header className="v1c-fmodal-head">
              <Dialog.Title className="v1c-fmodal-title">
                Filters{activeFilterCount ? <span className="v1c-fmodal-count">{activeFilterCount}</span> : null}
              </Dialog.Title>
              <Dialog.Close className="v1c-fmodal-close" aria-label="Close filters">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </header>

            <div className="v1c-fmodal-body">
              <div className="v1c-search-fgroup" role="group" aria-label="Event type">
                <span className="v1c-search-flabel">Type</span>
                <div className="v1c-search-tags">
                  {TYPE_CHIPS.map((t) => {
                    const active = filters.types.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className={`v1c-search-tag ${active ? 'is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onTypeToggle(t.key)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="v1c-search-fgroup" role="group" aria-label="Event distance">
                <span className="v1c-search-flabel">Distance</span>
                <div className="v1c-search-tags">
                  {DISTANCE_CHIPS.map((d) => {
                    const active = filters.distance === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        className={`v1c-search-tag ${active ? 'is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onDistanceToggle(d.key)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="v1c-search-fgroup" role="group" aria-label="Club filters">
                <span className="v1c-search-flabel">Clubs</span>
                <div className="v1c-search-tags">
                  {SEARCH_TAGS.map((t) => {
                    const active = filters.tags.includes(t.tag);
                    return (
                      <button
                        key={t.tag}
                        type="button"
                        className={`v1c-search-tag ${active ? 'is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onTagToggle(t.tag)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`v1c-search-tag ${filters.verified ? 'is-active' : ''}`}
                    aria-pressed={filters.verified}
                    onClick={onVerifiedToggle}
                  >
                    Verified
                  </button>
                </div>
              </div>
            </div>

            <footer className="v1c-fmodal-foot">
              <button
                type="button"
                className="v1c-fmodal-clear"
                onClick={onClearFilters}
                disabled={!activeFilterCount}
              >
                Clear all
              </button>
              <Dialog.Close className="v1c-fmodal-apply">
                Show results
              </Dialog.Close>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ─── Main view ──────────────────────────────

export default function ClubsView({
  clubs,
  featuredFull,
  cityFacets,
  eventsAround = [],
  aroundCity = null,
  eventsWeekend = [],
  membershipBySlug = {},
  claimBySlug = {},
  isAuthed = false,
  userEmail = null,
  cityName,
  geoCity = null,
  variant = 'clubs',
}: {
  // Lean shape powering the all-clubs grid (SSR'd ~112 anchors for SEO).
  clubs: DiscoverHit[];
  // Rich shape powering the featured-5 strip — stats, tags, events.
  // Fetched separately in page.tsx because /discover/smart doesn't
  // surface runs_this_month / km_this_month / years_running / events[].
  // On the national /clubs page the events rails replace this strip; it
  // still renders on /run-clubs/[city] city pages.
  featuredFull: ApiClub[];
  cityFacets: { value: string; count: number }[];
  // Events-first rails (national /clubs only) — soonest-upcoming and
  // this-weekend club events from /discover/smart?kind=club_event.
  eventsAround?: DiscoverHit[];
  // Visitor's IP-resolved city when the upcoming-events rail is scoped to it
  // (the rail then titles itself "Upcoming Events in {aroundCity}"). null =
  // the national soonest-upcoming list, titled just "Upcoming Events".
  aroundCity?: string | null;
  eventsWeekend?: DiscoverHit[];
  membershipBySlug?: Record<string, Membership>;
  claimBySlug?: Record<string, Claim>;
  isAuthed?: boolean;
  userEmail?: string | null;
  // When set, the view scopes to a single city (/run-clubs/[city]): the
  // hero kicker, H1, and grid heading switch to that city for SEO, the
  // second stat becomes "Verified", and the city quick-chips are dropped.
  // Undefined = the national /clubs experience (unchanged).
  cityName?: string;
  // Visitor's IP-resolved city (Vercel edge geo). Seeds the compact search
  // bar's city picker so it opens scoped to where they are. National only.
  geoCity?: string | null;
  // National page identity. /clubs ('clubs') leads with the run-club
  // directory rail; /experiences ('experiences') leads with the club-events
  // rails. Same data + layout — only the rail order differs. Ignored on city
  // pages (cityName set), which don't render these rails.
  variant?: 'clubs' | 'experiences';
}) {
  const [isSearching, setIsSearching] = useState(false);
  // Page index instead of "visible count" — we paginate now (Prev/Next at
  // top + bottom) rather than infinite-scroll appending. All cards stay
  // in the SSR HTML for SEO; the page state just toggles which range is
  // visible via .is-hidden.
  const [pageIndex, setPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  // Which event rail is expanded into a full grid ("See all"). null = both
  // collapsed to horizontal scrollers.
  const [openRail, setOpenRail] = useState<'around' | 'weekend' | 'search-ev' | 'search-cl' | null>(null);
  const [modal, setModal] = useState<{ kind: 'join' | 'claim'; club: { name: string; slug: string } } | null>(null);

  // ── National compact search (only used when !cityName) ──
  // baseCity = the visitor's own city; it's the picker's opening value and
  // the "idle" baseline. A search returns to the default rails when it
  // collapses back to (no query, no window, no tags, city === baseCity).
  const baseCity = useMemo(() => canonicalCity(geoCity), [geoCity]);
  const [searchFilters, setSearchFilters] = useState<ClubSearchFilters>(() => ({
    q: '',
    city: baseCity,
    window: '',
    types: [],
    distance: '',
    tags: [],
    verified: false,
  }));
  const [committedSearch, setCommittedSearch] = useState<ClubSearchFilters | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchEvents, setSearchEvents] = useState<DiscoverHit[]>([]);
  const [searchClubs, setSearchClubs] = useState<DiscoverHit[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ok' | 'fallback' | 'error'>('idle');
  const searchAbort = useRef<AbortController | null>(null);
  const searchResultsRef = useRef<HTMLElement | null>(null);
  // Sticky search dock — `dockStuck` toggles a frosted background + hairline
  // once the dock pins under the fixed nav (the sentinel scrolls out of view).
  const [dockStuck, setDockStuck] = useState(false);
  const dockSentinelRef = useRef<HTMLSpanElement | null>(null);

  // Apply a filter change and decide whether it enters results mode. Reads
  // the latest filters via the functional updater so rapid clicks don't race.
  const applySearch = useCallback(
    (patch: Partial<ClubSearchFilters>) => {
      setSearchFilters((prev) => {
        const next = { ...prev, ...patch };
        setCommittedSearch(isEmptySearch(next, baseCity) ? null : next);
        return next;
      });
    },
    [baseCity],
  );

  const onQChange = useCallback((q: string) => setSearchFilters((f) => ({ ...f, q })), []);
  // Enter / → button — commit whatever's typed (functional read for latest q).
  const submitSearch = useCallback(() => {
    setSearchFilters((f) => {
      setCommittedSearch(isEmptySearch(f, baseCity) ? null : f);
      return f;
    });
  }, [baseCity]);
  const onCityChange = useCallback((city: string) => applySearch({ city }), [applySearch]);
  const onWindowToggle = useCallback(
    (w: SearchWindow) => applySearch({ window: searchFilters.window === w ? '' : w }),
    [applySearch, searchFilters.window],
  );
  const onTypeToggle = useCallback(
    (t: EventTypeKey) =>
      applySearch({
        types: searchFilters.types.includes(t)
          ? searchFilters.types.filter((x) => x !== t)
          : [...searchFilters.types, t],
      }),
    [applySearch, searchFilters.types],
  );
  const onDistanceToggle = useCallback(
    (d: DistanceKey) => applySearch({ distance: searchFilters.distance === d ? '' : d }),
    [applySearch, searchFilters.distance],
  );
  const onTagToggle = useCallback(
    (tag: string) =>
      applySearch({
        tags: searchFilters.tags.includes(tag)
          ? searchFilters.tags.filter((t) => t !== tag)
          : [...searchFilters.tags, tag],
      }),
    [applySearch, searchFilters.tags],
  );
  const onVerifiedToggle = useCallback(
    () => applySearch({ verified: !searchFilters.verified }),
    [applySearch, searchFilters.verified],
  );
  // Reset only the modal's facets (type/distance/club tags/verified); the
  // free-text query, city, and date window live outside the modal and stay.
  const clearFilters = useCallback(
    () => applySearch({ types: [], distance: '', tags: [], verified: false }),
    [applySearch],
  );
  const clearSearch = useCallback(() => {
    setSearchFilters({ q: '', city: baseCity, window: '', types: [], distance: '', tags: [], verified: false });
    setCommittedSearch(null);
    setShowFilters(false);
  }, [baseCity]);

  // Dual fetch: one query for club events, one for clubs. Both empty →
  // fall back to a generic Mumbai listing (events + clubs), dropping the
  // failed query entirely. National page only.
  useEffect(() => {
    if (cityName) return;
    if (!committedSearch) {
      setSearchStatus('idle');
      setSearchEvents([]);
      setSearchClubs([]);
      return;
    }
    const c = committedSearch;
    const ctrl = new AbortController();
    searchAbort.current?.abort();
    searchAbort.current = ctrl;
    setSearchStatus('loading');

    // "Delhi NCR" fans out to every NCR city (the discover city= filter is
    // single-value); every other selection is a single query.
    const queryCities = searchCitiesFor(c.city);
    // Events query: q + city + the event-side filters (type, distance, window).
    // `eventType` is singular+repeatable; `tags`/`eventTypes` are no-ops here
    // (verified against the API), so club tags are deliberately NOT sent.
    const eventsUrl = (city: string) => {
      const p = new URLSearchParams();
      p.set('kind', 'club_event');
      if (c.q.trim()) p.set('q', c.q.trim());
      if (city) p.set('city', city);
      for (const t of c.types) p.append('eventType', t);
      const d = DISTANCE_CHIPS.find((x) => x.key === c.distance);
      if (d?.min != null) p.set('distanceMin', String(d.min));
      if (d?.max != null) p.set('distanceMax', String(d.max));
      if (c.window) p.set('eventsWindow', c.window);
      else p.set('dateFrom', istTodayFloor());
      p.set('sort', 'upcoming');
      p.set('limit', '24');
      return `${DISCOVER}?${p.toString()}`;
    };
    // Clubs query: q + city + the club-side filters (tags, verified). Event
    // type/distance don't apply to clubs.
    const clubsUrl = (city: string) => {
      const p = new URLSearchParams();
      p.set('kind', 'club');
      if (c.q.trim()) p.set('q', c.q.trim());
      if (city) p.set('city', city);
      for (const t of c.tags) p.append('tags', t);
      if (c.verified) p.set('verified', 'true');
      p.set('limit', '24');
      return `${DISCOVER}?${p.toString()}`;
    };
    // Mumbai fallback ignores the user's query — the point is to show
    // *something* lively when their search came up dry.
    const fallbackEventsUrl = `${DISCOVER}?kind=club_event&city=Mumbai&dateFrom=${istTodayFloor()}&sort=upcoming&limit=24`;
    const fallbackClubsUrl = `${DISCOVER}?kind=club&city=Mumbai&limit=24`;

    const getItems = (url: string): Promise<DiscoverHit[]> =>
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((j) => (j.items ?? []) as DiscoverHit[])
        .catch(() => [] as DiscoverHit[]);

    // Fan out one request per city, merge + dedupe. Single-city selections
    // collapse to a single request, so this is a no-op for them.
    const fetchEvents = () =>
      Promise.all(queryCities.map((city) => getItems(eventsUrl(city)))).then((lists) =>
        mergeSearchEvents(lists.flat(), 24),
      );
    const fetchClubs = () =>
      Promise.all(queryCities.map((city) => getItems(clubsUrl(city)))).then((lists) =>
        mergeSearchClubs(lists.flat(), 24),
      );

    (async () => {
      try {
        const [ev, cl] = await Promise.all([fetchEvents(), fetchClubs()]);
        if (ctrl.signal.aborted) return;
        if (ev.length === 0 && cl.length === 0) {
          const [fev, fcl] = await Promise.all([getItems(fallbackEventsUrl), getItems(fallbackClubsUrl)]);
          if (ctrl.signal.aborted) return;
          setSearchEvents(fev);
          setSearchClubs(fcl);
          setSearchStatus('fallback');
          posthog.capture('clubs_search', {
            q: c.q || null, city: c.city || null, window: c.window || null,
            types: c.types, distance: c.distance || null, tags: c.tags, verified: c.verified,
            events: 0, clubs: 0, fallback: true,
          });
        } else {
          setSearchEvents(ev);
          setSearchClubs(cl);
          setSearchStatus('ok');
          posthog.capture('clubs_search', {
            q: c.q || null, city: c.city || null, window: c.window || null,
            types: c.types, distance: c.distance || null, tags: c.tags, verified: c.verified,
            events: ev.length, clubs: cl.length, fallback: false,
          });
        }
      } catch {
        if (!ctrl.signal.aborted) setSearchStatus('error');
      }
    })();

    return () => ctrl.abort();
  }, [committedSearch, cityName]);

  // Frost the sticky search dock once it pins under the nav. A zero-height
  // sentinel sits at the dock's resting position; when it scrolls above the
  // nav line (rootMargin offsets by --nav-h) the dock is stuck. National page
  // only — the sentinel isn't rendered on city pages.
  useEffect(() => {
    if (cityName) return;
    const el = dockSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setDockStuck(!entry.isIntersecting),
      { rootMargin: '-68px 0px 0px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cityName]);

  const openJoin = useCallback((club: { name: string; slug: string }) => setModal({ kind: 'join', club }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // clubSlug → logo URL, from the clubs we already fetched (kind=club hits
  // carry the logo as imageUrl). Lets event cards show the real club logo —
  // the club_event payload only has the event cover, not the club logo.
  const clubLogoBySlug = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clubs) {
      if (c.slug && c.imageUrl) m[c.slug] = c.imageUrl;
    }
    return m;
  }, [clubs]);

  // featuredFull is already top-5-by-members from page.tsx — no further
  // slicing needed here.
  const totalClubs = clubs.length;
  const totalPages = Math.max(1, Math.ceil(totalClubs / PAGE_SIZE));
  const visibleStart = pageIndex * PAGE_SIZE;
  const visibleEnd = Math.min(visibleStart + PAGE_SIZE, totalClubs);
  // City pages show "Verified" as the second stat instead of "Cities"
  // (a single-city page counting "1 city" reads oddly).
  const verifiedCount = useMemo(
    () => clubs.filter((c) => c.isVerified).length,
    [clubs],
  );

  const gotoPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, totalPages - 1));
      setPageIndex(clamped);
      // Scroll the user back to the top of the grid so they're not
      // stuck mid-scroll after a page change. requestAnimationFrame so
      // the layout commits first.
      requestAnimationFrame(() => {
        const el = document.querySelector('.v1c-clubs-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [totalPages],
  );

  const membershipFor = useCallback(
    (slug: string): Membership | null => membershipBySlug[slug] ?? null,
    [membershipBySlug],
  );

  // Custom chip set for /clubs: top 5 cities BY CLUB COUNT (sorted desc;
  // the API doesn't sort facets, so the first 5 in the raw response are
  // arbitrary) + the two tag chips. Time/distance chips are dropped
  // because they don't apply to clubs (clubs have no startTime/distance).
  const clubChips: QuickChip[] = useMemo(() => {
    // City pages: drop the top-cities chips (we're already in one city);
    // keep the tag chips (women-only, HYROX, …) for cross-city discovery.
    if (cityName) return [...TAG_CHIPS];
    const topCities = [...cityFacets]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => cityChip(c.value));
    return [...topCities, ...TAG_CHIPS];
  }, [cityFacets, cityName]);

  return (
    <>
      {/* Hero — reuses the homepage's .v1-hero classes so /clubs and /
          feel like the same product (centered title, stats bar, gradient
          bg, search bar inside the hero). HeroSearchPanel renders its
          own .v1-hero-search wrapper inline; the page-scoped CSS in
          .v1-clubs-page lets us tweak just the bits that differ. */}
      <section className={`v1-hero${cityName ? '' : ' v1c-hero-natl'}`}>
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className={`v1-hero-topline${cityName ? '' : ' is-compact'}`}>
            <span className="v1-hero-kicker">
              {cityName ? `Run clubs · ${cityName}` : 'Run clubs & events · India'}
            </span>
            <span className="v1-hero-meta">{totalClubs} clubs listed</span>
          </div>

          {cityName ? (
            // ── City landing pages (/run-clubs/[city]) — unchanged: big
            //    SEO headline, the shared HeroSearchPanel, and the 2-stat bar.
            <>
              <h1 className="v1-hero-title">
                Run clubs in <span className="accent">{cityName}</span><span className="accent">.</span>
              </h1>

              <HeroSearchPanel
                kindLock="club"
                placeholderExamples={CLUB_SEARCH_EXAMPLES}
                onSearchActiveChange={setIsSearching}
                quickChips={clubChips}
                // Render search results with the SAME ClubCard the static
                // listing uses — same Join CTA, members, tags, next-event
                // line — so the UI doesn't jump when a search is submitted.
                renderCard={(hit) => (
                  <ClubCard
                    key={hit.id}
                    c={hit}
                    membership={hit.slug ? membershipFor(hit.slug) : null}
                    onJoin={openJoin}
                    hidden={false}
                  />
                )}
              />

              <div className="v1-hero-stats-bar">
                <span className="v1-hero-stat">
                  <span className="v1-hero-stat-n">{totalClubs}</span>
                  <span className="v1-hero-stat-l">Clubs</span>
                </span>
                <span className="v1-hero-stat">
                  <span className="v1-hero-stat-n">{verifiedCount}</span>
                  <span className="v1-hero-stat-l">Verified</span>
                </span>
              </div>
            </>
          ) : (
            // ── National /clubs — simplified, SweatPals-style compact search.
            //    A small (SEO-bearing) headline sits above the bar; the big
            //    italic headline and stats bar are gone. The search bar itself
            //    lives in a sticky dock just below the hero (see .v1c-natl
            //    below) so it pins to the top on scroll.
            <>
              <h1 className="v1c-search-h1">
                Run <span className="accent">Clubs &amp; Experiences</span> in India
              </h1>
            </>
          )}
        </div>
      </section>

      {/* National /clubs body. The search bar lives in a sticky dock that
          pins below the fixed nav on scroll; the whole national block is
          wrapped in .v1c-natl so the dock releases before the shared
          onboarding banner. When a search is committed the three discovery
          rails are replaced by two result lists (Events + Clubs); with no
          committed search the default rails show. Both live inside .v1c-exp
          so the result cards inherit its CSS vars (--exp-surf, --exp-bone-*,
          etc.). */}
      {!cityName && (
        <div className="v1c-natl">
          <span ref={dockSentinelRef} aria-hidden="true" className="v1c-searchdock-sentinel" />
          <div className={`v1c-searchdock${dockStuck ? ' is-stuck' : ''}`}>
            <div className="container">
              <ClubsSearchBar
                filters={searchFilters}
                showFilters={showFilters}
                onQChange={onQChange}
                onSubmit={submitSearch}
                onCityChange={onCityChange}
                onWindowToggle={onWindowToggle}
                onTypeToggle={onTypeToggle}
                onDistanceToggle={onDistanceToggle}
                onTagToggle={onTagToggle}
                onVerifiedToggle={onVerifiedToggle}
                onToggleFilters={() => setShowFilters((s) => !s)}
                onCloseFilters={() => setShowFilters(false)}
                onClearFilters={clearFilters}
              />
            </div>
          </div>

          {committedSearch && (
            <section className="v1c-exp" ref={searchResultsRef}>
              <div className="v1c-container">
                <div className="v1c-search-resulthead">
                  <h2 className="v1c-search-resulttitle">
                    {searchStatus === 'fallback' ? (
                      <>Nothing matched — here&rsquo;s what&rsquo;s on in <b>Mumbai</b></>
                    ) : (
                      <>
                        Results
                        {committedSearch.q ? <> for &ldquo;{committedSearch.q}&rdquo;</> : null}
                        {committedSearch.city ? <> in {cityLabelOf(committedSearch.city)}</> : null}
                      </>
                    )}
                  </h2>
                  <button type="button" className="v1c-search-clear" onClick={clearSearch}>
                    Clear search
                  </button>
                </div>

                {searchStatus === 'loading' && (
                  <div className="v1c-search-state">Searching…</div>
                )}
                {searchStatus === 'error' && (
                  <div className="v1c-search-state">
                    Couldn&rsquo;t load results.{' '}
                    <button type="button" className="v1c-search-retry" onClick={submitSearch}>
                      Try again
                    </button>
                  </div>
                )}

                {(searchStatus === 'ok' || searchStatus === 'fallback') && (
                  <>
                    {/* Result lists use the SAME rail markup as the default
                        discovery rails — a horizontal scroller of compact
                        cards with a See all toggle that expands to the grid —
                        so the layout doesn't change between browse and search. */}
                    {searchEvents.length > 0 && (
                      <section className="v1c-exp-rail">
                        <div className="v1c-exp-rail-head">
                          <h3 className="v1c-exp-rail-title">Events</h3>
                          {searchEvents.length > 4 && (
                            <button
                              type="button"
                              className="v1c-exp-seeall"
                              onClick={() => setOpenRail((p) => (p === 'search-ev' ? null : 'search-ev'))}
                              aria-expanded={openRail === 'search-ev'}
                            >
                              {openRail === 'search-ev' ? 'Show less' : 'See all'}
                            </button>
                          )}
                        </div>
                        <div className={openRail === 'search-ev' ? 'v1c-exp-grid' : 'v1c-exp-scroller v1c-exp-evlist'}>
                          {searchEvents.map((h) => (
                            <EventCard
                              key={h.id}
                              hit={h}
                              clubLogo={h.clubSlug ? clubLogoBySlug[h.clubSlug] : null}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                    {searchClubs.length > 0 && (
                      <section className="v1c-exp-rail">
                        <div className="v1c-exp-rail-head">
                          <h3 className="v1c-exp-rail-title">Clubs</h3>
                          {searchClubs.length > 4 && (
                            <button
                              type="button"
                              className="v1c-exp-seeall"
                              onClick={() => setOpenRail((p) => (p === 'search-cl' ? null : 'search-cl'))}
                              aria-expanded={openRail === 'search-cl'}
                            >
                              {openRail === 'search-cl' ? 'Show less' : 'See all'}
                            </button>
                          )}
                        </div>
                        <div className={openRail === 'search-cl' ? 'v1c-exp-grid' : 'v1c-exp-scroller'}>
                          {searchClubs.map((c) => (
                            <ExpClubCard key={c.id} c={c} />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Default discovery rails — shown when no search is committed.
              Three rails (around you, this weekend, run clubs by city). */}
          {!committedSearch && (eventsAround.length > 0 || eventsWeekend.length > 0 || clubs.length > 0) && (
            <section className="v1c-exp">
              <div className="v1c-container">
                {(() => {
                  // Same rails, order depends on the page identity: /clubs
                  // leads with the directory, /experiences with the events.
                  const clubsRail = <ClubsByCityRail key="clubs" clubs={clubs} />;
                  const eventRails = (
                    <>
                      <EventRail
                        key="around"
                        title={aroundCity ? `Upcoming Events in ${aroundCity}` : 'Upcoming Events'}
                        hits={eventsAround}
                        clubLogos={clubLogoBySlug}
                        isOpen={openRail === 'around'}
                        onToggle={() => setOpenRail((p) => (p === 'around' ? null : 'around'))}
                      />
                      <EventRail
                        key="weekend"
                        title="Events this weekend"
                        hits={eventsWeekend}
                        clubLogos={clubLogoBySlug}
                        isOpen={openRail === 'weekend'}
                        onToggle={() => setOpenRail((p) => (p === 'weekend' ? null : 'weekend'))}
                      />
                    </>
                  );
                  return variant === 'clubs' ? (
                    <>{clubsRail}{eventRails}</>
                  ) : (
                    <>{eventRails}{clubsRail}</>
                  );
                })()}
              </div>
            </section>
          )}
        </div>
      )}

      {cityName && !isSearching && (
        <>
          {/* Featured — top 5 by member count, full ApiClub data.
              Original FlagshipCard verbatim: bg image, logo, 4-stat
              grid, tags, next-run footer with location + distance.
              City pages only — the national page leads with the rails. */}
          {featuredFull.length > 0 && (
            <section className="v1c-featured">
              <div className="v1c-container">
                <div className="v1c-section-header">
                  <h2 className="v1c-section-title">
                    Featured <b>clubs</b>
                  </h2>
                  <span className="v1c-section-count">Top {featuredFull.length} by members</span>
                </div>
                <div className="v1c-flagship-grid">
                  {featuredFull.map((c, i) => (
                    <FlagshipCard
                      key={c.slug}
                      c={c}
                      membership={membershipFor(c.slug)}
                      onJoin={openJoin}
                      isLcp={i === 0}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All clubs grid — ALL clubs in SSR HTML (SEO), visual-only
              pagination via .is-hidden. Cards use the original portrait
              design with image + logo overlay + tags + members + next-run.
              Pagination shows at top AND bottom so the user can flip
              pages without scrolling to the foot every time.
              City pages only: this directory IS the city landing page's
              content. The national /clubs page leads with the discovery
              rails instead (the all-clubs ItemList JSON-LD in page.tsx
              still exposes the full directory to crawlers). */}
          {cityName && (
          <section className="v1c-clubs-section">
            <div className="v1c-container">
              <div className="v1c-section-header">
                <h2 className="v1c-section-title">
                  Every run club in <b className="v1c-red">{cityName ?? 'India'}</b>
                </h2>
                <span className="v1c-section-count">
                  Showing {visibleStart + 1}–{visibleEnd} of {totalClubs}
                </span>
              </div>

              <PaginationBar
                pageIndex={pageIndex}
                totalPages={totalPages}
                onChange={gotoPage}
              />

              <div className="v1c-clubs-grid">
                {clubs.map((c, i) => (
                  <ClubCard
                    key={c.id}
                    c={c}
                    membership={c.slug ? membershipFor(c.slug) : null}
                    onJoin={openJoin}
                    hidden={i < visibleStart || i >= visibleEnd}
                  />
                ))}
              </div>

              <PaginationBar
                pageIndex={pageIndex}
                totalPages={totalPages}
                onChange={gotoPage}
                position="bottom"
              />
            </div>
          </section>
          )}
        </>
      )}

      {/* Onboard banner — always visible */}
      <section className="v1c-onboard-section">
        <div className="v1c-container">
          <OnboardClubBanner />
        </div>
      </section>

      {/* Studio promotion tabs — city pages only (dropped from the national
          /clubs page, which now leads with the discovery rails). */}
      {cityName && (
      <section className="v1c-admin-section">
        <div className="v1c-container">
          <div className="v1c-admin-head">
            <div className="v1c-admin-kicker">Inside Endorfin Studio</div>
            <h2>
              Manage your club<br />like a <b className="v1c-red">pro.</b>
            </h2>
            <p className="v1c-admin-deck">
              The four things you actually do every week — without the spreadsheet,
              the 400-person WhatsApp group, or the 5am &ldquo;where do we meet?&rdquo; messages.
            </p>
          </div>
          <div className="v1c-admin-tabs" role="tablist">
            {TAB_ORDER.map((t) => (
              <button
                key={t.key}
                className={`v1c-admin-tab ${activeTab === t.key ? 'is-active' : ''}`}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <AdminPanel data={ADMIN_PANELS[activeTab]} />
          <div className="v1c-admin-foot">
            {/* Auth-gated: signed-in users go straight to the studio; signed
                -out visitors are routed through login first (which returns
                them to the studio) rather than appearing to already be in. */}
            <Link
              href={isAuthed ? '/admin/studio' : '/?login=1&next=%2Fadmin%2Fstudio'}
              className="v1c-btn v1c-btn-ghost"
            >
              Manage your club →
            </Link>
          </div>
        </div>
      </section>
      )}

      <JoinClubModal
        isOpen={modal?.kind === 'join'}
        onClose={closeModal}
        slug={modal?.club.slug ?? ''}
        clubName={modal?.club.name ?? ''}
        joinForm={null}
        requiresApproval={false}
        isAuthed={isAuthed}
      />
      <ClaimClubModal
        isOpen={modal?.kind === 'claim'}
        onClose={closeModal}
        slug={modal?.club.slug ?? ''}
        clubName={modal?.club.name ?? ''}
        isAuthed={isAuthed}
        userEmail={userEmail}
      />
      {claimBySlug && null}
    </>
  );
}
