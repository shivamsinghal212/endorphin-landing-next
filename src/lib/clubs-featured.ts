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
