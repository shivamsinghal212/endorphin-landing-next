import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import PillarsAccordion from '@/components/PillarsAccordion';
import MeetKip from '@/components/MeetKip';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

interface ApiEvent {
  id: string;
  title: string;
  startTime: string;
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

function buildEventsJsonLd(events: ApiEvent[]) {
  if (!events.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming Running Events in India',
    description: 'Marathons, half marathons, 10K and 5K races across India',
    url: 'https://www.endorfin.run',
    numberOfItems: events.length,
    itemListElement: events.map((event, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: event.title,
        startDate: event.startTime,
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
        ...(event.priceMin != null && {
          offers: {
            '@type': 'Offer',
            price: String(event.priceMin),
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: `https://api.endorfin.run/e/${event.id}`,
          },
        }),
        ...(event.imageUrl && { image: event.imageUrl }),
        url: `https://api.endorfin.run/e/${event.id}`,
      },
    })),
  };
}

export default async function Home() {
  const events = await getUpcomingEvents();
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
      <HeroSection />
      <PillarsAccordion />
      <MeetKip />
      <CTASection />
      <Footer />
    </main>
  );
}
