import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from './ClubsView';
import { clubsApi, type MyClubClaim, type MyClubMembership } from '@/lib/api';
import { getSessionEmail, getSessionToken } from '@/lib/session';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import type { JoinFormField } from '@/lib/admin-api';

// ─── Re-exported types (consumed by /clubs/[slug] and /run-clubs/[city]) ──
// Kept here because moving them to a separate file is a larger refactor;
// the /clubs LIST page itself no longer uses these shapes — it works
// against DiscoverHit from the unified discover endpoint. The detail
// pages and the city-landing pages still hit the legacy /api/v1/clubs/{slug}
// endpoints which return these richer shapes.

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

export interface ClubEventComment {
  user: string | null;
  text: string | null;
  likes: number;
  date: string | null;
  userPictureUrl?: string | null;
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
  topComments?: ClubEventComment[] | null;
  sourcePostUrl?: string | null;
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
  isClaimed?: boolean;
  joinForm?: JoinFormField[] | null;
  requiresApproval?: boolean;
  stats?: ApiClubStats;
  events?: ClubEvent[];
  updatedAt?: string | null;
}

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

const API = 'https://api.endorfin.run/api/v1';
const PAGE_SIZE = 50;
// Hard cap so a runaway dataset can't blow up SSR. Currently ~50 clubs in
// production; this gives us 10× headroom before we need real pagination.
const MAX_PAGES = 10;

interface DiscoverPage {
  items: DiscoverHit[];
  total: number;
  facets?: {
    cities?: { value: string; count: number }[];
  } | null;
}

/**
 * Fetches every published club via /discover/smart, paginated 50 at a time
 * in parallel. The unified discover endpoint returns the same minimal
 * shape we need for cards (name, slug, city, logo via image_url, members
 * count via the recent backend extension), so we don't need the old
 * per-slug N+1 detail fetch.
 *
 * Returns clubs sorted by member count desc — featured strip slices the
 * top 5; the all-clubs grid uses the rest in the same order.
 */
async function getAllClubs(): Promise<{ clubs: DiscoverHit[]; cityFacets: { value: string; count: number }[] }> {
  try {
    const firstRes = await fetch(
      `${API}/discover/smart?kind=club&limit=${PAGE_SIZE}&offset=0&includeFacets=true&sort=newest`,
      { next: { revalidate: 3600 } },
    );
    if (!firstRes.ok) return { clubs: [], cityFacets: [] };
    const first = (await firstRes.json()) as DiscoverPage;

    const total = first.total ?? first.items.length;
    const additional = Math.min(
      Math.max(0, Math.ceil(total / PAGE_SIZE) - 1),
      MAX_PAGES - 1,
    );

    const restPages =
      additional > 0
        ? await Promise.all(
            Array.from({ length: additional }, (_, i) =>
              fetch(
                `${API}/discover/smart?kind=club&limit=${PAGE_SIZE}&offset=${(i + 1) * PAGE_SIZE}&sort=newest`,
                { next: { revalidate: 3600 } },
              )
                .then((r) => (r.ok ? (r.json() as Promise<DiscoverPage>) : Promise.resolve({ items: [], total: 0 })))
                .catch(() => ({ items: [], total: 0 })),
            ),
          )
        : [];

    const all = [first, ...restPages].flatMap((p) => p.items);

    // Sort by members desc, nulls last. The featured strip and all-clubs
    // grid both consume this ordering so users see the biggest clubs first.
    all.sort((a, b) => (b.members ?? 0) - (a.members ?? 0));

    const cityFacets = first.facets?.cities ?? [];
    return { clubs: all, cityFacets };
  } catch {
    return { clubs: [], cityFacets: [] };
  }
}

function buildJsonLd(clubs: DiscoverHit[]) {
  if (!clubs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Run Clubs in India',
    description:
      'A verified directory of run clubs across India — morning crews, marathon training groups, trail collectives.',
    url: 'https://www.endorfin.run/clubs',
    numberOfItems: clubs.length,
    // Mirror EVERY club in the structured data — same surface as the
    // SSR'd HTML, so crawlers see the full directory regardless of
    // which cards are visually shown above the Load more button.
    itemListElement: clubs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsClub',
        name: c.title,
        url: c.slug ? `https://www.endorfin.run/clubs/${c.slug}` : undefined,
        description: c.subtitle || c.description || undefined,
        sport: 'Running',
        address: {
          '@type': 'PostalAddress',
          addressLocality: c.city || undefined,
          addressCountry: 'IN',
        },
        ...(c.imageUrl && { logo: c.imageUrl, image: c.imageUrl }),
      },
    })),
  };
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.endorfin.run/' },
    { '@type': 'ListItem', position: 2, name: 'Run Clubs', item: 'https://www.endorfin.run/clubs' },
  ],
};

export default async function ClubsPage() {
  const token = await getSessionToken();
  const [{ clubs, cityFacets }, myClubs, userEmail] = await Promise.all([
    getAllClubs(),
    token
      ? clubsApi.listMyClubs(token, 'all', { includePending: true }).catch(() => [])
      : Promise.resolve([]),
    getSessionEmail(),
  ]);
  const membershipBySlug: Record<string, MyClubMembership> = {};
  const claimBySlug: Record<string, MyClubClaim> = {};
  for (const c of myClubs) {
    if (c.membership) membershipBySlug[c.slug] = c.membership;
    if (c.claim) claimBySlug[c.slug] = c.claim;
  }
  const isAuthed = !!token;
  const jsonLd = buildJsonLd(clubs);

  return (
    <main id="main-content" className="overflow-x-hidden">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <div className="v1-clubs-page">
        <ClubsView
          clubs={clubs}
          cityFacets={cityFacets}
          membershipBySlug={membershipBySlug}
          claimBySlug={claimBySlug}
          isAuthed={isAuthed}
          userEmail={userEmail}
        />
      </div>
      <Footer />
    </main>
  );
}
