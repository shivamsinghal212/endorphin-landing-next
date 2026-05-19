'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';
import { useStoreLink } from '@/lib/use-store-link';
import { TOP_CITIES, locationMatchesCity } from '@/lib/cities';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
} from '@/lib/club-city-pages';
import { ClaimClubModal } from './[slug]/claim-club-link';
import { JoinClubModal } from './[slug]/join-club-modal';
import type { MyClubClaim, MyClubMembership } from '@/lib/api';
import type { ApiClub, ClubEvent } from './page';

type Membership = MyClubMembership;
type Claim = MyClubClaim;

const matchesCity = (club: ApiClub, city: string) => locationMatchesCity(club.city, city);

function initials(name: string) {
  const w = (name || '').trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

function pickFlagships(all: ApiClub[], city: string, _cities: readonly string[]): ApiClub[] {
  const pool = all.filter((c) => c.isFeatured);
  const scoped = city ? pool.filter((c) => matchesCity(c, city)) : pool;
  return scoped.sort((a, b) => {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return tb - ta;
  });
}

// Pin to IST so SSR (UTC server) and the client (any TZ) format dates
// identically — without timeZone, locale formatting uses the runtime's
// local zone and hydration mismatches (React #418) for anyone outside it.
const IST = 'Asia/Kolkata';

function fmtDayShort(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
}

function fmtDateFull(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'long', timeZone: IST });
}

function fmtTimeShort(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
}

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

// ─── Verified tick (inline svg) ─────────────
const VerifiedTick = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    aria-label="Verified"
  >
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.8 5.8a1 1 0 01-1.4 0L7 12.6a1 1 0 011.4-1.4l1.8 1.8 5.1-5.1a1 1 0 011.4 1.4z"
    />
  </svg>
);

// ─── Membership CTA ─────────────────────────
// Renders the primary action slot on listing cards based on the user's
// relationship to the club. Falls back to the Join button when there is no
// active membership and no pending request.

function MembershipCta({
  club,
  membership,
  onJoin,
  className,
}: {
  club: ApiClub;
  membership: Membership | null;
  onJoin: (club: ApiClub) => void;
  /** Extra class for the compact sizing variant on ClubCard's Join button. */
  className?: string;
}) {
  const status = membership?.status;
  const role = membership?.role;

  if (status === 'active' && role === 'owner') {
    return (
      <span
        className={`v1c-btn v1c-btn-owner ${className ?? ''}`}
        role="status"
        aria-label={`You own ${club.name}`}
      >
        Your club
      </span>
    );
  }
  if (status === 'active' && role === 'admin') {
    return (
      <span
        className={`v1c-btn v1c-btn-owner ${className ?? ''}`}
        role="status"
        aria-label={`You admin ${club.name}`}
      >
        Club admin
      </span>
    );
  }
  if (status === 'active' && role === 'member') {
    return (
      <span
        className={`v1c-btn v1c-btn-success ${className ?? ''}`}
        role="status"
        aria-label={`Already a member of ${club.name}`}
      >
        Already a member
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span
        className={`v1c-btn v1c-btn-pending ${className ?? ''}`}
        role="status"
        aria-label={`Pending request for ${club.name}`}
      >
        Request pending
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`v1c-btn v1c-btn-primary ${className ?? ''}`}
      onClick={() => onJoin(club)}
    >
      Join club
    </button>
  );
}

// Show the Claim CTA only when the club is unclaimed, the viewer isn't
// already an owner/admin (they can't claim what they already run), and the
// viewer doesn't already have a pending claim on the club (in which case a
// muted indicator takes its place instead).
function shouldShowClaim(
  club: ApiClub,
  membership: Membership | null,
  claim: Claim | null,
): boolean {
  if (club.isClaimed) return false;
  if (membership?.status === 'active' && (membership.role === 'owner' || membership.role === 'admin')) return false;
  if (claim?.status === 'pending') return false;
  return true;
}

// ─── Flagship card ──────────────────────────

function FlagshipCard({
  c,
  membership,
  claim,
  onJoin,
  onClaim,
}: {
  c: ApiClub;
  membership: Membership | null;
  claim: Claim | null;
  onJoin: (club: ApiClub) => void;
  onClaim: (club: ApiClub) => void;
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
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                initials(c.name)
              )}
            </div>
            <h3 className="v1c-flagship-title">{c.name}</h3>
          </div>
          {c.subtitle && <p className="v1c-flagship-subtitle">{c.subtitle}</p>}
        </div>
        <div className="v1c-flagship-stats">
          <div className="v1c-flagship-stat-block">
            <div className="v1c-flagship-stat-label">Members</div>
            <div className="v1c-flagship-stat-value">
              {(stats.members || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="v1c-flagship-stat-block">
            <div className="v1c-flagship-stat-label">Runs / month</div>
            <div className="v1c-flagship-stat-value">{stats.runsThisMonth || 0}</div>
          </div>
          <div className="v1c-flagship-stat-block">
            <div className="v1c-flagship-stat-label">Km / month</div>
            <div className="v1c-flagship-stat-value">{stats.kmThisMonth || 0}</div>
          </div>
          <div className="v1c-flagship-stat-block">
            <div className="v1c-flagship-stat-label">Years</div>
            <div className="v1c-flagship-stat-value">{stats.yearsRunning || 0}</div>
          </div>
        </div>
      </div>
      <div className="v1c-flagship-side">
        <div>
          {c.tags && c.tags.length > 0 && (
            <div className="v1c-flagship-tags">
              {c.tags.map((t) => (
                <span key={t} className="v1c-flagship-tag">
                  {t}
                </span>
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
          <MembershipCta club={c} membership={membership} onJoin={onJoin} />
          <Link href={href} className="v1c-btn v1c-btn-ghost-light">
            View details →
          </Link>
          {claim?.status === 'pending' ? (
            <span className="v1c-claim-pending v1c-flagship-claim-link">
              Claim review pending
            </span>
          ) : shouldShowClaim(c, membership, claim) ? (
            <button
              type="button"
              className="v1c-flagship-claim-link"
              onClick={() => onClaim(c)}
            >
              Run this club? Claim ownership →
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ─── Club card (dark grid) ──────────────────

function ClubCard({
  c,
  membership,
  claim,
  onJoin,
  onClaim,
}: {
  c: ApiClub;
  membership: Membership | null;
  claim: Claim | null;
  onJoin: (club: ApiClub) => void;
  onClaim: (club: ApiClub) => void;
}) {
  const stats = c.stats || {};
  const nr = pickNextEvent(c.events);
  const href = `/clubs/${c.slug}`;

  const headerImg = c.headerImageUrl || c.logoUrl || null;
  const headerIsLogoFallback = !c.headerImageUrl && !!c.logoUrl;

  return (
    <article className="v1c-club-card">
      <Link href={href} className="v1c-club-card-body-link" aria-label={`View ${c.name}`}>
        <div className="v1c-club-card-header">
          <div className="v1c-club-card-header-fallback">{initials(c.name)}</div>
          {headerImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headerImg}
              alt={c.name}
              loading="lazy"
              className={headerIsLogoFallback ? 'is-logo-fallback' : ''}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
        <div className="v1c-club-card-body">
          <div className="v1c-club-card-logo">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoUrl}
                alt={`${c.name} logo`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              initials(c.name)
            )}
          </div>
          <div className="v1c-club-card-top">
            <h3 className="v1c-club-card-title">{c.name}</h3>
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
                <span key={t} className="v1c-club-card-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="v1c-club-card-foot">
            <span className="v1c-club-card-stat">
              <strong>{(stats.members || 0).toLocaleString('en-IN')}</strong> members
            </span>
            {nr && (
              <span className="v1c-club-card-nextrun">
                {fmtDayShort(nr.startTime)} · {nr.distanceKm != null ? `${nr.distanceKm}K` : '—'}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="v1c-club-card-actions">
        <MembershipCta
          club={c}
          membership={membership}
          onJoin={onJoin}
          className="v1c-club-card-join"
        />
        {claim?.status === 'pending' ? (
          <span className="v1c-claim-pending v1c-club-card-claim-link">
            Claim review pending
          </span>
        ) : shouldShowClaim(c, membership, claim) ? (
          <button
            type="button"
            className="v1c-club-card-claim-link"
            onClick={() => onClaim(c)}
          >
            Run this club? Claim ownership →
          </button>
        ) : (
          // Invisible placeholder — keeps all cards in the carousel the
          // same height regardless of whether the claim CTA is applicable.
          <span
            aria-hidden
            className="v1c-club-card-claim-link"
            style={{ visibility: 'hidden', pointerEvents: 'none' }}
          >
            Run this club? Claim ownership →
          </span>
        )}
      </div>
    </article>
  );
}

// ─── Onboard-your-club banner ───────────────
// Self-serve nudge for club organisers whose club isn't in the directory.
// Opens a prefilled mailto: to the team — no backend dependency.

function OnboardClubBanner() {
  const [handle, setHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const cleanHandle = (raw: string) =>
    raw
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@/, '');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanHandle(handle);
    if (!cleaned) return;
    posthog.capture('club_onboard_request', { instagram_handle: cleaned });
    const subject = `Onboard my run club — @${cleaned}`;
    const body =
      `Hi Endorfin team,\n\n` +
      `I'd like to get my run club listed on Endorfin.\n\n` +
      `Instagram: https://instagram.com/${cleaned}\n\n` +
      `Looking forward to hearing from you.`;
    const mailto = `mailto:hello@endorfin.run?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  }

  return (
    <div className="v1c-onboard-card">
      <div className="v1c-onboard-copy">
        <span className="v1c-onboard-kicker">For club organisers</span>
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
            If your email client didn&rsquo;t open, write to{' '}
            <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
          </span>
        </div>
      ) : (
        <form className="v1c-onboard-form" onSubmit={onSubmit}>
          <div className="v1c-onboard-input-wrap">
            <span className="v1c-onboard-input-prefix" aria-hidden>
              @
            </span>
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

// ─── Admin tabs data ────────────────────────

type AdminTab = 'members' | 'events' | 'rsvps' | 'profile';

interface AdminMockRow {
  avatar: string;
  avatarRed?: boolean;
  rank?: number;
  name: string;
  meta: string;
  action: string;
  actionKind: 'yes' | 'muted' | 'gold';
}

interface AdminPanelData {
  num: string;
  heading: string;
  copy: string;
  bullets: string[];
  mock: {
    title: string;
    titleStrong: string;
    rightMeta: string;
    rows: AdminMockRow[];
  };
}

// Each tab maps to a real Endorfin Studio surface:
//   members → /admin/studio/[slug]/members
//   events  → /admin/studio/[slug]/events
//   rsvps   → /admin/studio/[slug]/rsvps
//   profile → /admin/studio/[slug]/{about,social,admins,join-form}
const ADMIN_PANELS: Record<AdminTab, AdminPanelData> = {
  members: {
    num: '01',
    heading: 'Approve the runners who’ll show up.',
    copy: 'Every join request lands in Studio with the answers you asked for — pace, goals, whatever you put on the form. Approve in a tap. Promote anyone to co-admin.',
    bullets: [
      'Pending requests with full join-form answers',
      'Approve, decline (with optional reason)',
      'Promote members → co-admins',
    ],
    mock: {
      titleStrong: 'Pending',
      title: ' · 3 requests',
      rightMeta: 'Today',
      rows: [
        { avatar: 'AK', name: 'Aarav Kapoor', meta: '5:30/km · training for ADHM', action: 'Approve', actionKind: 'yes' },
        { avatar: 'SM', name: 'Simran Mehta', meta: '6:10/km · returning runner', action: 'Approve', actionKind: 'yes' },
        { avatar: 'VI', name: 'Vikram Iyer', meta: '4:50/km · sub-90 half goal', action: 'Approve', actionKind: 'yes' },
        { avatar: 'NP', name: 'Neel Patil', meta: 'New to running · friend of Aarav', action: 'Review', actionKind: 'muted' },
      ],
    },
  },
  events: {
    num: '02',
    heading: 'Plan runs, not logistics.',
    copy: 'Schedule the next run with start time, meet point, and distance. Members see it in the app the moment you publish. Free or paid — your call. No more "where do we meet?" at 5am.',
    bullets: [
      'Date, time, start point, distance',
      'Free runs or paid events with ₹ at signup',
      'Upcoming + past archive in one place',
    ],
    mock: {
      titleStrong: 'Upcoming',
      title: ' · this week',
      rightMeta: '+ New event',
      rows: [
        { avatar: 'SU', avatarRed: true, name: 'Sunday Long Run · 25K', meta: '26 May · 5:30 am · Marine Drive', action: '48 going', actionKind: 'muted' },
        { avatar: 'TT', name: 'Track Workout · paid', meta: '28 May · 6:00 am · ₹300 · 14 paid', action: '₹300', actionKind: 'gold' },
        { avatar: 'TE', name: 'Tempo Tuesday · 8K', meta: '29 May · 6:00 am · JLN Track', action: '22 going', actionKind: 'muted' },
        { avatar: 'RR', name: 'Recovery Saturday · 5K', meta: '03 Jun · 7:00 am · Lodhi Garden', action: '12 going', actionKind: 'muted' },
      ],
    },
  },
  rsvps: {
    num: '03',
    heading: 'Know who’s actually showing up.',
    copy: 'Pick any upcoming run. See the full roster — first-timers, regulars, the people you should say hi to. No more flying blind to the start point.',
    bullets: [
      'Per-event roster with avatars + names',
      'Live going count, refreshed in real time',
      'Spot first-timers before they arrive',
    ],
    mock: {
      titleStrong: 'Sunday Long Run',
      title: ' · 25K · 48 going',
      rightMeta: 'Live',
      rows: [
        { avatar: 'RJ', name: 'Rhea Joshi', meta: 'Regular · 14 runs with the club', action: 'Going', actionKind: 'yes' },
        { avatar: 'DK', name: 'Dev Khurana', meta: 'Regular · 11 runs', action: 'Going', actionKind: 'yes' },
        { avatar: 'AP', avatarRed: true, name: 'Anu Prasad', meta: 'First-timer · joined yesterday', action: 'Going', actionKind: 'gold' },
        { avatar: 'SM', name: 'Sanjay Mishra', meta: 'Regular · PB chase day', action: 'Going', actionKind: 'yes' },
      ],
    },
  },
  profile: {
    num: '04',
    heading: 'A public listing that represents you.',
    copy: 'Tagline, city, year, tags. Link WhatsApp, Instagram, Strava. Customise the join form. Add co-admins so you’re not the bottleneck. Your club, the way you want it on the internet.',
    bullets: [
      'About · tagline · tags · established year',
      'Linked channels: WhatsApp · Instagram · Strava',
      'Custom join form + approval toggle',
    ],
    mock: {
      titleStrong: 'Public listing',
      title: ' · Live',
      rightMeta: 'View public →',
      rows: [
        { avatar: '✎', name: 'About', meta: 'Morning runs across South Delhi · since 2019', action: 'Edit', actionKind: 'yes' },
        { avatar: '◎', name: 'Social & links', meta: 'WhatsApp ✓ · Instagram ✓ · Strava —', action: 'Edit', actionKind: 'yes' },
        { avatar: '✦', name: 'Join form', meta: '3 questions · approval required', action: 'Customise', actionKind: 'yes' },
        { avatar: '◐', name: 'Co-admins', meta: 'You + 2 others can edit this club', action: 'Manage', actionKind: 'yes' },
      ],
    },
  },
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
            <div key={b} className="v1c-admin-panel-list-item">
              {b}
            </div>
          ))}
        </div>
      </div>
      <div className="v1c-admin-mock">
        <div className="v1c-admin-mock-head">
          <span>
            <strong>{data.mock.titleStrong}</strong>
            {data.mock.title}
          </span>
          <span>{data.mock.rightMeta}</span>
        </div>
        <div className="v1c-admin-mock-rows">
          {data.mock.rows.map((row, i) => (
            <div key={i} className="v1c-admin-mock-row">
              {row.rank != null && (
                <span className="v1c-admin-mock-row-rank">{row.rank}</span>
              )}
              <div className={`v1c-admin-mock-av ${row.avatarRed ? 'red' : ''}`}>
                {row.avatar}
              </div>
              <div className="v1c-admin-mock-main">
                <div className="v1c-admin-mock-name">{row.name}</div>
                <div className="v1c-admin-mock-meta">{row.meta}</div>
              </div>
              <span className={`v1c-admin-mock-action ${row.actionKind}`}>
                {row.action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────

export default function ClubsView({
  clubs: initialClubs,
  membershipBySlug = {},
  claimBySlug = {},
  isAuthed = false,
  userEmail = null,
}: {
  clubs: ApiClub[];
  membershipBySlug?: Record<string, Membership>;
  claimBySlug?: Record<string, Claim>;
  isAuthed?: boolean;
  userEmail?: string | null;
}) {
  const membershipFor = useCallback(
    (slug: string): Membership | null => membershipBySlug[slug] ?? null,
    [membershipBySlug],
  );
  const claimFor = useCallback(
    (slug: string): Claim | null => claimBySlug[slug] ?? null,
    [claimBySlug],
  );
  const [allClubs, setAllClubs] = useState<ApiClub[]>(initialClubs);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [modal, setModal] = useState<{ kind: 'join' | 'claim'; club: ApiClub } | null>(null);
  const downloadHref = useStoreLink('#download');

  const openJoin = useCallback((club: ApiClub) => setModal({ kind: 'join', club }), []);
  const openClaim = useCallback((club: ApiClub) => setModal({ kind: 'claim', club }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // Client-side refresh on mount — also a fallback when the server fetch
  // failed during build/ISR.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://api.endorfin.run/api/v1/clubs', { cache: 'no-store' });
        if (!res.ok) return;
        const listed = (await res.json()) as { slug: string }[];
        if (!Array.isArray(listed) || !listed.length) return;
        const details = await Promise.all(
          listed.map(async (c): Promise<ApiClub | null> => {
            try {
              const [detailRes, eventsRes] = await Promise.all([
                fetch(`https://api.endorfin.run/api/v1/clubs/${c.slug}`, {
                  cache: 'no-store',
                }),
                fetch(`https://api.endorfin.run/api/v1/clubs/${c.slug}/events`, {
                  cache: 'no-store',
                }),
              ]);
              if (!detailRes.ok) return null;
              const d = (await detailRes.json()) as ApiClub;
              const events = eventsRes.ok ? ((await eventsRes.json()) as ClubEvent[]) : [];
              return { ...d, events: Array.isArray(events) ? events : [] };
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;
        const fresh = details.filter((x): x is ApiClub => !!x && !!x.slug);
        if (fresh.length) setAllClubs(fresh);
      } catch {
        // swallow — keep server-rendered list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (currentCity ? allClubs.filter((c) => matchesCity(c, currentCity)) : allClubs),
    [allClubs, currentCity]
  );
  const flagships = useMemo(
    () => pickFlagships(allClubs, currentCity, TOP_CITIES),
    [allClubs, currentCity]
  );
  const grid = filtered;

  // Top cities first (canonical order, only those with clubs), then every
  // remaining city sorted by club count. Mirrors the races page.
  const cityChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allClubs) {
      const city = (c.city || '').trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    const topCounts = new Map<string, number>();
    TOP_CITIES.forEach((c) => {
      const n = allClubs.filter((cl) => matchesCity(cl, c)).length;
      if (n > 0) topCounts.set(c, n);
    });
    const top = TOP_CITIES.filter((c) => topCounts.has(c)).map((c) => ({
      name: c as string,
      count: topCounts.get(c)!,
    }));
    // Skip cities already represented by a TOP_CITIES bucket (handled by
    // CITY_ALIASES via matchesCity), and skip empty names.
    const topAliases = new Set<string>();
    for (const c of TOP_CITIES) {
      for (const cl of allClubs) {
        if (matchesCity(cl, c) && cl.city) topAliases.add(cl.city.trim());
      }
    }
    const extras = Array.from(counts.entries())
      .filter(([name]) => !topAliases.has(name))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
    return [...top, ...extras];
  }, [allClubs]);

  // SEO city landers: only surface cities with enough clubs so we
  // don't link to a /run-clubs/[city] page that 404s.
  const cityPageLinks = useMemo(
    () =>
      CLUB_CITY_PAGES
        .map((p) => ({ page: p, count: clubsForCityPage(allClubs, p).length }))
        .filter((x) => x.count >= MIN_CLUBS_PER_CITY)
        .sort((a, b) => b.count - a.count),
    [allClubs],
  );

  const uniqueCities = useMemo(() => {
    const set = new Set(allClubs.map((c) => (c.city || '').trim()).filter(Boolean));
    return set.size;
  }, [allClubs]);

  const ribbonNames = useMemo(
    () => allClubs.slice(0, 10).map((c) => (c.name || '').toUpperCase()),
    [allClubs]
  );

  // Carousel refs + control state
  const flagRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [flagPrev, setFlagPrev] = useState(true);
  const [flagNext, setFlagNext] = useState(true);
  const [flagCanScroll, setFlagCanScroll] = useState(false);
  const [flagActive, setFlagActive] = useState(0);

  const [gridPrev, setGridPrev] = useState(true);
  const [gridNext, setGridNext] = useState(true);
  const [gridCanScroll, setGridCanScroll] = useState(false);
  const [progressLeft, setProgressLeft] = useState(0);
  const [progressWidth, setProgressWidth] = useState(100);

  const flagStep = useCallback(() => {
    const el = flagRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1c-flagship-card') as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || '18') || 18;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const gridStep = useCallback(() => {
    const el = gridRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1c-club-card') as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || '18') || 18;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const updateFlag = useCallback(() => {
    const el = flagRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setFlagCanScroll(max > 2);
    setFlagPrev(x <= 2);
    setFlagNext(x >= max - 2 || max <= 0);
    const step = flagStep();
    setFlagActive(step > 0 ? Math.round(x / step) : 0);
  }, [flagStep]);

  const updateGrid = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setGridCanScroll(max > 2);
    setGridPrev(x <= 2);
    setGridNext(x >= max - 2 || max <= 0);
    if (max > 0) {
      const viewportRatio = Math.min(1, el.clientWidth / el.scrollWidth);
      const scrollRatio = x / max;
      const travel = (1 - viewportRatio) * 100;
      setProgressLeft(scrollRatio * travel);
      setProgressWidth(viewportRatio * 100);
    } else {
      setProgressLeft(0);
      setProgressWidth(100);
    }
  }, []);

  useEffect(() => {
    if (flagRef.current) flagRef.current.scrollLeft = 0;
    requestAnimationFrame(updateFlag);
  }, [flagships, updateFlag]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollLeft = 0;
    requestAnimationFrame(updateGrid);
  }, [grid, updateGrid]);

  useEffect(() => {
    const onResize = () => {
      requestAnimationFrame(() => {
        updateFlag();
        updateGrid();
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateFlag, updateGrid]);

  const scrollFlag = (dir: 1 | -1) =>
    flagRef.current?.scrollBy({ left: dir * flagStep(), behavior: 'smooth' });
  const scrollGrid = (dir: 1 | -1) =>
    gridRef.current?.scrollBy({ left: dir * gridStep(), behavior: 'smooth' });

  const scope = currentCity || 'India';
  const singleGrid = grid.length === 1;

  const onFlagKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollFlag(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollFlag(-1);
    }
  };
  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollGrid(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollGrid(-1);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="v1c-hero">
        <div className="v1c-hero-bg" aria-hidden />
        <div className="v1c-container">
          <h1 className="v1c-hero-title">
            Every run club<br />in India. <span className="v1c-red">Listed.</span>
          </h1>

          <div className="v1c-hero-foot">
            <p className="v1c-hero-sub">
              Find your crew. Morning runs, marathon training, trail weekends — a verified directory of run clubs
              across India. Show up with people who run your pace.
            </p>
            <div className="v1c-hero-stats">
              <div>
                <div className="v1c-hero-stat-n">{allClubs.length}+</div>
                <div className="v1c-hero-stat-l">Clubs</div>
              </div>
              <div>
                <div className="v1c-hero-stat-n">{uniqueCities}+</div>
                <div className="v1c-hero-stat-l">Cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      {ribbonNames.length > 0 && (
        <div className="v1c-ribbon" aria-hidden>
          <div className="v1c-ribbon-track">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ display: 'inline-flex' }}>
                {ribbonNames.map((n, j) => (
                  <span key={`${i}-${j}`}>{n} ·</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <section className="v1c-filter-strip">
        <div className="v1c-container">
          <div className="v1c-filter-row">
            <span className="v1c-filter-label">By City</span>
            <div className="v1c-filter-chips">
              <button
                className={`v1c-chip ${!currentCity ? 'is-active' : ''}`}
                onClick={() => setCurrentCity('')}
                aria-pressed={!currentCity}
              >
                All India <span className="v1c-count">{allClubs.length}</span>
              </button>
              {cityChips.map(({ name, count }) => (
                <button
                  key={name}
                  className={`v1c-chip ${currentCity === name ? 'is-active' : ''}`}
                  onClick={() => setCurrentCity(name)}
                  aria-pressed={currentCity === name}
                >
                  {name} <span className="v1c-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
          {cityPageLinks.length > 0 && (
            <div
              className="v1c-filter-row"
              style={{ marginTop: 10, alignItems: 'flex-start' }}
            >
              <span className="v1c-filter-label">Browse by city</span>
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {cityPageLinks.map(({ page, count }) => (
                  <li key={page.slug}>
                    <Link
                      href={`/run-clubs/${page.slug}`}
                      className="v1c-chip"
                      style={{ textDecoration: 'none' }}
                    >
                      Run clubs in {page.name}{' '}
                      <span className="v1c-count">{count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Flagship */}
      {flagships.length > 0 && (
        <section className="v1c-featured">
          <div className="v1c-container">
            <div className="v1c-section-header">
              <h2 className="v1c-section-title">
                Featured Clubs in <b>{scope}</b>
              </h2>
              <div className="v1c-flagship-header-right">
                <span className="v1c-section-count">
                  {flagships.length === 1 ? '1 club' : `${flagships.length} clubs`}
                </span>
                <div className="v1c-carousel-controls" hidden={!flagCanScroll} role="group">
                  <button
                    className="v1c-carousel-btn"
                    disabled={flagPrev}
                    onClick={() => scrollFlag(-1)}
                    aria-label="Previous flagship"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="v1c-carousel-btn"
                    disabled={flagNext}
                    onClick={() => scrollFlag(1)}
                    aria-label="Next flagship"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="v1c-flagship-carousel-wrap">
              <div
                className="v1c-flagship-carousel"
                ref={flagRef}
                onScroll={() => requestAnimationFrame(updateFlag)}
                onKeyDown={onFlagKey}
                tabIndex={0}
                role="region"
                aria-label="Flagship clubs"
              >
                {flagships.map((c) => (
                  <FlagshipCard
                    key={c.slug}
                    c={c}
                    membership={membershipFor(c.slug)}
                    claim={claimFor(c.slug)}
                    onJoin={openJoin}
                    onClaim={openClaim}
                  />
                ))}
              </div>
            </div>

            {flagships.length > 1 && (
              <div className="v1c-flagship-dots" role="tablist" aria-label="Flagship pagination">
                {flagships.map((_, i) => (
                  <button
                    key={i}
                    className={`v1c-flagship-dot ${i === flagActive ? 'is-active' : ''}`}
                    aria-label={`Flagship ${i + 1} of ${flagships.length}`}
                    aria-selected={i === flagActive}
                    role="tab"
                    onClick={() => flagRef.current?.scrollTo({ left: i * flagStep(), behavior: 'smooth' })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Clubs directory */}
      <section className="v1c-clubs-section">
        <div className="v1c-container">
          <div className="v1c-section-header">
            <h2 className="v1c-section-title">
              Explore clubs in <b className="v1c-red">{scope}</b>.
            </h2>
            <div className="v1c-clubs-header-right">
              <span className="v1c-section-count">
                {grid.length === 0 ? '0 clubs' : `Showing ${grid.length} of ${filtered.length}`}
              </span>
              <div className="v1c-carousel-controls" hidden={!gridCanScroll} role="group">
                <button
                  className="v1c-carousel-btn"
                  disabled={gridPrev}
                  onClick={() => scrollGrid(-1)}
                  aria-label="Previous clubs"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="v1c-carousel-btn"
                  disabled={gridNext}
                  onClick={() => scrollGrid(1)}
                  aria-label="Next clubs"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className={`v1c-clubs-carousel-wrap ${singleGrid ? 'is-single-wrap' : ''}`}>
            <div
              className={`v1c-clubs-carousel ${singleGrid ? 'is-single' : ''}`}
              ref={gridRef}
              onScroll={() => requestAnimationFrame(updateGrid)}
              onKeyDown={onGridKey}
              tabIndex={0}
              role="region"
              aria-label="Run clubs"
            >
              {grid.length === 0 ? (
                <div className="v1c-empty-state">
                  No clubs{currentCity ? ` in ${currentCity}` : ''} yet. Check back soon.
                </div>
              ) : (
                grid.map((c) => (
                  <ClubCard
                    key={c.slug}
                    c={c}
                    membership={membershipFor(c.slug)}
                    claim={claimFor(c.slug)}
                    onJoin={openJoin}
                    onClaim={openClaim}
                  />
                ))
              )}
            </div>
          </div>

          <div className="v1c-carousel-foot">
            <div className="v1c-carousel-progress" hidden={!gridCanScroll} aria-hidden>
              <div
                className="v1c-carousel-progress-bar"
                style={{ left: `${progressLeft}%`, width: `${progressWidth}%` }}
              />
            </div>
            <div className="v1c-clubs-more">
              <a href={downloadHref} className="v1c-btn v1c-btn-ghost">
                Browse all clubs in the app →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Onboard-your-club banner */}
      <section className="v1c-onboard-section">
        <div className="v1c-container">
          <OnboardClubBanner />
        </div>
      </section>

      {/* Admin tabs */}
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
            <Link href="/admin/studio" className="v1c-btn v1c-btn-ghost">
              Open Endorfin Studio →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="v1c-cta-footer" id="download">
        <div className="v1c-container v1c-cta-grid">
          <div>
            <h2 className="v1c-cta-heading">
              Your crew<br />is already <span className="v1c-red">out</span><br />there.
            </h2>
            <p className="v1c-cta-sub">
              Install Endorfin. Join verified clubs, show up to weekly runs, build your crew. Free on Android and
              iOS.
            </p>
          </div>
          <div className="v1c-cta-buttons">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="v1c-btn v1c-btn-ghost-light"
            >
              <svg className="v1c-btn-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"
                />
              </svg>
              App Store
            </Link>
            <Link
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="v1c-btn v1c-btn-primary"
            >
              <svg className="v1c-btn-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"
                />
              </svg>
              Google Play
            </Link>
          </div>
        </div>
      </section>

      <JoinClubModal
        isOpen={modal?.kind === 'join'}
        onClose={closeModal}
        slug={modal?.club.slug ?? ''}
        clubName={modal?.club.name ?? ''}
        joinForm={modal?.club.joinForm ?? null}
        requiresApproval={modal?.club.requiresApproval ?? false}
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
    </>
  );
}
