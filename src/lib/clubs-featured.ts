import type { ApiClub, ClubEvent } from '@/app/clubs/page';

const LEGACY_CLUBS_API = 'https://api.endorfin.run/api/v1';

/**
 * Fetch full ApiClub detail + events for a set of slugs in parallel.
 *
 * Backs the featured / flagship strip with the rich card data (4-stat grid,
 * tags, next-run footer) that the lean list and /discover shapes don't
 * carry. Bounded to a small N (top 5 featured), so this is not the old
 * per-slug N+1 storm.
 *
 * Shared by /clubs (national top 5) and /run-clubs/[city] (city top 5).
 */
export async function fetchFeaturedFull(slugs: string[]): Promise<ApiClub[]> {
  if (slugs.length === 0) return [];
  const results = await Promise.all(
    slugs.map(async (slug): Promise<ApiClub | null> => {
      try {
        const [detailRes, eventsRes] = await Promise.all([
          fetch(`${LEGACY_CLUBS_API}/clubs/${slug}`, { next: { revalidate: 3600 } }),
          fetch(`${LEGACY_CLUBS_API}/clubs/${slug}/events`, { next: { revalidate: 3600 } }),
        ]);
        if (!detailRes.ok) return null;
        const d = (await detailRes.json()) as ApiClub;
        const events = eventsRes.ok ? ((await eventsRes.json()) as ClubEvent[]) : [];
        return { ...d, events: Array.isArray(events) ? events : [] };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((c): c is ApiClub => !!c && !!c.slug);
}

/**
 * The only fields the featured/flagship card renders.
 *
 * ApiClub carries each club's full event history, and a club event carries
 * `recap` (summary, photos, videos), `sponsorsSeen`, `secondaryActivities`
 * and `topComments` — the last being scraped Instagram threads: usernames,
 * verbatim comment text with @-mentions of third parties, like counts, and
 * signed cdninstagram.com profile-photo URLs.
 *
 * FlagshipCard is inside a client component, so handing it whole ApiClub
 * objects serialised all of that into the public HTML of /running-events and
 * /clubs, on a page that renders none of it: 383 `userPictureUrl` values and
 * 758 `cdninstagram` references, ~206 KB, for five featured clubs.
 */
export interface FeaturedClubCardData {
  slug: string;
  name: string;
  subtitle?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  headerImageUrl?: string | null;
  isVerified?: boolean | null;
  establishedYear?: number | null;
  tags?: string[] | null;
  stats?: {
    members?: number | null;
    runsThisMonth?: number | null;
    kmThisMonth?: number | null;
    yearsRunning?: number | null;
  } | null;
  /** Trimmed to what pickNextEvent() and the next-run footer read. */
  events?: Array<{
    startTime: string;
    title?: string | null;
    locationName?: string | null;
    distanceKm?: number | null;
    goingCount?: number | null;
  }>;
}

/** Narrow full club payloads down to what the featured card renders. */
export function toFeaturedCardData(c: ApiClub): FeaturedClubCardData {
  return {
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle,
    city: c.city,
    logoUrl: c.logoUrl,
    headerImageUrl: c.headerImageUrl,
    isVerified: c.isVerified,
    establishedYear: c.establishedYear,
    tags: c.tags,
    stats: c.stats
      ? {
          members: c.stats.members,
          runsThisMonth: c.stats.runsThisMonth,
          kmThisMonth: c.stats.kmThisMonth,
          yearsRunning: c.stats.yearsRunning,
        }
      : null,
    events: (c.events ?? []).map((e) => ({
      startTime: e.startTime,
      title: e.title,
      locationName: e.locationName,
      distanceKm: e.distanceKm,
      goingCount: e.goingCount,
    })),
  };
}
