import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RacesView from './RacesView';
import { API_BASE } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Running Events in India — every event, listed',
  description:
    "Every running event in India, in one feed. Browse marathons, half marathons, 10K and 5K events in Delhi, Mumbai, Bengaluru, Hyderabad, Chennai and beyond. RSVP in a tap.",
  alternates: { canonical: 'https://www.endorfin.run/running-events' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/running-events',
    title: 'Running Events in India — every event, listed | Endorfin',
    description:
      'Every running event in India, in one feed. Marathons, half marathons, 10K and 5K events across 25+ Indian cities.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

export interface ApiEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  locationName?: string;
  locationAddress?: string;
  startTime: string;
  endTime?: string | null;
  registrationEndDate?: string | null;
  organizerName?: string;
  priceMin?: number;
  currency?: string;
  eventType?: string;
  totalTicketsSold?: number | null;
  venueName?: string;
  soldOut?: boolean;
  goingCount?: number;
  isFeatured?: boolean;
  registrationUrl?: string | null;
  distanceCategories?: Array<{ categoryName?: string }>;
  couponCode?: string | null;
  couponDiscountPercent?: number | null;
  hasCoupon?: boolean;
}

// API caps `limit` at 50 and returns { items, total, page, pages }. Page
// through the result set so /running-events can display every upcoming event. Hard
// cap at 20 pages (1000 events) as a guard against runaway loops.
async function getRaces(token: string | null): Promise<ApiEvent[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20;
  // When authed we can't use the Next data cache (response varies by user),
  // so go fresh. For anon traffic — the vast majority — cache for 10 minutes
  // so TTFB doesn't spike when the cache expires.
  const fetchInit: RequestInit = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(token ? { cache: 'no-store' } : { next: { revalidate: 600 } }),
  };
  try {
    const fetchPage = async (page: number) => {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        fetchInit,
      );
      if (!res.ok) return { items: [] as ApiEvent[], pages: 0 };
      const data = await res.json();
      return { items: (data.items || []) as ApiEvent[], pages: Math.max(1, Number(data.pages) || 1) };
    };

    // Fetch page 1 to learn how many pages exist, then fan-out the rest in
    // parallel. Sequential pagination was costing 4–5s TTFB; parallel cuts it
    // to ~max(single page latency).
    const first = await fetchPage(1);
    const collected: ApiEvent[] = [...first.items];
    const totalPages = Math.min(first.pages, MAX_PAGES);
    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
      );
      for (const r of rest) collected.push(...r.items);
    }

    const cutoff = Date.now() - 86400000;
    return collected
      .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  } catch {
    return [];
  }
}

function buildJsonLd(races: ApiEvent[]) {
  if (!races.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Running Events in India',
    description:
      'Every running event in India — marathons, half marathons, 10K and 5K events across 25+ cities',
    url: 'https://www.endorfin.run/running-events',
    numberOfItems: races.length,
    itemListElement: races.slice(0, 30).map((r, i) => {
      const locationLabel = r.locationName || 'India';
      const validFromAnchor = r.registrationEndDate || r.startTime;
      const validFrom = new Date(
        new Date(validFromAnchor).getTime() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: r.title,
          startDate: r.startTime,
          endDate: r.endTime || r.startTime,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode:
            r.eventType === 'virtual'
              ? 'https://schema.org/OnlineEventAttendanceMode'
              : 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: r.locationName || 'India',
            address: {
              '@type': 'PostalAddress',
              addressLocality: r.locationName || undefined,
              addressCountry: 'IN',
            },
          },
          description:
            r.description ||
            `${r.title} — a running event in ${locationLabel}. Register on Endorfin.`,
          organizer: { '@type': 'Organization', name: r.organizerName || 'Endorfin' },
          performer: { '@type': 'PerformingGroup', name: 'Event participants' },
          ...(r.priceMin != null && {
            offers: {
              '@type': 'Offer',
              price: String(r.priceMin),
              priceCurrency: r.currency || 'INR',
              availability: r.soldOut
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
              url: `https://www.endorfin.run/running-events/${r.slug || r.id}`,
              validFrom,
              ...(r.registrationEndDate && { validThrough: r.registrationEndDate }),
            },
          }),
          ...(r.imageUrl && { image: r.imageUrl }),
          url: `https://endorfin.run/e/${r.slug || r.id}`,
        },
      };
    }),
  };
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.endorfin.run/' },
    { '@type': 'ListItem', position: 2, name: 'Running Events', item: 'https://www.endorfin.run/running-events' },
  ],
};

export default async function RacesPage() {
  const token = await getSessionToken();
  const races = await getRaces(token);
  const jsonLd = buildJsonLd(races);

  return (
    <main id="main-content" className="overflow-x-hidden">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      <div className="v1-races-page">
        <RacesView races={races} />
      </div>
      <Footer />
    </main>
  );
}
