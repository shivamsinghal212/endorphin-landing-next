import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from './ClubsView';
import { clubsApi } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Run clubs in India — every crew, listed',
  description:
    'Find your crew. Morning runs, marathon training, trail weekends — a verified directory of run clubs across India. Show up with people who run your pace.',
  alternates: { canonical: 'https://www.endorfin.run/clubs' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/clubs',
    title: 'Run clubs in India — every crew, listed | Endorfin',
    description:
      'A verified directory of run clubs across India. Browse clubs in Delhi, Mumbai, Bengaluru, Hyderabad, Chennai and beyond.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

export interface ApiClubStats {
  members?: number;
  runsThisMonth?: number;
  kmThisMonth?: number;
  yearsRunning?: number;
}

export interface ClubEventRecapPhoto {
  url: string;
  captionTitle: string | null;
  captionMeta: string | null;
}

export interface ClubEventRecapVideo {
  url: string;
  posterUrl: string | null;
  durationSec: number | null;
  captionTitle: string | null;
  captionMeta: string | null;
}

export interface ClubEventRecap {
  summary: string | null;
  showedUp: number | null;
  paceGroups: string | null;
  after: string | null;
  photos: ClubEventRecapPhoto[];
  videos: ClubEventRecapVideo[];
}

export interface ClubEvent {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  startTime: string;
  endTime: string | null;
  maxParticipants: number | null;
  coverImageUrl: string | null;
  distanceKm: number | null;
  eventType: 'club_run' | 'race_event';
  recap: ClubEventRecap | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  goingCount: number;
}

export interface ApiClub {
  slug: string;
  name: string;
  city: string;
  establishedYear?: number | null;
  logoUrl?: string | null;
  headerImageUrl?: string | null;
  kicker?: string | null;
  subtitle?: string | null;
  description?: string | null;
  tags?: string[];
  isVerified?: boolean;
  isFeatured?: boolean;
  stats?: ApiClubStats;
  events?: ClubEvent[];
  updatedAt?: string | null;
}

interface ListedClub {
  slug: string;
  name: string;
  city: string;
  updatedAt?: string | null;
}

async function getClubs(): Promise<ApiClub[]> {
  try {
    const res = await fetch('https://api.endorfin.run/api/v1/clubs', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const listed = (await res.json()) as ListedClub[];
    if (!Array.isArray(listed) || listed.length === 0) return [];

    const settled = await Promise.all(
      listed.map(async (c): Promise<ApiClub | null> => {
        try {
          const [detailRes, eventsRes] = await Promise.all([
            fetch(`https://api.endorfin.run/api/v1/clubs/${c.slug}`, {
              next: { revalidate: 3600 },
            }),
            fetch(`https://api.endorfin.run/api/v1/clubs/${c.slug}/events`, {
              next: { revalidate: 3600 },
            }),
          ]);
          if (!detailRes.ok) return null;
          const d = (await detailRes.json()) as ApiClub;
          const events = eventsRes.ok ? ((await eventsRes.json()) as ClubEvent[]) : [];
          return { ...d, events: Array.isArray(events) ? events : [] };
        } catch {
          return null;
        }
      })
    );
    return settled.filter((c): c is ApiClub => !!c && !!c.slug);
  } catch {
    return [];
  }
}

function buildJsonLd(clubs: ApiClub[]) {
  if (!clubs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Run Clubs in India',
    description:
      'A verified directory of run clubs across India — morning crews, marathon training groups, trail collectives.',
    url: 'https://www.endorfin.run/clubs',
    numberOfItems: clubs.length,
    itemListElement: clubs.slice(0, 30).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsClub',
        name: c.name,
        url: `https://www.endorfin.run/clubs/${c.slug}`,
        description: c.subtitle || c.description || undefined,
        sport: 'Running',
        address: {
          '@type': 'PostalAddress',
          addressLocality: c.city || undefined,
          addressCountry: 'IN',
        },
        ...(c.establishedYear && { foundingDate: String(c.establishedYear) }),
        ...(c.logoUrl && { logo: c.logoUrl, image: c.logoUrl }),
      },
    })),
  };
}

export default async function ClubsPage() {
  const token = await getSessionToken();
  const [clubs, myClubs] = await Promise.all([
    getClubs(),
    token ? clubsApi.listMyClubs(token, 'all').catch(() => []) : Promise.resolve([]),
  ]);
  const memberSlugs = myClubs.map((c) => c.slug);
  const jsonLd = buildJsonLd(clubs);

  return (
    <main id="main-content" className="overflow-x-hidden">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Header />
      <div className="v1-clubs-page">
        <ClubsView clubs={clubs} memberSlugs={memberSlugs} />
      </div>
      <Footer />
    </main>
  );
}
