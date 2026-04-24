import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from './ClubsView';

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

export interface ApiClubNextRun {
  date?: string;
  time?: string | null;
  title?: string;
  location?: string | null;
  distanceKm?: number | null;
  goingCount?: number | null;
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
  stats?: ApiClubStats;
  nextRun?: ApiClubNextRun | null;
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
      listed.map(async (c) => {
        try {
          const r = await fetch(`https://api.endorfin.run/api/v1/clubs/${c.slug}`, {
            next: { revalidate: 3600 },
          });
          if (!r.ok) return null;
          const d = (await r.json()) as ApiClub;
          return d;
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
  const clubs = await getClubs();
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
        <ClubsView clubs={clubs} />
      </div>
      <Footer />
    </main>
  );
}
