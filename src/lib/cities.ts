/**
 * Shared city list + alias matching used by /races, /clubs, and the
 * homepage Events showcase. Single source of truth so the chips and
 * groupings stay consistent.
 *
 * Delhi/NCR groups Delhi proper plus the NCR satellite cities so a race
 * in Noida or Gurgaon shows up under the same chip as one in CP.
 */

export const TOP_CITIES = ['Delhi/NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai'] as const;

export type TopCity = (typeof TOP_CITIES)[number];

export const CITY_ALIASES: Record<string, string[]> = {
  'Delhi/NCR': [
    'delhi',
    'new delhi',
    'ncr',
    'delhi ncr',
    'delhi(ncr)',
    'delhi (ncr)',
    'noida',
    'greater noida',
    'faridabad',
    'gurgaon',
    'gurugram',
  ],
  Mumbai: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
  Bengaluru: ['bengaluru', 'bangalore'],
  Hyderabad: ['hyderabad', 'secunderabad'],
  Chennai: ['chennai', 'madras'],
};

/**
 * Substring match on lowercased location name. So "Noida Sector 18"
 * still matches the "noida" alias under Delhi/NCR.
 */
export function locationMatchesCity(locationName: string | null | undefined, city: string): boolean {
  if (!city) return true;
  const loc = (locationName || '').toLowerCase();
  if (!loc) return false;
  const aliases = CITY_ALIASES[city] || [city.toLowerCase()];
  return aliases.some((a) => loc.includes(a));
}

/**
 * Pick the flagship for a pool of items: earliest-upcoming featured item
 * if any are featured, else earliest-upcoming overall.
 */
export function pickFeaturedOrFirst<T extends { isFeatured?: boolean; startTime: string }>(
  pool: T[],
): T | null {
  if (!pool.length) return null;
  const sortByDate = (a: T, b: T) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  const featured = pool.filter((r) => r.isFeatured);
  return featured.length ? [...featured].sort(sortByDate)[0] : [...pool].sort(sortByDate)[0];
}
