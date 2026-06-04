const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const PAGE_SIZE = 50;
// Hard cap so a runaway dataset can't blow up SSR. ~116 clubs in prod today.
const MAX_PAGES = 20;

/**
 * Fetch the FULL club list across every page.
 *
 * GET /api/v1/clubs returns a bare JSON array capped at 50 per page and
 * accepts ?page=&limit=. Unlike /events it carries no total-pages field,
 * so we loop until a page comes back short (< PAGE_SIZE) or empty.
 *
 * Callers that hit the bare endpoint once silently saw only the first 50
 * clubs — which 404'd city landers like /run-clubs/gurgaon (whose 2nd+
 * clubs had fallen onto page 2) the moment the directory grew past 50.
 */
export async function fetchAllClubsList<T = unknown>(
  revalidate = 3600,
): Promise<T[]> {
  const all: T[] = [];
  try {
    let page = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/clubs?limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate } },
      );
      if (!res.ok) break;
      const data = (await res.json()) as T[];
      if (!Array.isArray(data) || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE_SIZE) break;
      page += 1;
    } while (page <= MAX_PAGES);
  } catch {
    return all;
  }
  return all;
}
