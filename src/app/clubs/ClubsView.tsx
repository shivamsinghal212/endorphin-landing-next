'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import LoginModal from '@/components/LoginModal';
import { useClubOnboard } from '@/lib/use-club-onboard';
import { useImgFallback } from '@/lib/img-fallback';
import RaceCard from '@/components/RaceCard';
import type { RaceCardData } from '@/lib/race-card-data';

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

const VerifiedTick = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" aria-label="Verified">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.8 5.8a1 1 0 01-1.4 0L7 12.6a1 1 0 011.4-1.4l1.8 1.8 5.1-5.1a1 1 0 011.4 1.4z"
    />
  </svg>
);

// ─── Onboard banner ──
function OnboardClubBanner() {
  const f = useClubOnboard('clubs_banner');

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
      {f.submitted ? (
        <div className="v1c-onboard-thanks" role="status" aria-live="polite">
          <strong>Thanks — we&rsquo;ll be in touch.</strong>
          <span>
            We&rsquo;ve logged your request. If anything urgent, reach us at{' '}
            <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
          </span>
        </div>
      ) : (
        <form className="v1c-onboard-form" onSubmit={f.onSubmit}>
          <div className="v1c-onboard-input-wrap">
            <span className="v1c-onboard-input-prefix" aria-hidden>@</span>
            <input
              type="text"
              className="v1c-onboard-input"
              placeholder="your_club_handle"
              aria-label="Your club's Instagram handle"
              value={f.handle}
              onChange={(e) => f.setHandle(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <button
            type="submit"
            className="v1c-btn v1c-btn-primary v1c-onboard-submit"
            disabled={!f.cleaned || f.submitting}
          >
            {f.submitting ? 'Sending…' : 'Get my club listed →'}
          </button>
        </form>
      )}
      {f.error ? <p className="v1c-onboard-error" role="alert">{f.error}</p> : null}
      <LoginModal
        open={f.loginOpen}
        onClose={f.closeLogin}
        onSuccess={f.onLoginSuccess}
        title="Sign in to list your club."
        subtitle={`So we know who to get back to about @${f.cleaned}.`}
      />
    </div>
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

// Event link mirrors page.tsx's eventHref. Races are standalone events with
// no club, so they link to /running-events/{slug}; club events link under
// their club. Null only for a club event missing its club slug.
function eventHref(hit: DiscoverHit): string | null {
  if (hit.kind === 'race') return `/running-events/${hit.slug || hit.id}`;
  if (!hit.clubSlug) return null;
  return `/clubs/${hit.clubSlug}/events/${hit.slug || hit.id}`;
}

// Short experience-type label for the card chip — the ONLY element over
// the image. Prefer a tag, else derive from kind / event type / distance.
function eventTypeLabel(hit: DiscoverHit): string {
  // Checked before tags: race hits come back with tags: [] today, but a
  // future tag shouldn't relabel a race as something else.
  if (hit.kind === 'race') return 'Race';
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
  // Race banners are landscape (sampled 24 upcoming: 19 exactly 16:9, 22 of
  // 24 wider than tall) — the 4:5 portrait frame built for Instagram-style
  // club posters cropped ~55% of their width off. Races get a 16:9 frame with
  // `contain` + the blur backdrop, so a 16:9 banner fills it edge-to-edge and
  // the rare portrait one letterboxes instead of losing its text.
  const landscape = hit.kind === 'race';
  const mod = landscape ? ' is-landscape' : '';
  // A load failure falls back to the same tile a missing image gets — see
  // useImgFallback for why the ref is needed as well as onError.
  const { isFailed, imgProps } = useImgFallback();
  const showImg = Boolean(img) && !isFailed(img!);

  const inner = (
    <>
      <div className={`v1c-exp-media${mod}`}>
        {showImg ? (
          <>
            {/* See RaceCard: an <img loading="lazy">, not a CSS background —
                a background-image on a visible element loads eagerly and
                defeated lazy loading on the sharp copy below. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="v1c-exp-bg" src={img!} alt="" loading="lazy" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img!} alt={hit.title} loading="lazy" {...imgProps(img!)} />
          </>
        ) : (
          // Name, not initials — a race is recognised by its title, and two
          // letters tell you nothing about "Harvest Gold Global Race 2026".
          // aria-hidden: the <h3> below already announces this exact text.
          <div className="v1c-exp-media-fallback is-title" aria-hidden>
            <span>{hit.title}</span>
          </div>
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
    <Link href={href} className={`v1c-exp-card${mod}`} aria-label={hit.title}>{inner}</Link>
  ) : (
    <div className={`v1c-exp-card${mod}`}>{inner}</div>
  );
}

function ExpClubCard({ c }: { c: DiscoverHit }) {
  const { isFailed, imgProps } = useImgFallback();
  if (!c.slug) return null;
  const img = c.imageUrl;
  const members = formatMembers(c.members);
  return (
    <Link href={`/clubs/${c.slug}`} className="v1c-exp-club-card" aria-label={c.title}>
      <div className="v1c-exp-club-cover">
        {img && !isFailed(img) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={c.title} loading="lazy" {...imgProps(img)} />
        ) : (
          // Initials, not the name: the club's name already sits directly
          // below this tile, and these covers are square logo crops.
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

/**
 * Every upcoming race, in the rails' visual language.
 *
 * This replaces the old /running-events page body, which was a second full
 * design (cream ground, its own hero and ribbon) stacked under the dark
 * rails and read as two pages glued together. What had to survive was the
 * SEO, not the styling: the rails only show 12 races, and this grid is the
 * SSR'd link to all ~250 detail pages.
 *
 * Filtering hides cards with the `hidden` attribute rather than dropping
 * them from the tree, so every anchor stays in the served HTML whatever
 * chip is selected.
 */
function AllRacesSection({ races }: { races: RaceCardData[] }) {
  const [city, setCity] = useState<CityGroup | 'All'>('All');

  const counts = useMemo(() => {
    const m = new Map<CityGroup, number>();
    for (const r of races) {
      const g = cityGroupOf(r.locationName ?? null);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  }, [races]);

  const chips = useMemo(
    () => CITY_GROUPS.filter((g) => (counts.get(g) ?? 0) > 0),
    [counts],
  );

  return (
    <section className="v1c-exp-rail">
      <div className="v1c-exp-rail-head">
        <h2 className="v1c-exp-rail-title">All upcoming races</h2>
        <span className="v1c-exp-seeall" aria-hidden>
          {races.length}
        </span>
      </div>

      <div className="v1c-exp-citychips" role="group" aria-label="Filter races by city">
        <button
          type="button"
          className={`v1c-exp-citychip ${city === 'All' ? 'is-active' : ''}`}
          aria-pressed={city === 'All'}
          onClick={() => setCity('All')}
        >
          All India <span className="v1c-exp-chipn">{races.length}</span>
        </button>
        {chips.map((g) => (
          <button
            key={g}
            type="button"
            className={`v1c-exp-citychip ${city === g ? 'is-active' : ''}`}
            aria-pressed={city === g}
            onClick={() => setCity(g)}
          >
            {g} <span className="v1c-exp-chipn">{counts.get(g)}</span>
          </button>
        ))}
      </div>

      {/* One scrolling row, not a grid: ~250 cards stacked into rows turned
          the page into a wall. Every card is still in the DOM and SSR'd —
          this is a horizontal scroller, NOT lazy-loaded infinite scroll,
          which would drop most of the race links out of the served HTML. */}
      <div className="v1c-exp-scroller v1c-exp-evlist">
        {races.map((r) => (
          <RaceCard
            key={r.id}
            r={r}
            hidden={city !== 'All' && cityGroupOf(r.locationName ?? null) !== city}
          />
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
type DistanceKey = '5k' | '10k' | 'half' | 'full' | 'ultra';

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
// Named for the race distance a runner actually searches for rather than the
// raw range. "Full+ (21K+)" used to swallow ultras; marathon and ultra are
// now separate so a 50K/100K is findable.
// NOTE: ~half of upcoming events have no distance set (cross-train/social/
// some races), so this is opt-in and never a default.
const DISTANCE_CHIPS: { key: DistanceKey; label: string; min: number | null; max: number | null }[] = [
  { key: '5k', label: '5K', min: null, max: 5 },
  { key: '10k', label: '10K', min: 5, max: 10 },
  { key: 'half', label: 'Half marathon', min: 10, max: 21.1 },
  { key: 'full', label: 'Marathon', min: 21.1, max: 42.2 },
  { key: 'ultra', label: 'Ultra', min: 42.2, max: null },
];

// The three shown as quick chips under the search bar (the rest live in the
// Filters panel). Order matches the row: longest first.
const QUICK_DISTANCES: DistanceKey[] = ['half', '10k', '5k'];

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

// Map the visitor's IP-resolved city onto one of the preset values so the
// search opens scoped to where they are. Unknown city → All India.
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

// True when `city` is not one of the preset chips — i.e. the visitor typed
// their own. Drives which value the "Other city" input shows.
function isCustomCity(city: string): boolean {
  return Boolean(city) && !SEARCH_CITIES.some((c) => c.value === city);
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
  includeRaces = false,
  baseCity = '',
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
  // /experiences searches races too, so the placeholder says so.
  includeRaces?: boolean;
  // The geo-derived default city; a city equal to this is not a user filter.
  baseCity?: string;
}) {
  // City and date window live in the panel now, so they count toward the
  // badge — otherwise an active city filter would be invisible from the bar.
  // The city only counts once it DIFFERS from the geo-derived default, or
  // every visitor would land on a pre-lit "Filters · 1" they never set.
  // Same rule isEmptySearch() uses to decide a search is idle.
  const activeFilterCount =
    (filters.city !== baseCity ? 1 : 0) +
    (filters.window ? 1 : 0) +
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
            placeholder={includeRaces ? 'Search races, clubs & events' : 'Search clubs & events'}
            onChange={(e) => onQChange(e.target.value)}
            aria-label={
              includeRaces
                ? 'Search races, run clubs and events'
                : 'Search run clubs and events'
            }
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>
        <button type="submit" className="v1c-search-submit" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </form>

      <div className="v1c-search-chips" role="group" aria-label="Distance filters">
        {QUICK_DISTANCES.map((key) => {
          const d = DISTANCE_CHIPS.find((x) => x.key === key)!;
          const active = filters.distance === d.key;
          return (
            <button
              key={d.key}
              type="button"
              className={`v1c-search-chip ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onDistanceToggle(d.key)}
            >
              {d.label}
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
              <div className="v1c-search-fgroup" role="group" aria-label="City">
                <span className="v1c-search-flabel">City</span>
                <div className="v1c-search-tags">
                  {SEARCH_CITIES.map((c) => {
                    const active = filters.city === c.value;
                    return (
                      <button
                        key={c.value || 'all'}
                        type="button"
                        className={`v1c-search-tag ${active ? 'is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onCityChange(c.value)}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                {/* Free text so anywhere in India is reachable, not just the
                    seven presets — discover accepts any city string. */}
                <input
                  className="v1c-search-cityinput"
                  type="text"
                  value={isCustomCity(filters.city) ? filters.city : ''}
                  placeholder="Or type any city…"
                  onChange={(e) => onCityChange(e.target.value)}
                  aria-label="Filter by a city not listed above"
                  autoComplete="address-level2"
                  spellCheck={false}
                />
              </div>

              <div className="v1c-search-fgroup" role="group" aria-label="When">
                <span className="v1c-search-flabel">When</span>
                <div className="v1c-search-tags">
                  {WINDOW_CHIPS.map((w) => {
                    const active = filters.window === w.key;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        className={`v1c-search-tag ${active ? 'is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onWindowToggle(w.key)}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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
  eventsAround = [],
  racesAround = [],
  allRaces = [],
  upcomingRaces = 0,
  geoCity = null,
  aroundCity = null,
  eventsWeekend = [],
  cityName,
  variant = 'clubs',
}: {
  // Lean shape powering the all-clubs grid (SSR'd ~112 anchors for SEO).
  clubs: DiscoverHit[];
  // Events-first rails — soonest-upcoming and this-weekend club events from
  // /discover/smart?kind=club_event.
  eventsAround?: DiscoverHit[];
  // Soonest-upcoming RACES (kind=race), same city scope as eventsAround but
  // its own rail — races and club events are never interleaved. Empty on
  // /clubs, which stays a club directory.
  racesAround?: DiscoverHit[];
  /** Every upcoming race, for the full grid below the rails. The rails cap
   *  at 12; this is the crawl path to all the detail pages. */
  allRaces?: RaceCardData[];
  // National count of UPCOMING races, for the hero counter. 0 = hide it
  // (also the failure value) — never render an all-time total as "upcoming".
  upcomingRaces?: number;
  // Visitor's IP-resolved city (Vercel edge geo). Seeds the search scope so
  // it opens where they are; overridable in the Filters panel. National only.
  geoCity?: string | null;
  // Visitor's IP-resolved city when the upcoming rails are scoped to it (they
  // then title themselves "... in {aroundCity}"). null = the national
  // soonest-upcoming lists, titled without a city.
  aroundCity?: string | null;
  eventsWeekend?: DiscoverHit[];
  // When set, the view scopes to a single city (/run-clubs/[city]): same
  // compact layout as /clubs, but the H1 names the city, search opens scoped
  // to it, and the by-city rail becomes a grid of every club in the city.
  cityName?: string;
  // National page identity. /clubs ('clubs') leads with the run-club
  // directory rail; /running-events leads with the event rails. Same data + layout — only the rail order differs. Ignored on city
  // pages (cityName set).
  variant?: 'clubs' | 'running-events';
}) {
  // /running-events carries races (own rail + own search result list);
  // /clubs stays a club directory.
  const includeRaces = variant === 'running-events';
  // Which event rail is expanded into a full grid ("See all"). null = both
  // collapsed to horizontal scrollers.
  const [openRail, setOpenRail] = useState<'races' | 'around' | 'weekend' | 'search-rc' | 'search-ev' | 'search-cl' | null>(null);

  // ── Compact search ──
  // Search opens scoped to the visitor's IP city, matching the rails above
  // it; "All India" is the first chip in the Filters panel's City group for
  // anyone who wants the whole catalogue. baseCity is also the "idle"
  // baseline — a search collapses back to the default rails at
  // (no query, no window, no tags, city === baseCity).
  // City pages open scoped to their own city (a non-preset city like Surat
  // stays as a custom value rather than collapsing to All India).
  const baseCity = useMemo(
    () => (cityName ? canonicalCity(cityName) || cityName : canonicalCity(geoCity)),
    [cityName, geoCity],
  );
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
  // Race hits are kept in their own list, never folded into searchEvents —
  // same rule as the browse rails.
  const [searchRaces, setSearchRaces] = useState<DiscoverHit[]>([]);
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
  // failed query entirely.
  useEffect(() => {
    if (!committedSearch) {
      setSearchStatus('idle');
      setSearchEvents([]);
      setSearchRaces([]);
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
    const eventsUrl = (city: string, kind: 'club_event' | 'race' = 'club_event') => {
      const p = new URLSearchParams();
      p.set('kind', kind);
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
    const fallbackRacesUrl = `${DISCOVER}?kind=race&city=Mumbai&dateFrom=${istTodayFloor()}&sort=upcoming&limit=24`;
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
    // Races use the identical event-side filters (q, city, window, distance)
    // — only the kind differs. Resolves to [] on /clubs.
    const fetchRaces = () =>
      includeRaces
        ? Promise.all(queryCities.map((city) => getItems(eventsUrl(city, 'race')))).then((lists) =>
            mergeSearchEvents(lists.flat(), 24),
          )
        : Promise.resolve([] as DiscoverHit[]);
    const fetchClubs = () =>
      Promise.all(queryCities.map((city) => getItems(clubsUrl(city)))).then((lists) =>
        mergeSearchClubs(lists.flat(), 24),
      );

    (async () => {
      try {
        const [ev, rc, cl] = await Promise.all([fetchEvents(), fetchRaces(), fetchClubs()]);
        if (ctrl.signal.aborted) return;
        if (ev.length === 0 && rc.length === 0 && cl.length === 0) {
          const [fev, frc, fcl] = await Promise.all([
            getItems(fallbackEventsUrl),
            includeRaces ? getItems(fallbackRacesUrl) : Promise.resolve([] as DiscoverHit[]),
            getItems(fallbackClubsUrl),
          ]);
          if (ctrl.signal.aborted) return;
          setSearchEvents(fev);
          setSearchRaces(frc);
          setSearchClubs(fcl);
          setSearchStatus('fallback');
          posthog.capture('clubs_search', {
            q: c.q || null, city: c.city || null, window: c.window || null,
            types: c.types, distance: c.distance || null, tags: c.tags, verified: c.verified,
            events: 0, races: 0, clubs: 0, fallback: true,
          });
        } else {
          setSearchEvents(ev);
          setSearchRaces(rc);
          setSearchClubs(cl);
          setSearchStatus('ok');
          posthog.capture('clubs_search', {
            q: c.q || null, city: c.city || null, window: c.window || null,
            types: c.types, distance: c.distance || null, tags: c.tags, verified: c.verified,
            events: ev.length, races: rc.length, clubs: cl.length, fallback: false,
          });
        }
      } catch {
        if (!ctrl.signal.aborted) setSearchStatus('error');
      }
    })();

    return () => ctrl.abort();
  }, [committedSearch, includeRaces]);

  // Frost the sticky search dock once it pins under the nav. A zero-height
  // sentinel sits at the dock's resting position; when it scrolls above the
  // nav line (rootMargin offsets by --nav-h) the dock is stuck.
  useEffect(() => {
    const el = dockSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setDockStuck(!entry.isIntersecting),
      { rootMargin: '-68px 0px 0px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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

  const totalClubs = clubs.length;

  return (
    <>
      {/* Hero — reuses the homepage's .v1-hero classes so /clubs and /
          feel like the same product (centered title, stats bar, gradient
          bg, search bar inside the hero). HeroSearchPanel renders its
          own .v1-hero-search wrapper inline; the page-scoped CSS in
          .v1-clubs-page lets us tweak just the bits that differ. */}
      <section className="v1-hero v1c-hero-natl">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline is-compact">
            <span className="v1-hero-kicker">
              {cityName
                ? `Run clubs · ${cityName}`
                : includeRaces
                  ? 'Races, run clubs & events · India'
                  : 'Run clubs & events · India'}
            </span>
            <span className="v1-hero-meta">
              {includeRaces && upcomingRaces > 0
                ? `${upcomingRaces} upcoming races · ${totalClubs} clubs`
                : `${totalClubs} clubs listed`}
            </span>
          </div>

          {/* Small (SEO-bearing) headline above the compact search bar, which
              lives in a sticky dock just below the hero (see .v1c-natl). */}
          <h1 className="v1c-search-h1">
            {cityName ? (
              <>
                Run clubs in <span className="accent">{cityName}</span>
              </>
            ) : includeRaces ? (
              <>
                <span className="accent">Races, Run Clubs and Events</span>{' '}
                <span className="v1c-h1-tail">in India</span>
              </>
            ) : (
              <>
                Run <span className="accent">Clubs</span> in India
              </>
            )}
          </h1>
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
                includeRaces={includeRaces}
                baseCity={baseCity}
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
                    {searchRaces.length > 0 && (
                      <section className="v1c-exp-rail">
                        <div className="v1c-exp-rail-head">
                          <h3 className="v1c-exp-rail-title">Races &amp; events</h3>
                          {searchRaces.length > 4 && (
                            <button
                              type="button"
                              className="v1c-exp-seeall"
                              onClick={() => setOpenRail((p) => (p === 'search-rc' ? null : 'search-rc'))}
                              aria-expanded={openRail === 'search-rc'}
                            >
                              {openRail === 'search-rc' ? 'Show less' : 'See all'}
                            </button>
                          )}
                        </div>
                        <div className={openRail === 'search-rc' ? 'v1c-exp-grid' : 'v1c-exp-scroller v1c-exp-evlist'}>
                          {searchRaces.map((h) => (
                            <EventCard key={h.id} hit={h} />
                          ))}
                        </div>
                      </section>
                    )}
                    {searchEvents.length > 0 && (
                      <section className="v1c-exp-rail">
                        <div className="v1c-exp-rail-head">
                          <h3 className="v1c-exp-rail-title">Club events</h3>
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
              Races and club events get their OWN rails (never interleaved);
              then this weekend, then run clubs by city. */}
          {!committedSearch &&
            (racesAround.length > 0 ||
              eventsAround.length > 0 ||
              eventsWeekend.length > 0 ||
              clubs.length > 0) && (
            <section className="v1c-exp">
              <div className="v1c-container">
                {(() => {
                  // Same rails, order depends on the page identity: /clubs
                  // leads with the directory, /experiences with the events.
                  // City pages: every club in the city as a compact grid —
                  // this directory IS the city page's content, all SSR'd.
                  const clubsRail = cityName ? (
                    <section key="clubs" className="v1c-exp-rail">
                      <div className="v1c-exp-rail-head">
                        <h2 className="v1c-exp-rail-title">Every run club in {cityName}</h2>
                        <span className="v1c-exp-seeall" aria-hidden>
                          {totalClubs} clubs
                        </span>
                      </div>
                      <div className="v1c-exp-grid is-clubs">
                        {clubs.map((c) => <ExpClubCard key={c.id} c={c} />)}
                      </div>
                    </section>
                  ) : (
                    <ClubsByCityRail key="clubs" clubs={clubs} />
                  );
                  const inCity = cityName ? ` in ${cityName}` : aroundCity ? ` in ${aroundCity}` : '';
                  const eventRails = (
                    <>
                      {/* Races first — the bigger catalogue, and what most
                          visitors arrive looking for. Empty on /clubs. */}
                      <EventRail
                        key="races"
                        title={`Upcoming races and events${inCity}`}
                        hits={racesAround}
                        clubLogos={clubLogoBySlug}
                        isOpen={openRail === 'races'}
                        onToggle={() => setOpenRail((p) => (p === 'races' ? null : 'races'))}
                      />
                      <EventRail
                        key="around"
                        title={`Upcoming club events${inCity}`}
                        hits={eventsAround}
                        clubLogos={clubLogoBySlug}
                        isOpen={openRail === 'around'}
                        onToggle={() => setOpenRail((p) => (p === 'around' ? null : 'around'))}
                      />
                      <EventRail
                        key="weekend"
                        title="Club events this weekend"
                        hits={eventsWeekend}
                        clubLogos={clubLogoBySlug}
                        isOpen={openRail === 'weekend'}
                        onToggle={() => setOpenRail((p) => (p === 'weekend' ? null : 'weekend'))}
                      />
                    </>
                  );
                  // /running-events closes with the full race grid — the
                  // rails are a preview, this is every race and every link.
                  const allRacesSection =
                    allRaces.length > 0 ? <AllRacesSection key="all" races={allRaces} /> : null;
                  // City pages lead with the (compact, one-row) events rail so
                  // it isn't buried under the full club grid.
                  if (cityName) return <>{eventRails}{clubsRail}</>;
                  return variant === 'clubs' ? (
                    <>{clubsRail}{eventRails}</>
                  ) : (
                    <>{eventRails}{allRacesSection}{clubsRail}</>
                  );
                })()}
              </div>
            </section>
          )}
      </div>

      {/* Onboard banner — always visible */}
      <section className="v1c-onboard-section">
        <div className="v1c-container">
          <OnboardClubBanner />
        </div>
      </section>

    </>
  );
}
