import type { ApiEvent } from '@/app/running-events/page';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const PAGE_SIZE = 50;
// Hard cap so a runaway dataset can't blow up SSR. ~250 upcoming today.
const MAX_PAGES = 20;

/**
 * Fetch every UPCOMING race across all pages, sorted soonest-first.
 *
 * Mirrors fetchAllClubsList. GET /api/v1/events caps `limit` at 50 and
 * returns { items, total, page, pages }, so a single fetch silently drops
 * everything past the first 50.
 *
 * Anonymous by design — no Authorization header — so the response is
 * identical for every visitor and can sit in the Next data cache. Callers
 * that need per-user data (the hub's RSVP state) keep their own token-aware
 * fetch instead.
 */
export async function fetchAllRaces(revalidate = 3600): Promise<ApiEvent[]> {
  const collected: ApiEvent[] = [];
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate } },
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
    // Swallow — callers treat an empty list as "skip these entries".
  }

  // Yesterday, not now: an event that started this morning is still today's
  // event to someone looking at the site this evening.
  const cutoff = Date.now() - 86_400_000;
  return collected
    .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}
