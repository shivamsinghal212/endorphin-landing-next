import type { MetadataRoute } from 'next';
import type { ApiEvent } from '@/app/running-events/page';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
} from '@/lib/club-city-pages';
import {
  RACE_CITY_PAGES,
  RACE_SCOPES,
  filterRacesForCityScope,
  passesQualityGate,
} from '@/lib/race-city-pages';
import { fetchAllClubsList } from '@/lib/clubs-list';

const SITE = 'https://www.endorfin.run';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

type ListedClub = {
  slug: string;
  name: string;
  city: string;
  updatedAt: string | null;
  publishedAt?: string | null;
};

async function fetchAllRaces(): Promise<ApiEvent[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20;
  const collected: ApiEvent[] = [];
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: ApiEvent[] = data.items || [];
      collected.push(...items);
      totalPages = Math.max(1, Number(data.pages) || 1);
      if (items.length < PAGE_SIZE) break;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);
  } catch {
    // Swallow — caller treats empty list as "skip race sitemap entries".
  }
  const cutoff = Date.now() - 86_400_000;
  return collected.filter(
    (e) => e.startTime && new Date(e.startTime).getTime() >= cutoff,
  );
}

type ListedClubEvent = {
  id: string;
  slug: string | null;
  startTime: string;
  updatedAt: string | null;
};

/**
 * Fetch each club's *future* events for the sitemap. One request per club,
 * run in bounded chunks so we never open hundreds of sockets at once. Each
 * fetch swallows its own errors, so a single slow club just contributes no
 * entries rather than failing the whole sitemap. Past events are dropped —
 * their pages still resolve but carry no crawl value once they're over.
 */
async function fetchClubEventUrls(
  clubs: ListedClub[],
): Promise<MetadataRoute.Sitemap> {
  const CHUNK = 8;
  const cutoff = Date.now() - 86_400_000;
  const out: MetadataRoute.Sitemap = [];

  for (let i = 0; i < clubs.length; i += CHUNK) {
    const chunk = clubs.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async (club) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/v1/clubs/${encodeURIComponent(club.slug)}/events`,
            { next: { revalidate: 3600 } },
          );
          if (!res.ok) return [] as MetadataRoute.Sitemap;
          const events = (await res.json()) as ListedClubEvent[];
          if (!Array.isArray(events)) return [] as MetadataRoute.Sitemap;
          return events
            .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
            .map((e) => ({
              url: `${SITE}/clubs/${club.slug}/events/${e.slug || e.id}`,
              lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(e.startTime),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            }));
        } catch {
          return [] as MetadataRoute.Sitemap;
        }
      }),
    );
    for (const r of results) out.push(...r);
  }
  return out;
}

// Cached at edge for 1h so the sitemap isn't hammered by crawlers.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/running-events`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE}/clubs`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE}/runners`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${SITE}/coaches`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${SITE}/workout-plan`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/club-pitch-deck`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/privacy`, lastModified: new Date('2026-04-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/terms`,   lastModified: new Date('2026-04-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/support`, lastModified: new Date('2026-04-10'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Paginated: the list endpoint caps at 50/page, so a single fetch would
  // drop every club past the first 50 from the sitemap (and undercount the
  // city landers below). fetchAllClubsList swallows its own errors and
  // returns what it has, so a backend hiccup just ships fewer entries.
  const allClubs = await fetchAllClubsList<ListedClub>();
  // Drop unpublished clubs: /clubs/[slug] sets robots:noindex for them,
  // so emitting them in the sitemap wastes Googlebot's crawl budget on
  // pages it isn't allowed to index.
  const clubs = allClubs.filter((c) => c.publishedAt);
  for (const c of clubs) {
    staticRoutes.push({
      url: `${SITE}/clubs/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Individual upcoming club-event pages — emitted so Google indexes the
  // shareable RSVP pages directly instead of waiting to crawl them via
  // internal links.
  const clubEventUrls = await fetchClubEventUrls(clubs);
  staticRoutes.push(...clubEventUrls);

  // SEO city landers — only emit a page when the city has enough clubs
  // to avoid thin/doorway content.
  for (const page of CLUB_CITY_PAGES) {
    const matched = clubsForCityPage(clubs, page);
    if (matched.length < MIN_CLUBS_PER_CITY) continue;
    staticRoutes.push({
      url: `${SITE}/run-clubs/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  }

  // Race city × scope SEO landers. Fetched separately so a clubs-API
  // failure doesn't drop race entries (and vice versa).
  const races = await fetchAllRaces();
  if (races.length > 0) {
    for (const page of RACE_CITY_PAGES) {
      for (const scope of RACE_SCOPES) {
        const count = filterRacesForCityScope(races, page, scope).length;
        if (!passesQualityGate(count, scope)) continue;
        staticRoutes.push({
          url: `${SITE}/running-events/${scope}/${page.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: scope === 'in' ? 0.85 : 0.8,
        });
      }
    }

    // Race detail pages: each upcoming race gets its own sitemap entry so
    // Google indexes them directly rather than waiting to discover via
    // internal links.
    for (const race of races) {
      const slug = race.slug || race.id;
      if (!slug) continue;
      staticRoutes.push({
        url: `${SITE}/running-events/${slug}`,
        lastModified: new Date(race.startTime),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return staticRoutes;
}
