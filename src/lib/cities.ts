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
 * Wider Indian-city alias map used to turn ugly venue addresses
 * ("Mashobra Greens, Village Shipur, Mashobra, Shimla, HP, India") into
 * a clean city chip ("Shimla"). Order: longer/more-specific aliases first
 * inside each list so substring matching picks the right canonical name.
 */
const EXTRA_CITY_ALIASES: Record<string, string[]> = {
  Pune: ['pune', 'pimpri', 'chinchwad'],
  Ahmedabad: ['ahmedabad', 'amdavad'],
  Kolkata: ['kolkata', 'calcutta', 'howrah'],
  Jaipur: ['jaipur'],
  Lucknow: ['lucknow'],
  Kochi: ['kochi', 'cochin', 'ernakulam'],
  Coimbatore: ['coimbatore', 'kovai'],
  Indore: ['indore'],
  Bhopal: ['bhopal'],
  Surat: ['surat'],
  Vadodara: ['vadodara', 'baroda'],
  Nagpur: ['nagpur'],
  Visakhapatnam: ['visakhapatnam', 'vizag'],
  Goa: ['goa', 'panaji', 'panjim', 'margao', 'vasco'],
  Chandigarh: ['chandigarh', 'mohali', 'panchkula'],
  Mysuru: ['mysuru', 'mysore'],
  Mangaluru: ['mangaluru', 'mangalore'],
  Thiruvananthapuram: ['thiruvananthapuram', 'trivandrum'],
  Guwahati: ['guwahati'],
  Bhubaneswar: ['bhubaneswar', 'bhubaneshwar'],
  Patna: ['patna'],
  Dehradun: ['dehradun', 'doon'],
  Shimla: ['shimla', 'mashobra'],
  Manali: ['manali'],
  Leh: ['leh', 'ladakh'],
  Rishikesh: ['rishikesh'],
  Haridwar: ['haridwar'],
  Udaipur: ['udaipur'],
  Jodhpur: ['jodhpur'],
  Amritsar: ['amritsar'],
  Ludhiana: ['ludhiana'],
  Ranchi: ['ranchi'],
  Raipur: ['raipur'],
  Nashik: ['nashik', 'nasik'],
  Aurangabad: ['aurangabad', 'sambhajinagar'],
  Kolhapur: ['kolhapur'],
  Tirupati: ['tirupati'],
  Mehsana: ['mehsana'],
  Lavasa: ['lavasa'],
  Madurai: ['madurai'],
  Puducherry: ['puducherry', 'pondicherry'],
  Ghaziabad: ['ghaziabad'],
  Meerut: ['meerut'],
  Agra: ['agra'],
  Varanasi: ['varanasi', 'banaras', 'kashi'],
  Allahabad: ['allahabad', 'prayagraj'],
  Kanpur: ['kanpur'],
  Lalitpur: ['lalitpur'],
};

const STATE_OR_COUNTRY = new Set([
  'india',
  'andhra pradesh',
  'arunachal pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'goa',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil nadu',
  'telangana',
  'tripura',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
  'jammu and kashmir',
  'ladakh',
  'delhi',
  'puducherry',
  'chandigarh',
  'hp',
  'mp',
  'up',
  'ap',
  'tn',
  'wb',
  'tg',
  'ts',
  'or',
  'pb',
  'hr',
  'rj',
  'uk',
]);

const VENUEISH = /\b(college|school|university|hospital|club|hotel|stadium|resort|society|complex|tower|park|grounds?|ground|estate|township|sector|phase|village|road|street|lane|nagar|marg|circle|gymkhana|chowk|cross)\b/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Best-effort canonical city for a race's locationName. Returns null when no
 * clean city can be derived (raw value would be a long venue address, so we'd
 * rather drop the chip than show "BHERULAL PATIDAR GOVERNMENT PG COLLEGE…").
 *
 * Strategy:
 *  1. Match against TOP_CITIES via existing alias substring rules.
 *  2. Match against the wider EXTRA_CITY_ALIASES map.
 *  3. Heuristic comma parse: split the address, strip state/country tokens,
 *     and pick the rightmost non-venue segment that fits in a chip.
 */
export function extractCity(locationName: string | null | undefined): string | null {
  if (!locationName) return null;
  const cleaned = locationName.trim();
  if (!cleaned) return null;

  for (const tc of TOP_CITIES) {
    if (locationMatchesCity(cleaned, tc)) return tc;
  }
  const lc = cleaned.toLowerCase();
  for (const [canon, aliases] of Object.entries(EXTRA_CITY_ALIASES)) {
    if (aliases.some((a) => lc.includes(a))) return canon;
  }

  const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  // Walk from the right (state/country trail) inward, picking the first
  // candidate that's short and doesn't look like a venue/landmark token.
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i];
    const segLc = seg.toLowerCase();
    if (STATE_OR_COUNTRY.has(segLc)) continue;
    if (VENUEISH.test(seg)) continue;
    if (seg.length > 24) continue;
    return titleCase(seg);
  }
  return null;
}
export function pickFeaturedOrFirst<T extends { isFeatured?: boolean; startTime: string }>(
  pool: T[],
): T | null {
  if (!pool.length) return null;
  const sortByDate = (a: T, b: T) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  const featured = pool.filter((r) => r.isFeatured);
  return featured.length ? [...featured].sort(sortByDate)[0] : [...pool].sort(sortByDate)[0];
}
