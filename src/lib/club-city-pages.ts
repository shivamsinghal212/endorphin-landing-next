/**
 * SEO city landing pages for /run-clubs/[city].
 *
 * Granular per-city (Gurgaon and Noida are separate from Delhi) so each page
 * can rank for its own exact-match query like "run clubs in Gurgaon".
 * Distinct from TOP_CITIES in src/lib/cities.ts, which groups all of NCR
 * into a single chip for the /clubs and /races filter UI.
 *
 * Quality gate: pages are only emitted in the sitemap and statically built
 * when a city has at least MIN_CLUBS_PER_CITY clubs — avoids doorway/thin
 * pages that Google would treat as spam.
 */

export const MIN_CLUBS_PER_CITY = 2;

export interface ClubCityPage {
  slug: string;
  name: string;
  aliases: string[];
  region: string;
  intro: string;
  landmarks: string[];
}

export const CLUB_CITY_PAGES: ClubCityPage[] = [
  {
    slug: 'delhi',
    name: 'Delhi',
    aliases: ['delhi', 'new delhi'],
    region: 'Delhi',
    intro:
      'Delhi runs at dawn. Before the traffic thickens and the haze settles in, the Lodhi Gardens loop, the Nehru Park warm-up circle, and the Rajpath/Kartavya Path straights fill up with crews chasing a tempo or just a flat 5K. Endorfin lists every active run club in Delhi — morning groups, marathon training squads, and trail collectives heading out to the Aravalli ridge on weekends. Browse the directory below, see who runs your pace, and show up at the next session.',
    landmarks: ['Lodhi Gardens', 'Nehru Park', 'Kartavya Path', 'Aravalli ridge'],
  },
  {
    slug: 'gurgaon',
    name: 'Gurgaon',
    aliases: ['gurgaon', 'gurugram'],
    region: 'Haryana (Delhi NCR)',
    intro:
      'Gurgaon — Gurugram on the map — runs hard. Cyber Hub crews start before the corporate towers wake up, Aravalli Biodiversity Park hosts trail loops on Saturdays, and the Leisure Valley track is where most of the city does its weekday speed work. Endorfin lists every active run club in Gurgaon: marathon training groups, casual morning crews, and trail collectives. Find your pace below, RSVP to the next club run, and turn solo kilometres into a weekly habit with people who show up.',
    landmarks: ['Cyber Hub', 'Aravalli Biodiversity Park', 'Leisure Valley', 'Sector 29'],
  },
  {
    slug: 'noida',
    name: 'Noida',
    aliases: ['noida', 'greater noida'],
    region: 'Uttar Pradesh (Delhi NCR)',
    intro:
      'Noida runners have something most Indian cities don\'t — clean, wide sector roads, the Yamuna Expressway shoulder for long efforts, and Okhla Bird Sanctuary loops for easy days. Endorfin lists every active run club across Noida and Greater Noida: training groups prepping for ADHM and the Delhi Marathon, casual sector crews, and weekend long-run squads. Browse the directory below, see who meets near your sector, and join a crew that runs your weekly mileage.',
    landmarks: ['Yamuna Expressway', 'Okhla Bird Sanctuary', 'Sector 18', 'Botanical Garden'],
  },
  {
    slug: 'mumbai',
    name: 'Mumbai',
    aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
    region: 'Maharashtra',
    intro:
      'Mumbai runs on its coastline. Marine Drive at 5:30am, Bandra Bandstand loops, the Carter Road promenade, and the Worli sea-face stretch — the city has more good running routes than any other in India, and a run club on almost every one. Endorfin lists every active crew in Mumbai, Navi Mumbai, and Thane: TMM training squads, suburban morning groups, and trail clubs heading to Yeoor and SGNP on weekends. Browse below and find the one closest to your pace.',
    landmarks: ['Marine Drive', 'Bandra Bandstand', 'Carter Road', 'Yeoor Hills', 'SGNP'],
  },
  {
    slug: 'bengaluru',
    name: 'Bengaluru',
    aliases: ['bengaluru', 'bangalore'],
    region: 'Karnataka',
    intro:
      'Bengaluru\'s weather makes it India\'s most consistent running city — sub-25°C mornings almost year-round and Cubbon Park, Lalbagh, and Sankey Tank loops within walking distance of every other neighbourhood. Endorfin lists every active run club in Bengaluru: marathon training groups, MG Road tempo crews, Whitefield and Koramangala morning clubs, and the trail collectives that head out to Nandi Hills and Skandagiri on weekends. Find a club that runs your distance below.',
    landmarks: ['Cubbon Park', 'Lalbagh', 'Sankey Tank', 'Nandi Hills', 'Skandagiri'],
  },
  {
    slug: 'pune',
    name: 'Pune',
    aliases: ['pune', 'pimpri', 'chinchwad'],
    region: 'Maharashtra',
    intro:
      'Pune is a runner\'s city in disguise — Vetal Tekdi for hill repeats, the University Circle road for speed, ARAI Hill for long climbs, and a community that has been running together for decades. Endorfin lists every active run club in Pune and Pimpri-Chinchwad: Pune Running groups, Kothrud and Baner crews, marathon-prep squads, and the weekend trail collectives that head out to Sinhagad and Lonavla. Browse below and join a crew that runs near you.',
    landmarks: ['Vetal Tekdi', 'ARAI Hill', 'University Circle', 'Sinhagad'],
  },
  {
    slug: 'hyderabad',
    name: 'Hyderabad',
    aliases: ['hyderabad', 'secunderabad'],
    region: 'Telangana',
    intro:
      'Hyderabad runs around water and rocks. The Necklace Road loop circles Hussain Sagar, KBR Park has the city\'s most-used 2.5K trail, and Durgam Cheruvu and the Botanical Gardens host the city\'s biggest training crews. Endorfin lists every active run club in Hyderabad and Secunderabad: Hyderabad Runners chapters, Jubilee Hills morning crews, Gachibowli tech-park squads, and weekend long-run groups. Browse below and join a club that meets near your neighbourhood.',
    landmarks: ['KBR Park', 'Necklace Road', 'Durgam Cheruvu', 'Botanical Gardens'],
  },
  {
    slug: 'chennai',
    name: 'Chennai',
    aliases: ['chennai', 'madras'],
    region: 'Tamil Nadu',
    intro:
      'Chennai runs by the sea. Marina Beach pre-dawn, Besant Nagar/Elliot\'s Beach loops, and the ECR stretch toward Mahabalipuram for long runs — the city has a quiet but committed running scene that comes out before the heat. Endorfin lists every active run club in Chennai: Chennai Runners chapters, Adyar and Anna Nagar crews, marathon training groups prepping for the Chennai Marathon, and weekend long-run squads. Browse below and find a club at your pace.',
    landmarks: ['Marina Beach', 'Elliot\'s Beach', 'ECR', 'Anna Nagar'],
  },
  {
    slug: 'kolkata',
    name: 'Kolkata',
    aliases: ['kolkata', 'calcutta', 'howrah'],
    region: 'West Bengal',
    intro:
      'Kolkata runs through the Maidan. The wide open ground in front of the Victoria Memorial, the Rabindra Sarobar lake loop, and the Eden Gardens periphery are where the city\'s runners meet — mostly before sunrise, mostly together. Endorfin lists every active run club in Kolkata and Howrah: Kolkata Runners groups, Salt Lake morning crews, TSK training squads, and the weekend long-run groups that head out to the Hooghly riverside. Browse the directory below.',
    landmarks: ['Maidan', 'Rabindra Sarobar', 'Victoria Memorial', 'Hooghly riverside'],
  },
  {
    slug: 'ahmedabad',
    name: 'Ahmedabad',
    aliases: ['ahmedabad', 'amdavad'],
    region: 'Gujarat',
    intro:
      'Ahmedabad has the Sabarmati Riverfront — a flat, paved, lit, 11.5km stretch that\'s arguably the best urban running corridor in India. Most of the city\'s clubs meet here at dawn. Endorfin lists every active run club in Ahmedabad: Riverfront crews, SG Highway morning groups, marathon training squads, and weekend long-run collectives. Browse below and join a club that runs your weekly mileage.',
    landmarks: ['Sabarmati Riverfront', 'Kankaria Lake', 'SG Highway'],
  },
];

const SLUG_INDEX = new Map(CLUB_CITY_PAGES.map((c) => [c.slug, c]));

export function getClubCityPage(slug: string): ClubCityPage | null {
  return SLUG_INDEX.get(slug) ?? null;
}

/**
 * True if the club's `city` field matches the SEO city's aliases.
 * Substring match on lowercased value so "Gurugram, Haryana" still
 * matches the "gurgaon" page.
 */
export function clubMatchesCityPage(
  clubCity: string | null | undefined,
  page: ClubCityPage,
): boolean {
  const loc = (clubCity || '').toLowerCase().trim();
  if (!loc) return false;
  return page.aliases.some((a) => loc.includes(a));
}

export function clubsForCityPage<T extends { city: string }>(
  clubs: T[],
  page: ClubCityPage,
): T[] {
  return clubs.filter((c) => clubMatchesCityPage(c.city, page));
}
