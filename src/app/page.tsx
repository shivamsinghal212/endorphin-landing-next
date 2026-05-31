import Header from '@/components/Header';
import HeroSearch from '@/components/HeroSearch';
import PillarsAccordion from '@/components/PillarsAccordion';
import ManageClubSection from '@/components/ManageClubSection';
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

export interface HeroStats {
  clubs: number;
  races: number;
  clubEvents: number;
  cities: number;
}

const FALLBACK_STATS: HeroStats = { clubs: 50, races: 500, clubEvents: 100, cities: 25 };

// /discover?includeFacets=true exposes kind + city counts at the top level —
// cheaper than three separate listing fetches. Cached for an hour because the
// numbers move slowly.
async function getHeroStats(): Promise<HeroStats> {
  try {
    const res = await fetch(
      'https://api.endorfin.run/api/v1/discover?includeFacets=true&limit=1',
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return FALLBACK_STATS;
    const data = (await res.json()) as {
      facets: {
        kinds: { value: string; count: number }[];
        cities: { value: string; count: number }[];
      } | null;
    };
    if (!data.facets) return FALLBACK_STATS;
    const kindCount = (v: string) =>
      data.facets!.kinds.find((k) => k.value === v)?.count ?? 0;
    return {
      clubs: kindCount('club'),
      races: kindCount('race'),
      clubEvents: kindCount('club_event'),
      cities: data.facets.cities.length,
    };
  } catch {
    return FALLBACK_STATS;
  }
}

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
  const [events, heroStats] = await Promise.all([getUpcomingEvents(), getHeroStats()]);
  const eventsJsonLd = buildEventsJsonLd(events);

  return (
    <main id="main-content" className="overflow-x-hidden">
      {eventsJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }}
        />
      )}
      <Header />
      <HeroSearch stats={heroStats} />
      <PillarsAccordion />
      <ManageClubSection />
      <CTASection />
      <Footer />
    </main>
  );
}
