import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RacesView from './RacesView';
import { API_BASE } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Races in India — every race, listed',
  description:
    "Every running race in India, in one feed. Browse marathons, half marathons, 10K and 5K races in Delhi, Mumbai, Bengaluru, Hyderabad, Chennai and beyond. RSVP in a tap.",
  alternates: { canonical: 'https://www.endorfin.run/races' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/races',
    title: 'Races in India — every race, listed | Endorfin',
    description:
      'Every running race in India, in one feed. Marathons, half marathons, 10K and 5K races across 25+ Indian cities.',
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
// through the result set so /races can display every upcoming event. Hard
// cap at 20 pages (1000 events) as a guard against runaway loops.
async function getRaces(token: string | null): Promise<ApiEvent[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20;
  // When authed we can't use ISR (response varies by user), so go fresh.
  // 60s revalidate keeps anon results fresh enough for is_featured / coupon
  // edits to appear within a minute.
  const fetchInit: RequestInit = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(token ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
  };
  try {
    const collected: ApiEvent[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        fetchInit,
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: ApiEvent[] = data.items || [];
      collected.push(...items);
      totalPages = Math.max(1, Number(data.pages) || 1);
      if (items.length < PAGE_SIZE) break;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);

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
    name: 'Running Races in India',
    description:
      'Every running race in India — marathons, half marathons, 10K and 5K races across 25+ cities',
    url: 'https://www.endorfin.run/races',
    numberOfItems: races.length,
    itemListElement: races.slice(0, 30).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: r.title,
        startDate: r.startTime,
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
        ...(r.priceMin != null && {
          offers: {
            '@type': 'Offer',
            price: String(r.priceMin),
            priceCurrency: r.currency || 'INR',
            availability: r.soldOut
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
            url: `https://endorfin.run/e/${r.slug || r.id}`,
          },
        }),
        ...(r.imageUrl && { image: r.imageUrl }),
        url: `https://endorfin.run/e/${r.slug || r.id}`,
      },
    })),
  };
}

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
      <Header />
      <div className="v1-races-page">
        <RacesView races={races} isAuthed={!!token} />
      </div>
      <Footer />
    </main>
  );
}
