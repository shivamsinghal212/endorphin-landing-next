'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
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
          <div className="v1c-club-card-foot">
            {membersFormatted && (
              <span className="v1c-club-card-stat">
                <strong>{membersFormatted}</strong> members
              </span>
            )}
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
    const mailto = `mailto:hello@endorfin.run?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

// ─── Main view ──────────────────────────────

export default function ClubsView({
  clubs,
  featuredFull,
  cityFacets,
  membershipBySlug = {},
  claimBySlug = {},
  isAuthed = false,
  userEmail = null,
}: {
  // Lean shape powering the all-clubs grid (SSR'd ~112 anchors for SEO).
  clubs: DiscoverHit[];
  // Rich shape powering the featured-5 strip — stats, tags, events.
  // Fetched separately in page.tsx because /discover/smart doesn't
  // surface runs_this_month / km_this_month / years_running / events[].
  featuredFull: ApiClub[];
  cityFacets: { value: string; count: number }[];
  membershipBySlug?: Record<string, Membership>;
  claimBySlug?: Record<string, Claim>;
  isAuthed?: boolean;
  userEmail?: string | null;
}) {
  const [isSearching, setIsSearching] = useState(false);
  // Page index instead of "visible count" — we paginate now (Prev/Next at
  // top + bottom) rather than infinite-scroll appending. All cards stay
  // in the SSR HTML for SEO; the page state just toggles which range is
  // visible via .is-hidden.
  const [pageIndex, setPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [modal, setModal] = useState<{ kind: 'join' | 'claim'; club: { name: string; slug: string } } | null>(null);

  const openJoin = useCallback((club: { name: string; slug: string }) => setModal({ kind: 'join', club }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // featuredFull is already top-5-by-members from page.tsx — no further
  // slicing needed here.
  const totalClubs = clubs.length;
  const totalPages = Math.max(1, Math.ceil(totalClubs / PAGE_SIZE));
  const visibleStart = pageIndex * PAGE_SIZE;
  const visibleEnd = Math.min(visibleStart + PAGE_SIZE, totalClubs);
  const cityCount = useMemo(() => cityFacets.length, [cityFacets]);

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
    const topCities = [...cityFacets]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => cityChip(c.value));
    return [...topCities, ...TAG_CHIPS];
  }, [cityFacets]);

  return (
    <>
      {/* Hero — reuses the homepage's .v1-hero classes so /clubs and /
          feel like the same product (centered title, stats bar, gradient
          bg, search bar inside the hero). HeroSearchPanel renders its
          own .v1-hero-search wrapper inline; the page-scoped CSS in
          .v1-clubs-page lets us tweak just the bits that differ. */}
      <section className="v1-hero">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline">
            <span className="v1-hero-kicker">Run clubs · India&apos;s verified directory</span>
            <span className="v1-hero-meta">{totalClubs} listed</span>
          </div>

          <h1 className="v1-hero-title">
            Find India&apos;s most happening run clubs<span className="accent">.</span>
          </h1>

          <HeroSearchPanel
            kindLock="club"
            placeholder="Search clubs by name, city, or vibe…"
            onSearchActiveChange={setIsSearching}
            quickChips={clubChips}
          />

          <div className="v1-hero-stats-bar">
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{totalClubs}</span>
              <span className="v1-hero-stat-l">Clubs</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{cityCount}</span>
              <span className="v1-hero-stat-l">Cities</span>
            </span>
          </div>
        </div>
      </section>

      {!isSearching && (
        <>
          {/* Featured — top 5 by member count, full ApiClub data.
              Original FlagshipCard verbatim: bg image, logo, 4-stat
              grid, tags, next-run footer with location + distance. */}
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
              pages without scrolling to the foot every time. */}
          <section className="v1c-clubs-section">
            <div className="v1c-container">
              <div className="v1c-section-header">
                <h2 className="v1c-section-title">
                  Every run club in <b className="v1c-red">India</b>
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
        </>
      )}

      {/* Onboard banner — always visible */}
      <section className="v1c-onboard-section">
        <div className="v1c-container">
          <OnboardClubBanner />
        </div>
      </section>

      {/* Studio promotion tabs — always visible */}
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
