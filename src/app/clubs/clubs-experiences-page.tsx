import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from './ClubsView';
import type { ApiClub } from './page';
import { clubsApi, type MyClubClaim, type MyClubMembership } from '@/lib/api';
import { getSessionEmail, getSessionToken } from '@/lib/session';
import { getRequestGeo } from '@/lib/geo';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import type { RaceCardData } from '@/lib/race-card-data';
import { fetchFeaturedFull, toFeaturedCardData } from '@/lib/clubs-featured';
import { eventPlaceJsonLd } from '@/lib/event-seo';
import { safeEndDate } from '@/lib/event-schema';

// Shared body for the two national directory routes — /clubs and
// /running-events. Identical data + layout; `variant` decides rail order
// (clubs lead with the run-club directory, running-events lead with the
// event rails) and whether races are fetched at all. Each route file owns
// its own metadata/canonical and renders this with the right variant.
//
// /running-events keeps its URL deliberately: it is the ranked index, it is
// in sitemap.ts at priority 0.9, and the whole /running-events/{scope}/{city}
// lander cluster hangs off it. The old /experiences index had one event ever
// and was not in the sitemap, so it 301s here rather than the reverse.

const SITE = 'https://www.endorfin.run';
const API = 'https://api.endorfin.run/api/v1';
const PAGE_SIZE = 50;
// Hard cap so a runaway dataset can't blow up SSR. Currently ~50 clubs in
// production; this gives us 10× headroom before we need real pagination.
const MAX_PAGES = 10;

interface DiscoverPage {
  items: DiscoverHit[];
  total: number;
  facets?: {
    cities?: { value: string; count: number }[];
  } | null;
}

/**
 * Fetches every published club via /discover/smart, paginated 50 at a time
 * in parallel. Returns clubs sorted by member count desc — featured strip
 * slices the top 5; the all-clubs grid uses the rest in the same order.
 */
async function getAllClubs(): Promise<{ clubs: DiscoverHit[]; cityFacets: { value: string; count: number }[] }> {
  try {
    const firstRes = await fetch(
      `${API}/discover/smart?kind=club&limit=${PAGE_SIZE}&offset=0&includeFacets=true&sort=newest`,
      { next: { revalidate: 3600 } },
    );
    if (!firstRes.ok) return { clubs: [], cityFacets: [] };
    const first = (await firstRes.json()) as DiscoverPage;

    const total = first.total ?? first.items.length;
    const additional = Math.min(
      Math.max(0, Math.ceil(total / PAGE_SIZE) - 1),
      MAX_PAGES - 1,
    );

    const restPages =
      additional > 0
        ? await Promise.all(
            Array.from({ length: additional }, (_, i) =>
              fetch(
                `${API}/discover/smart?kind=club&limit=${PAGE_SIZE}&offset=${(i + 1) * PAGE_SIZE}&sort=newest`,
                { next: { revalidate: 3600 } },
              )
                .then((r) => (r.ok ? (r.json() as Promise<DiscoverPage>) : Promise.resolve({ items: [], total: 0 })))
                .catch(() => ({ items: [], total: 0 })),
            ),
          )
        : [];

    const all = [first, ...restPages].flatMap((p) => p.items);

    // Sort by members desc, nulls last. The featured strip and all-clubs
    // grid both consume this ordering so users see the biggest clubs first.
    all.sort((a, b) => (b.members ?? 0) - (a.members ?? 0));

    const cityFacets = first.facets?.cities ?? [];
    return { clubs: all, cityFacets };
  } catch {
    return { clubs: [], cityFacets: [] };
  }
}

/**
 * Fetches one kind of event from the unified discover endpoint for the
 * events-first rails. `kind` is 'club_event' or 'race' — each kind gets its
 * OWN rail, never merged, so a busy race calendar can't push club runs off
 * the page (or vice versa). `query` selects the window — `sort=upcoming` for
 * "upcoming in {city}", or `eventsWindow=this_weekend` for the weekend rail.
 * Failures degrade to []: that rail simply doesn't render, the rest of the
 * page is unaffected.
 */
async function getEvents(kind: string, query: string): Promise<DiscoverHit[]> {
  try {
    const res = await fetch(`${API}/discover/smart?kind=${kind}&${query}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as DiscoverPage;
    return j.items ?? [];
  } catch {
    return [];
  }
}

/**
 * How many races are actually UPCOMING nationally, for the hero counter.
 * `limit=1` — we want the `total`, not the rows. Must carry the same
 * dateFrom floor as the rails: the unfiltered kind facet reports every race
 * ever indexed (671 at time of writing vs ~254 upcoming), and labelling an
 * all-time number as "upcoming" is the exact mislabel we fixed before.
 * Returns 0 on failure, which hides the counter rather than showing a lie.
 */
async function getUpcomingRaceCount(dateFrom: string): Promise<number> {
  try {
    const res = await fetch(
      `${API}/discover/smart?kind=race&dateFrom=${dateFrom}&limit=1`,
      { next: { revalidate: 900 } },
    );
    if (!res.ok) return 0;
    const j = (await res.json()) as DiscoverPage;
    return Number(j.total) || 0;
  } catch {
    return 0;
  }
}

// The cities that make up Delhi NCR. The discover `city=` filter is
// per-city (no comma/repeat/`cities=` multi-value support — verified
// against the API), so an NCR visitor gets a fan-out: one request per city,
// merged to the soonest events overall. Displayed under the "Delhi NCR" label.
const NCR_CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad'] as const;

function isNcrCity(city: string): boolean {
  return /delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad/i.test(city);
}

// Dedupe by id, drop events with no startTime, sort soonest-first, cap.
function mergeUpcoming(hits: DiscoverHit[], limit: number): DiscoverHit[] {
  const seen = new Set<string>();
  return hits
    .filter((h) => {
      if (!h.startTime || seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    })
    .sort((a, b) => new Date(a.startTime ?? 0).getTime() - new Date(b.startTime ?? 0).getTime())
    .slice(0, limit);
}

// Today's date (IST, YYYY-MM-DD) as a lower bound for "upcoming" queries.
// `sort=upcoming` only sorts ascending — it does NOT filter out past events
// — so without a dateFrom floor the rail surfaces events from years ago.
function istTodayFloor(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/**
 * "Around you" — city-scoped when we can resolve the visitor's city from IP
 * (Vercel edge geo), else the soonest-upcoming nationally. NCR visitors get
 * every NCR city fanned out under the "Delhi NCR" label. `city` is set only
 * when the resolved location actually yielded something; null falls back to
 * the national list.
 *
 * Returns races and club events as SEPARATE lists — they feed two distinct
 * rails and are never interleaved. `includeRaces` is false on /clubs, which
 * stays a club directory.
 */
async function getEventsAroundYou(
  geoCity: string | null,
  includeRaces: boolean,
): Promise<{ races: DiscoverHit[]; clubEvents: DiscoverHit[]; city: string | null }> {
  const dateFrom = istTodayFloor();

  // Both kinds for one city scope, each capped to 12 SEPARATELY so they
  // populate two independent rails rather than competing for one list.
  const forScope = async (scope: string) => {
    const [clubEvents, races] = await Promise.all([
      getEvents('club_event', scope).then((h) => mergeUpcoming(h, 12)),
      includeRaces
        ? getEvents('race', scope).then((h) => mergeUpcoming(h, 12))
        : Promise.resolve([] as DiscoverHit[]),
    ]);
    return { races, clubEvents };
  };

  const scopeQuery = (city?: string) =>
    `${city ? `city=${encodeURIComponent(city)}&` : ''}dateFrom=${dateFrom}&sort=upcoming&limit=12`;

  if (geoCity) {
    if (isNcrCity(geoCity)) {
      // The discover `city=` filter is per-city, so NCR fans out and the
      // per-city results are merged WITHIN each kind (never across kinds).
      const perCity = await Promise.all(NCR_CITIES.map((c) => forScope(scopeQuery(c))));
      const found = {
        races: mergeUpcoming(perCity.flatMap((p) => p.races), 12),
        clubEvents: mergeUpcoming(perCity.flatMap((p) => p.clubEvents), 12),
      };
      // City scope holds if EITHER rail found something locally — otherwise
      // one empty kind would drag the other back to the national list.
      if (found.races.length || found.clubEvents.length) {
        return { ...found, city: 'Delhi NCR' };
      }
    } else {
      const found = await forScope(scopeQuery(geoCity));
      if (found.races.length || found.clubEvents.length) {
        return { ...found, city: geoCity };
      }
    }
  }
  return { ...(await forScope(scopeQuery())), city: null };
}

// Event link. Races live on the standalone /running-events/{slug} pages;
// club events live under their club. Returns null only for a club event
// missing its club slug (can't build a valid path).
function eventHref(hit: DiscoverHit): string | null {
  if (hit.kind === 'race') return `/running-events/${hit.slug || hit.id}`;
  if (!hit.clubSlug) return null;
  return `/clubs/${hit.clubSlug}/events/${hit.slug || hit.id}`;
}

// ItemList of the surfaced upcoming events — mirrors the events shown
// prominently in the rails so crawlers see them as structured Events.
function buildEventsJsonLd(events: DiscoverHit[]) {
  const seen = new Set<string>();
  const items = events
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return Boolean(eventHref(e) && e.startTime);
    })
    .map((e, i) => {
      const url = `${SITE}${eventHref(e)}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: e.title,
          startDate: e.startTime,
          // Guarded like the race builders: some feeds carry an endTime that
          // precedes the start, which Google's Event validator hard-fails.
          endDate: safeEndDate(e.startTime!, e.endTime),
          // These were absent on all 28 events in this list while the race
          // ItemList on the same page set them — Google treats eventStatus
          // and eventAttendanceMode as expected fields for Event results.
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          performer: { '@type': 'PerformingGroup', name: 'Club members' },
          description:
            e.description?.trim() ||
            `${e.title} — a run club event${e.city ? ` in ${e.city}` : ''}${
              e.clubName ? ` hosted by ${e.clubName}` : ''
            }. RSVP on Endorfin.`,
          url,
          ...(e.imageUrl && { image: e.imageUrl }),
          location: eventPlaceJsonLd({ locationName: e.locationName, city: e.city }),
          organizer: {
            '@type': 'Organization',
            name: e.clubName || 'Endorfin',
          },
        },
      };
    });
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming run-club events in India',
    numberOfItems: items.length,
    itemListElement: items,
  };
}

function buildJsonLd(clubs: DiscoverHit[], canonicalUrl: string) {
  if (!clubs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Run Clubs in India',
    description:
      'A verified directory of run clubs across India — marathon training groups, social runs, and trail collectives.',
    url: canonicalUrl,
    numberOfItems: clubs.length,
    // Mirror EVERY club in the structured data — same surface as the
    // SSR'd HTML, so crawlers see the full directory.
    itemListElement: clubs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsClub',
        name: c.title,
        url: c.slug ? `${SITE}/clubs/${c.slug}` : undefined,
        description: c.subtitle || c.description || undefined,
        sport: 'Running',
        address: {
          '@type': 'PostalAddress',
          addressLocality: c.city || undefined,
          addressCountry: 'IN',
        },
        ...(c.imageUrl && { logo: c.imageUrl, image: c.imageUrl }),
      },
    })),
  };
}

function buildBreadcrumbJsonLd(variant: Variant) {
  const leaf =
    variant === 'running-events'
      ? { name: 'Running Events', item: `${SITE}/running-events` }
      : { name: 'Run Clubs', item: `${SITE}/clubs` };
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: leaf.name, item: leaf.item },
    ],
  };
}

export type Variant = 'clubs' | 'running-events';

export default async function ClubsExperiencesPage({
  variant,
  races = [],
}: {
  variant: Variant;
  /** Every upcoming race, rendered as the closing grid on /running-events.
   *  Fetched by that route (it needs the same list for its Event JSON-LD,
   *  which wants price/currency fields the discover payload lacks). */
  races?: RaceCardData[];
}) {
  const token = await getSessionToken();
  // /running-events carries races alongside club events (in their own rail);
  // /clubs stays the club directory and shows club events only.
  const includeRaces = variant === 'running-events';
  // Resolve the visitor's city from Vercel edge geo (IP-based). The page is
  // already dynamic (reads the session cookie), so headers() is free here.
  const { city: geoCity } = await getRequestGeo();
  const [{ clubs, cityFacets }, around, eventsWeekend, upcomingRaces, myClubs, userEmail] = await Promise.all([
    getAllClubs(),
    getEventsAroundYou(geoCity, includeRaces),
    getEvents('club_event', 'eventsWindow=this_weekend&sort=upcoming&limit=12'),
    includeRaces ? getUpcomingRaceCount(istTodayFloor()) : Promise.resolve(0),
    token
      ? clubsApi.listMyClubs(token, 'all', { includePending: true }).catch(() => [])
      : Promise.resolve([]),
    getSessionEmail(),
  ]);
  const eventsAround = around.clubEvents;
  const racesAround = around.races;
  const aroundCity = around.city;
  // Featured strip — fetch rich detail for the top 5 by members.
  const featuredSlugs = clubs
    .slice(0, 5)
    .map((c) => c.slug)
    .filter((s): s is string => Boolean(s));
  const featuredFull = await fetchFeaturedFull(featuredSlugs);
  const membershipBySlug: Record<string, MyClubMembership> = {};
  const claimBySlug: Record<string, MyClubClaim> = {};
  for (const c of myClubs) {
    if (c.membership) membershipBySlug[c.slug] = c.membership;
    if (c.claim) claimBySlug[c.slug] = c.claim;
  }
  const isAuthed = !!token;
  const canonicalUrl = `${SITE}${variant === 'running-events' ? '/running-events' : '/clubs'}`;
  const jsonLd = buildJsonLd(clubs, canonicalUrl);
  const eventsJsonLd = buildEventsJsonLd([...racesAround, ...eventsAround, ...eventsWeekend]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(variant);

  return (
    // overflow-x: clip (not hidden) — `hidden` makes <main> a scroll container,
    // which breaks `position: sticky` on the search dock inside.
    <main id="main-content" style={{ overflowX: 'clip' }}>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {eventsJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }}
        />
      )}
      <Header />
      <div className="v1-clubs-page">
        {/* featuredFull is projected: full ApiClub objects carry each club's
            event history, including scraped Instagram comment threads that
            nothing on this page renders. */}
        <ClubsView
          clubs={clubs}
          featuredFull={featuredFull.map(toFeaturedCardData)}
          cityFacets={cityFacets}
          eventsAround={eventsAround}
          racesAround={racesAround}
          allRaces={races}
          upcomingRaces={upcomingRaces}
          geoCity={geoCity}
          aroundCity={aroundCity}
          eventsWeekend={eventsWeekend}
          membershipBySlug={membershipBySlug}
          claimBySlug={claimBySlug}
          isAuthed={isAuthed}
          userEmail={userEmail}
          variant={variant}
        />
      </div>
      <Footer />
    </main>
  );
}
