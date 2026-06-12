import Header from '@/components/Header';
import HeroSearch from '@/components/HeroSearch';
import HomeStreak from '@/components/HomeStreak';
import HomePillars, { type FeaturedEvent, type FeaturedClub } from '@/components/HomePillars';
import ForClubsBand from '@/components/ForClubsBand';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

interface ApiEvent {
  id: string;
  slug?: string | null;
  title: string;
  startTime: string;
  endTime?: string | null;
  registrationEndDate?: string | null;
  locationName?: string;
  locationAddress?: string;
  priceMin?: number;
  imageUrl?: string;
}

async function getUpcomingEvents(): Promise<ApiEvent[]> {
  try {
    const res = await fetch('https://api.endorfin.run/api/v1/events?limit=6', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || data.data || data || [];
  } catch {
    return [];
  }
}

interface ClubListItem {
  name: string;
  city?: string;
  publishedAt?: string | null;
  isFeatured?: boolean;
  isVerified?: boolean;
  stats?: { members?: number };
}

// One page of the public club directory is plenty to pick a featured club
// for the homepage tile. Bare JSON array, same shape as fetchAllClubsList.
async function getFeaturedClubs(): Promise<ClubListItem[]> {
  try {
    const res = await fetch('https://api.endorfin.run/api/v1/clubs?limit=20&page=1', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const IST = 'Asia/Kolkata';
function deriveEvent(e: ApiEvent): FeaturedEvent {
  const d = new Date(e.startTime);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: IST, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: IST, month: 'short' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(d).toUpperCase();
  const loc = e.locationName || e.locationAddress || 'India';
  const price = e.priceMin == null ? null : e.priceMin === 0 ? 'Free' : `from ₹${e.priceMin}`;
  const meta = [loc, time, price].filter(Boolean).join(' · ');
  return { title: e.title, day, month, meta };
}

function pickClub(clubs: ClubListItem[]): FeaturedClub | null {
  const published = clubs.filter((c) => c.publishedAt);
  const pool = published.length ? published : clubs;
  if (!pool.length) return null;
  const c = [...pool].sort(
    (a, b) =>
      Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
      (b.stats?.members ?? 0) - (a.stats?.members ?? 0),
  )[0];
  const initials = c.name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || 'EN';
  const members = c.stats?.members;
  const meta = [c.city, members ? `${members} members` : null].filter(Boolean).join(' · ');
  return { name: c.name, initials, meta };
}

export interface HeroStats {
  clubs: number;
  races: number;
  clubEvents: number;
  cities: number;
}

// Curated marketing numbers. We used to derive these from
// /discover?includeFacets=true, but the backend folded that route into
// /discover/smart (the old URL 404s, so the fallback always rendered) and its
// facet counts don't match the marketing claims anyway — club_event counts
// every occurrence ever and cities counts raw name variants.
const HERO_STATS: HeroStats = { clubs: 110, races: 500, clubEvents: 200, cities: 30 };

function buildEventsJsonLd(events: ApiEvent[]) {
  if (!events.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming Running Events in India',
    description: 'Marathons, half marathons, 10K and 5K events across India',
    url: 'https://www.endorfin.run',
    numberOfItems: events.length,
    itemListElement: events.map((event, i) => {
      const locationLabel = event.locationName || event.locationAddress || 'India';
      const validFromAnchor = event.registrationEndDate || event.startTime;
      const validFrom = new Date(
        new Date(validFromAnchor).getTime() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: event.title,
          startDate: event.startTime,
          endDate: event.endTime || event.startTime,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: event.locationName || event.locationAddress || 'India',
            address: {
              '@type': 'PostalAddress',
              addressLocality: event.locationName || undefined,
              addressCountry: 'IN',
            },
          },
          description: `${event.title} — a running event in ${locationLabel}. Register on Endorfin.`,
          organizer: { '@type': 'Organization', name: 'Endorfin' },
          performer: { '@type': 'PerformingGroup', name: 'Event participants' },
          ...(event.priceMin != null && {
            offers: {
              '@type': 'Offer',
              price: String(event.priceMin),
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
              url: `https://www.endorfin.run/running-events/${event.slug || event.id}`,
              validFrom,
              ...(event.registrationEndDate && { validThrough: event.registrationEndDate }),
            },
          }),
          ...(event.imageUrl && { image: event.imageUrl }),
          url: `https://api.endorfin.run/e/${event.id}`,
        },
      };
    }),
  };
}

export default async function Home() {
  const [events, clubs] = await Promise.all([getUpcomingEvents(), getFeaturedClubs()]);
  const eventsJsonLd = buildEventsJsonLd(events);
  const featuredEvent = events[0] ? deriveEvent(events[0]) : null;
  const featuredClub = pickClub(clubs);

  return (
    <main id="main-content" className="overflow-x-hidden">
      {eventsJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }}
        />
      )}
      <Header />
      <div className="hstreak">
        <HomeStreak />
        <HeroSearch stats={HERO_STATS} />
        <HomePillars event={featuredEvent} club={featuredClub} />
        <ForClubsBand />
        <CTASection />
      </div>
      <Footer />
    </main>
  );
}
