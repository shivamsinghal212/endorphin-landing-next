'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import posthog from 'posthog-js';
import HeroSearchPanel, { type DiscoverHit } from '@/components/HeroSearchPanel';
import { ClaimClubModal } from './[slug]/claim-club-link';
import { JoinClubModal } from './[slug]/join-club-modal';
import type { MyClubClaim, MyClubMembership } from '@/lib/api';

type Membership = MyClubMembership;
type Claim = MyClubClaim;

const PAGE_SIZE = 24;

function initials(name: string) {
  const w = (name || '').trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

function formatMembers(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(Math.floor(n / 100) / 10).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

// ─── Membership CTA ─────────────────────────
// Same logic as before, just driven by name+slug from DiscoverHit instead
// of the old ApiClub shape. Click handler still receives slug+name so the
// JoinClubModal can fetch full details once opened.

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

// ─── Verified tick (inline svg) ─────────────
const VerifiedTick = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" aria-label="Verified">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.8 5.8a1 1 0 01-1.4 0L7 12.6a1 1 0 011.4-1.4l1.8 1.8 5.1-5.1a1 1 0 011.4 1.4z"
    />
  </svg>
);

// ─── Featured card (large, for the top-5-by-members strip) ──
function FeaturedCard({
  c,
  membership,
  onJoin,
  isLcp = false,
}: {
  c: DiscoverHit;
  membership: Membership | null;
  onJoin: (club: { name: string; slug: string }) => void;
  isLcp?: boolean;
}) {
  if (!c.slug) return null;
  const href = `/clubs/${c.slug}`;
  const membersFormatted = formatMembers(c.members);
  return (
    <article className="v1c-feature-card">
      <Link href={href} className="v1c-feature-card-link" aria-label={`View ${c.title}`}>
        <div className="v1c-feature-card-media">
          <div className="v1c-feature-card-fallback">{initials(c.title)}</div>
          {c.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt=""
              loading={isLcp ? 'eager' : 'lazy'}
              fetchPriority={isLcp ? 'high' : 'low'}
            />
          )}
        </div>
        <div className="v1c-feature-card-body">
          {c.city && <div className="v1c-feature-card-kicker">{c.city}</div>}
          <h3 className="v1c-feature-card-title">{c.title}</h3>
          {c.subtitle && <p className="v1c-feature-card-sub">{c.subtitle}</p>}
          {membersFormatted && (
            <div className="v1c-feature-card-stat">
              <strong>{membersFormatted}</strong> members
            </div>
          )}
        </div>
      </Link>
      <div className="v1c-feature-card-actions">
        <MembershipCta name={c.title} slug={c.slug} membership={membership} onJoin={onJoin} />
      </div>
    </article>
  );
}

// ─── Compact club card (all-clubs grid) ──────
function ClubCard({
  c,
  membership,
  onJoin,
  hidden,
}: {
  c: DiscoverHit;
  membership: Membership | null;
  onJoin: (club: { name: string; slug: string }) => void;
  // True when the card is past the visible cutoff. We KEEP the anchor in
  // the SSR'd HTML for SEO link equity — only display:none it via the
  // `is-hidden` modifier. "Load more" toggles the class off, no network.
  hidden: boolean;
}) {
  if (!c.slug) return null;
  const href = `/clubs/${c.slug}`;
  const membersFormatted = formatMembers(c.members);
  return (
    <article className={`v1c-club-card ${hidden ? 'is-hidden' : ''}`}>
      <Link href={href} className="v1c-club-card-body-link" aria-label={`View ${c.title}`}>
        <div className="v1c-club-card-header">
          <div className="v1c-club-card-header-fallback">{initials(c.title)}</div>
          {c.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt={c.title} loading="lazy" />
          )}
        </div>
        <div className="v1c-club-card-body">
          <div className="v1c-club-card-logo">
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt="" loading="lazy" />
            ) : (
              initials(c.title)
            )}
          </div>
          <div className="v1c-club-card-top">
            <h3 className="v1c-club-card-title">{c.title}</h3>
          </div>
          {c.city && <div className="v1c-club-card-city">{c.city}</div>}
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

// ─── Onboard banner (kept verbatim from the previous ClubsView) ──
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

// ─── Studio admin promotion tabs (kept verbatim) ──
type AdminTab = 'members' | 'events' | 'rsvps' | 'profile';
interface AdminMockRow {
  avatar: string;
  avatarRed?: boolean;
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
  mock: { title: string; titleStrong: string; rightMeta: string; rows: AdminMockRow[] };
}
const ADMIN_PANELS: Record<AdminTab, AdminPanelData> = {
  members: {
    num: '01',
    heading: 'Approve the runners who’ll show up.',
    copy: 'Every join request lands in Studio with the answers you asked for — pace, goals, whatever you put on the form. Approve in a tap. Promote anyone to co-admin.',
    bullets: ['Pending requests with full join-form answers', 'Approve, decline (with optional reason)', 'Promote members → co-admins'],
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
    bullets: ['Date, time, start point, distance', 'Free runs or paid events with ₹ at signup', 'Upcoming + past archive in one place'],
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
    bullets: ['Per-event roster with avatars + names', 'Live going count, refreshed in real time', 'Spot first-timers before they arrive'],
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
    bullets: ['About · tagline · tags · established year', 'Linked channels: WhatsApp · Instagram · Strava', 'Custom join form + approval toggle'],
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
            <div key={b} className="v1c-admin-panel-list-item">{b}</div>
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

// ─── Main view ──────────────────────────────

export default function ClubsView({
  clubs,
  cityFacets,
  membershipBySlug = {},
  claimBySlug = {},
  isAuthed = false,
  userEmail = null,
}: {
  clubs: DiscoverHit[];
  cityFacets: { value: string; count: number }[];
  membershipBySlug?: Record<string, Membership>;
  claimBySlug?: Record<string, Claim>;
  isAuthed?: boolean;
  userEmail?: string | null;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [modal, setModal] = useState<{ kind: 'join' | 'claim'; club: { name: string; slug: string } } | null>(null);

  const openJoin = useCallback((club: { name: string; slug: string }) => setModal({ kind: 'join', club }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // Top 5 by members for the featured strip. `clubs` is already sorted
  // by members desc at SSR time.
  const featured = useMemo(() => clubs.slice(0, 5), [clubs]);
  const totalClubs = clubs.length;
  const showLoadMore = visibleCount < totalClubs;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, totalClubs));
  }, [totalClubs]);

  const cityCount = useMemo(() => cityFacets.length, [cityFacets]);
  const membershipFor = useCallback(
    (slug: string): Membership | null => membershipBySlug[slug] ?? null,
    [membershipBySlug],
  );

  return (
    <>
      {/* Slim hero — kicker, short title, two-stat line */}
      <section className="v1c-hero">
        <div className="v1c-hero-bg" aria-hidden />
        <div className="v1c-container">
          <span className="v1c-hero-kicker">Run clubs · India&apos;s verified directory</span>
          <h1 className="v1c-hero-title">
            Find your <span className="v1c-red">crew.</span>
          </h1>
          <div className="v1c-hero-stats-row">
            <span><strong>{totalClubs}</strong> clubs</span>
            <span><strong>{cityCount}</strong> cities</span>
          </div>
        </div>
      </section>

      {/* Always-expanded search panel locked to clubs. When the user
          actually commits a search, `isSearching` flips true and the
          static sections below collapse. */}
      <section className="v1c-search-section">
        <div className="v1c-container">
          <HeroSearchPanel
            kindLock="club"
            placeholder="Search clubs by name, city, or vibe…"
            onSearchActiveChange={setIsSearching}
          />
        </div>
      </section>

      {!isSearching && (
        <>
          {/* Featured strip — top 5 clubs by member count */}
          {featured.length > 0 && (
            <section className="v1c-featured">
              <div className="v1c-container">
                <div className="v1c-section-header">
                  <h2 className="v1c-section-title">
                    Featured <b>clubs</b>
                  </h2>
                  <span className="v1c-section-count">Top {featured.length} by members</span>
                </div>
                <div className="v1c-feature-grid">
                  {featured.map((c, i) => (
                    <FeaturedCard
                      key={c.id}
                      c={c}
                      membership={c.slug ? membershipFor(c.slug) : null}
                      onJoin={openJoin}
                      isLcp={i === 0}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All clubs grid — ENTIRE SSR HTML payload, paginated visually
              only. Crawlers see every anchor; users see 24 at a time. */}
          <section className="v1c-clubs-section">
            <div className="v1c-container">
              <div className="v1c-section-header">
                <h2 className="v1c-section-title">
                  Every run club in <b className="v1c-red">India</b>
                </h2>
                <span className="v1c-section-count">
                  Showing {Math.min(visibleCount, totalClubs)} of {totalClubs}
                </span>
              </div>
              <div className="v1c-clubs-grid">
                {clubs.map((c, i) => (
                  <ClubCard
                    key={c.id}
                    c={c}
                    membership={c.slug ? membershipFor(c.slug) : null}
                    onJoin={openJoin}
                    hidden={i >= visibleCount}
                  />
                ))}
              </div>
              {showLoadMore && (
                <div className="v1c-load-more">
                  <button type="button" className="v1c-btn v1c-btn-ghost" onClick={loadMore}>
                    Load {Math.min(PAGE_SIZE, totalClubs - visibleCount)} more
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Onboard banner — always visible, even during search, since it's
          a CTA for club organisers (not noise to a searcher). */}
      <section className="v1c-onboard-section">
        <div className="v1c-container">
          <OnboardClubBanner />
        </div>
      </section>

      {/* Studio promotion tabs — also always visible */}
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
      {/* claimBySlug is still passed by the page in case we want to render
          claim CTAs later; for now we keep the modal mounted but don't
          surface "Claim this club" on the listing cards (it was a niche
          path and the card density is better without it). */}
      {claimBySlug && null}
    </>
  );
}
