import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClubsView from '@/app/clubs/ClubsView';
import type { ApiClub } from '@/app/clubs/page';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import { clubsApi, type MyClubClaim, type MyClubMembership } from '@/lib/api';
import { getSessionEmail, getSessionToken } from '@/lib/session';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
  getClubCityPage,
} from '@/lib/club-city-pages';
import { fetchAllClubsList } from '@/lib/clubs-list';
import { fetchFeaturedFull } from '@/lib/clubs-featured';

const SITE = 'https://www.endorfin.run';

export const revalidate = 3600;
// dynamicParams left at default (true): unknown slugs render on-demand and
// the page's own notFound() check (slug must be in CLUB_CITY_PAGES and have
// >= MIN_CLUBS_PER_CITY) is the authoritative gate. Keeps dev rendering
// working even when generateStaticParams ran with a transient API miss.

// The list endpoint carries every field the grid cards + JSON-LD need
// (city, logo, tags, establishedYear, stats.members), so we map it straight
// into the DiscoverHit shape ClubsView's grid consumes — no per-club N+1.
// nextEvent is left null here; the featured-5 strip gets the rich
// detail+events via fetchFeaturedFull below.
function toDiscoverHit(c: ApiClub): DiscoverHit {
  return {
    kind: 'club',
    id: c.slug,
    slug: c.slug,
    title: c.name,
    subtitle: c.subtitle ?? null,
    description: c.description ?? null,
    imageUrl: c.logoUrl ?? c.headerImageUrl ?? null,
    city: c.city ?? null,
    locationName: null,
    startTime: null,
    endTime: null,
    distanceKm: null,
    eventType: null,
    clubId: null,
    clubSlug: null,
    clubName: null,
    members: c.stats?.members ?? null,
    tags: c.tags ?? [],
    isVerified: c.isVerified ?? false,
    establishedYear: c.establishedYear ?? null,
    nextEvent: null,
    score: 0,
    matchingEvents: [],
  };
}

export async function generateStaticParams() {
  const clubs = await fetchAllClubsList<ApiClub>();
  return CLUB_CITY_PAGES
    .filter((p) => clubsForCityPage(clubs, p).length >= MIN_CLUBS_PER_CITY)
    .map((p) => ({ city: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ city: string }> },
): Promise<Metadata> {
  const { city } = await params;
  const page = getClubCityPage(city);
  if (!page) return { title: 'Not found' };

  const title = `Run clubs in ${page.name} — India's most happening clubs`;
  const socialTitle = `${title} | Endorfin`;
  const description =
    `Find a run club in ${page.name}. A verified directory of run clubs, ` +
    `marathon training groups, and weekend trail collectives across ${page.name}. ` +
    `RSVP to the next club run with Endorfin.`;
  const url = `${SITE}/run-clubs/${page.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: socialTitle,
      description,
      siteName: 'Endorfin',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
    },
  };
}

function buildJsonLd(
  page: ReturnType<typeof getClubCityPage>,
  clubs: ApiClub[],
) {
  if (!page) return null;
  const url = `${SITE}/run-clubs/${page.slug}`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Run Clubs in ${page.name}`,
    description:
      `A verified directory of run clubs in ${page.name} — marathon ` +
      `training groups and weekend trail collectives.`,
    url,
    numberOfItems: clubs.length,
    itemListElement: clubs.slice(0, 30).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsClub',
        name: c.name,
        url: `${SITE}/clubs/${c.slug}`,
        description: c.subtitle || c.description || undefined,
        sport: 'Running',
        address: {
          '@type': 'PostalAddress',
          addressLocality: c.city || page.name,
          addressRegion: page.region,
          addressCountry: 'IN',
        },
        ...(c.establishedYear && { foundingDate: String(c.establishedYear) }),
        ...(c.logoUrl && { logo: c.logoUrl, image: c.logoUrl }),
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Clubs', item: `${SITE}/clubs` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Run clubs in ${page.name}`,
        item: url,
      },
    ],
  };

  return [itemList, breadcrumb];
}

export default async function RunClubsCityPage(
  { params }: { params: Promise<{ city: string }> },
) {
  const { city } = await params;
  const page = getClubCityPage(city);
  if (!page) notFound();

  const token = await getSessionToken();
  const [allClubs, myClubs, userEmail] = await Promise.all([
    fetchAllClubsList<ApiClub>(),
    token
      ? clubsApi.listMyClubs(token, 'all', { includePending: true }).catch(() => [])
      : Promise.resolve([]),
    getSessionEmail(),
  ]);

  // City-scoped, biggest clubs first (mirrors /clubs' members-desc order so
  // the featured strip and grid show the most prominent clubs first).
  const cityClubs = clubsForCityPage(allClubs, page)
    .filter((c) => !!c.slug)
    .sort((a, b) => (b.stats?.members ?? 0) - (a.stats?.members ?? 0));
  if (cityClubs.length < MIN_CLUBS_PER_CITY) notFound();

  const clubs = cityClubs.map(toDiscoverHit);
  const featuredSlugs = cityClubs.slice(0, 5).map((c) => c.slug);
  const featuredFull = await fetchFeaturedFull(featuredSlugs);

  const membershipBySlug: Record<string, MyClubMembership> = {};
  const claimBySlug: Record<string, MyClubClaim> = {};
  for (const c of myClubs) {
    if (c.membership) membershipBySlug[c.slug] = c.membership;
    if (c.claim) claimBySlug[c.slug] = c.claim;
  }

  // Single-city facet so the hero/chips know they're scoped to one city.
  const cityFacets = [{ value: page.name, count: cityClubs.length }];
  const jsonLd = buildJsonLd(page, cityClubs);

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
        <ClubsView
          clubs={clubs}
          featuredFull={featuredFull}
          cityFacets={cityFacets}
          membershipBySlug={membershipBySlug}
          claimBySlug={claimBySlug}
          isAuthed={!!token}
          userEmail={userEmail}
          cityName={page.name}
        />
      </div>
      <Footer />
    </main>
  );
}
