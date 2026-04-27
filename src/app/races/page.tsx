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
  distanceCategories?: Array<{ categoryName?: string }>;
  couponCode?: string | null;
  couponDiscountPercent?: number | null;
  hasCoupon?: boolean;
}

async function getRaces(token: string | null): Promise<ApiEvent[]> {
  try {
    // When authed we can't use ISR (response varies by user), so go fresh.
    const res = await fetch(`${API_BASE}/api/v1/events?limit=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // 60s revalidate so flipping is_featured / coupon fields in the DB
      // shows up on the public page within a minute (was 1 hour).
      ...(token ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: ApiEvent[] = data.items || [];
    const cutoff = Date.now() - 86400000;
    return items
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Header />
      <div className="v1-races-page">
        <RacesView races={races} />
      </div>
      <Footer />
    </main>
  );
}
