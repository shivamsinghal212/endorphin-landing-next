/**
 * SEO city × race-type landing pages under /running-events/[scope]/[city].
 *
 * Scope encodes both race type and the connecting preposition so the URL
 * reads as exact-match for the target query:
 *   - /running-events/in/mumbai          → "Races in Mumbai"
 *   - /running-events/marathon-in/mumbai → "Marathons in Mumbai"
 *
 * Quality gate: a page is only emitted when there are enough matching
 * races in the city — different floors for the all-races overview vs the
 * narrower type-filtered pages, to avoid doorway / thin-content spam.
 */

import type { ApiEvent } from '@/app/running-events/page';
import { extractCity } from '@/lib/cities';

export type RaceScope = 'in' | 'marathon-in' | 'half-marathon-in' | '10k-in' | '5k-in';

export const RACE_SCOPES: RaceScope[] = [
  'in',
  'marathon-in',
  'half-marathon-in',
  '10k-in',
  '5k-in',
];

interface RaceScopeMeta {
  /** Plural noun phrase used in H1, e.g. "Marathons" or "Running races". */
  noun: string;
  /** Singular for grammar fallback. */
  nounSingular: string;
  /** Short keyword form for the URL, e.g. "marathon" / "10k". */
  keyword: string;
  /** Minimum races required for the (scope, city) page to render. */
  minCount: number;
}

export const RACE_SCOPE_META: Record<RaceScope, RaceScopeMeta> = {
  'in': {
    noun: 'Running events',
    nounSingular: 'event',
    keyword: 'running event',
    minCount: 2,
  },
  'marathon-in': {
    noun: 'Marathons',
    nounSingular: 'marathon',
    keyword: 'marathon',
    minCount: 2,
  },
  'half-marathon-in': {
    noun: 'Half marathons',
    nounSingular: 'half marathon',
    keyword: 'half marathon',
    minCount: 2,
  },
  '10k-in': {
    noun: '10K runs',
    nounSingular: '10K',
    keyword: '10k',
    minCount: 3,
  },
  '5k-in': {
    noun: '5K runs',
    nounSingular: '5K',
    keyword: '5k',
    minCount: 3,
  },
};

export interface RaceCityPage {
  slug: string;
  name: string;
  /** Cities the existing extractCity() helper canonicalises to. */
  extractCityNames: string[];
  region: string;
  intro: string;
}

/**
 * extractCityNames is what extractCity() in lib/cities.ts returns for a
 * given race location. We match by canonical city to stay consistent with
 * the chip filter on /running-events. Delhi-NCR is unique: extractCity groups
 * Gurgaon, Noida etc. into "Delhi/NCR", so we then break the page apart
 * by re-scanning the original locationName via additional aliases.
 */
const NCR_SUB_ALIASES: Record<string, string[]> = {
  delhi: ['delhi', 'new delhi'],
  gurgaon: ['gurgaon', 'gurugram'],
  noida: ['noida', 'greater noida'],
};

export const RACE_CITY_PAGES: RaceCityPage[] = [
  {
    slug: 'delhi',
    name: 'Delhi',
    extractCityNames: ['Delhi/NCR'],
    region: 'Delhi',
    intro:
      'Delhi runs in the cold months. The Airtel Delhi Half Marathon, the Vedanta Delhi Half Marathon, the IDBI Delhi Marathon and a steady drumbeat of timing-chip 10Ks and 5Ks fill the calendar from October through February. Endorfin lists every running event in Delhi with dates, distances, entry fees, and one-tap RSVP. Browse below to plan your season.',
  },
  {
    slug: 'gurgaon',
    name: 'Gurgaon',
    extractCityNames: ['Delhi/NCR'],
    region: 'Haryana (Delhi NCR)',
    intro:
      'Gurgaon\'s race scene runs on Aravalli trails and Cyber Hub roads. The Millennium City Marathon, La Ultra training events, corporate 10Ks, and trail races out of the Biodiversity Park keep the calendar full year-round. Endorfin lists every upcoming running event in Gurgaon — marathons, half marathons, 10Ks and 5Ks. Browse below, RSVP in a tap.',
  },
  {
    slug: 'noida',
    name: 'Noida',
    extractCityNames: ['Delhi/NCR'],
    region: 'Uttar Pradesh (Delhi NCR)',
    intro:
      'Noida runs flat. The wide sector roads and the Yamuna Expressway make it a fast course city, and the Noida Marathon plus a steady flow of timing-chip 10Ks and corporate runs fill the calendar. Endorfin lists every running event in Noida and Greater Noida. Browse below, see the dates, and lock in your season.',
  },
  {
    slug: 'mumbai',
    name: 'Mumbai',
    extractCityNames: ['Mumbai'],
    region: 'Maharashtra',
    intro:
      'Mumbai\'s racing season is built around one of the world\'s great marathons. The Tata Mumbai Marathon (TMM) — held every January and finishing under Rajabai Tower — anchors a long calendar of half marathons, 10Ks, 5Ks and corporate runs across the city, Navi Mumbai, and Thane. Endorfin lists every running event with dates, distances, entry fees and one-tap RSVP.',
  },
  {
    slug: 'bengaluru',
    name: 'Bengaluru',
    extractCityNames: ['Bengaluru'],
    region: 'Karnataka',
    intro:
      'Bengaluru has the deepest race calendar in India after Mumbai. The TCS World 10K (an IAAF Gold Label road race), the Bengaluru Marathon, the Kaveri Trail Marathon, plus a long tail of 10Ks, 5Ks and trail events out of Nandi Hills and Skandagiri run almost every weekend in the cool months. Endorfin lists them all — browse below.',
  },
  {
    slug: 'pune',
    name: 'Pune',
    extractCityNames: ['Pune'],
    region: 'Maharashtra',
    intro:
      'Pune\'s race scene runs through Pune Running. The Pune Running Beyond Myself series, the Pune International Marathon, Vasaichi Vaari, and a stream of trail races out of Sinhagad and Lonavla keep the city running year-round. Endorfin lists every running event in Pune and Pimpri-Chinchwad — marathons, half marathons, 10Ks and 5Ks. Browse below.',
  },
  {
    slug: 'hyderabad',
    name: 'Hyderabad',
    extractCityNames: ['Hyderabad'],
    region: 'Telangana',
    intro:
      'Hyderabad runs on Hyderabad Runners. The Airtel Hyderabad Marathon — one of the oldest in India outside Mumbai — anchors a calendar packed with half marathons, 10Ks, and corporate runs around Necklace Road and Gachibowli. Endorfin lists every running event in Hyderabad and Secunderabad. Browse below.',
  },
  {
    slug: 'chennai',
    name: 'Chennai',
    extractCityNames: ['Chennai'],
    region: 'Tamil Nadu',
    intro:
      'Chennai\'s race season runs cool. The Chennai Marathon, the Wipro Chennai Marathon, the Chennai Trail Marathon, and a steady calendar of beachfront 10Ks and 5Ks fill the months from October to February. Endorfin lists every running event in Chennai with dates, distances, fees, and RSVPs in one tap.',
  },
  {
    slug: 'kolkata',
    name: 'Kolkata',
    extractCityNames: ['Kolkata'],
    region: 'West Bengal',
    intro:
      'Kolkata runs the Tata Steel Kolkata 25K — a unique odd-distance race that\'s become a fixture on the Indian calendar — alongside the Kolkata Marathon, half marathons, 10Ks and trail races. Endorfin lists every running event in Kolkata and Howrah. Browse below to plan your season.',
  },
  {
    slug: 'ahmedabad',
    name: 'Ahmedabad',
    extractCityNames: ['Ahmedabad'],
    region: 'Gujarat',
    intro:
      'Ahmedabad runs the Adani Ahmedabad Marathon along the Sabarmati Riverfront — arguably the most photogenic course in India — plus a calendar of half marathons, 10Ks and 5Ks year-round. Endorfin lists every running event in Ahmedabad with dates and distances. Browse below.',
  },
];

const SLUG_INDEX = new Map(RACE_CITY_PAGES.map((c) => [c.slug, c]));

export function getRaceCityPage(slug: string): RaceCityPage | null {
  return SLUG_INDEX.get(slug) ?? null;
}

export function getRaceScopeMeta(scope: string): { scope: RaceScope; meta: RaceScopeMeta } | null {
  if (!RACE_SCOPES.includes(scope as RaceScope)) return null;
  const s = scope as RaceScope;
  return { scope: s, meta: RACE_SCOPE_META[s] };
}

/**
 * True if the race has at least one distance category that matches the
 * given race scope. The "in" scope (all races) matches every race.
 */
export function raceMatchesScope(race: ApiEvent, scope: RaceScope): boolean {
  if (scope === 'in') return true;
  const cats = race.distanceCategories || [];
  if (!cats.length) return false;
  return cats.some((c) => categoryMatchesScope(c.categoryName || '', scope));
}

function categoryMatchesScope(rawCat: string, scope: RaceScope): boolean {
  const u = (rawCat || '').toUpperCase().replace(/\s+/g, '');
  if (!u) return false;
  switch (scope) {
    case 'marathon-in':
      // Marathon ≈ 42K / FM. Exclude anything that's a half marathon.
      if (u === 'HM' || u === '21K' || u.includes('HALF')) return false;
      return u === 'FM' || u === '42K' || u.includes('MARATHON');
    case 'half-marathon-in':
      return u === 'HM' || u === '21K' || u.includes('HALFMARATHON');
    case '10k-in':
      return u === '10K';
    case '5k-in':
      return u === '5K';
    case 'in':
      return true;
  }
}

/**
 * True if a race's location resolves to this SEO city. For NCR pages we
 * narrow further: extractCity returns "Delhi/NCR" for Gurgaon/Noida races,
 * so we re-scan the raw locationName for sub-city aliases to keep the
 * Delhi vs Gurgaon vs Noida pages distinct.
 */
export function raceMatchesCity(race: ApiEvent, page: RaceCityPage): boolean {
  const loc = race.locationName || '';
  const canon = extractCity(loc);
  if (!canon) return false;
  if (!page.extractCityNames.includes(canon)) return false;

  // NCR disambiguation
  const subAliases = NCR_SUB_ALIASES[page.slug];
  if (subAliases) {
    const lc = loc.toLowerCase();
    return subAliases.some((a) => lc.includes(a));
  }
  return true;
}

export function filterRacesForCityScope(
  races: ApiEvent[],
  page: RaceCityPage,
  scope: RaceScope,
): ApiEvent[] {
  return races.filter((r) => raceMatchesCity(r, page) && raceMatchesScope(r, scope));
}

export function passesQualityGate(count: number, scope: RaceScope): boolean {
  return count >= RACE_SCOPE_META[scope].minCount;
}
