import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from './ClubsView';
import type { ApiClub } from './page';
import { clubsApi, type MyClubClaim, type MyClubMembership } from '@/lib/api';
import { getSessionEmail, getSessionToken } from '@/lib/session';
import { getRequestGeo } from '@/lib/geo';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import { fetchFeaturedFull } from '@/lib/clubs-featured';

// Shared body for the two national directory routes — /clubs and
// /experiences. Identical data + layout; the only difference is `variant`,
// which ClubsView uses to decide rail order (clubs lead with the run-club
// directory, experiences lead with the club-events rails). Each route file
// owns its own metadata/canonical and renders this with the right variant.

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
 * Fetches club events from the unified discover endpoint for the two
 * events-first rails. `query` selects the window — `sort=upcoming` for
 * "Events around you" (soonest first), or `eventsWindow=this_weekend` for
 * "Events this weekend". Failures degrade to []: the rail simply doesn't
 * render, the rest of the page is unaffected.
 */
async function getClubEvents(query: string): Promise<DiscoverHit[]> {
  try {
    const res = await fetch(`${API}/discover/smart?kind=club_event&${query}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as DiscoverPage;
    return j.items ?? [];
  } catch {
    return [];
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
 * "Events around you" — city-scoped when we can resolve the visitor's city
 * from IP (Vercel edge geo), else the soonest-upcoming events nationally.
 * NCR visitors get every NCR city merged together (fan-out) under the
 * "Delhi NCR" label. `city` is set only when the resolved location actually
 * yielded events; null falls back to the generic national list.
 */
async function getEventsAroundYou(
  geoCity: string | null,
): Promise<{ events: DiscoverHit[]; city: string | null }> {
  const dateFrom = istTodayFloor();
  if (geoCity) {
    if (isNcrCity(geoCity)) {
      const perCity = await Promise.all(
        NCR_CITIES.map((c) =>
          getClubEvents(`city=${encodeURIComponent(c)}&dateFrom=${dateFrom}&sort=upcoming&limit=12`),
        ),
      );
      const merged = mergeUpcoming(perCity.flat(), 12);
      if (merged.length) return { events: merged, city: 'Delhi NCR' };
    } else {
      const local = await getClubEvents(
        `city=${encodeURIComponent(geoCity)}&dateFrom=${dateFrom}&sort=upcoming&limit=12`,
      );
      if (local.length) return { events: local, city: geoCity };
    }
  }
  const national = await getClubEvents(`dateFrom=${dateFrom}&sort=upcoming&limit=12`);
  return { events: national, city: null };
}

// Event link: /clubs/{clubSlug}/events/{eventSlug||id}. Returns null when
// the hit is missing the club slug (can't build a valid path).
function eventHref(hit: DiscoverHit): string | null {
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
    .map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        startDate: e.startTime,
        ...(e.endTime && { endDate: e.endTime }),
        url: `${SITE}${eventHref(e)}`,
        ...(e.imageUrl && { image: e.imageUrl }),
        ...(e.locationName && {
          location: { '@type': 'Place', name: e.locationName, address: e.city || undefined },
        }),
        ...(e.clubName && { organizer: { '@type': 'Organization', name: e.clubName } }),
      },
    }));
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

function buildBreadcrumbJsonLd(variant: 'clubs' | 'experiences') {
  const leaf =
    variant === 'experiences'
      ? { name: 'Experiences', item: `${SITE}/experiences` }
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

export default async function ClubsExperiencesPage({
  variant,
}: {
  variant: 'clubs' | 'experiences';
}) {
  const token = await getSessionToken();
  // Resolve the visitor's city from Vercel edge geo (IP-based). The page is
  // already dynamic (reads the session cookie), so headers() is free here.
  const { city: geoCity } = await getRequestGeo();
  const [{ clubs, cityFacets }, around, eventsWeekend, myClubs, userEmail] = await Promise.all([
    getAllClubs(),
    getEventsAroundYou(geoCity),
    getClubEvents('eventsWindow=this_weekend&sort=upcoming&limit=12'),
    token
      ? clubsApi.listMyClubs(token, 'all', { includePending: true }).catch(() => [])
      : Promise.resolve([]),
    getSessionEmail(),
  ]);
  const eventsAround = around.events;
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
  const canonicalUrl = `${SITE}${variant === 'experiences' ? '/experiences' : '/clubs'}`;
  const jsonLd = buildJsonLd(clubs, canonicalUrl);
  const eventsJsonLd = buildEventsJsonLd([...eventsAround, ...eventsWeekend]);
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
        <ClubsView
          clubs={clubs}
          featuredFull={featuredFull as ApiClub[]}
          cityFacets={cityFacets}
          eventsAround={eventsAround}
          aroundCity={aroundCity}
          eventsWeekend={eventsWeekend}
          geoCity={geoCity}
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
