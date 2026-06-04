import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { ApiClub, ClubEvent } from '@/app/clubs/page';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
  getClubCityPage,
} from '@/lib/club-city-pages';

const SITE = 'https://www.endorfin.run';
const API_BASE = 'https://api.endorfin.run';

export const revalidate = 3600;
// dynamicParams left at default (true): unknown slugs render on-demand and
// the page's own notFound() check (slug must be in CLUB_CITY_PAGES and have
// >= MIN_CLUBS_PER_CITY) is the authoritative gate. Keeps dev rendering
// working even when generateStaticParams ran with a transient API miss.

interface ListedClub {
  slug: string;
  name: string;
  city: string;
  updatedAt?: string | null;
}

async function getClubs(): Promise<ApiClub[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/clubs`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const listed = (await res.json()) as ListedClub[];
    if (!Array.isArray(listed) || listed.length === 0) return [];

    const settled = await Promise.all(
      listed.map(async (c): Promise<ApiClub | null> => {
        try {
          const [detailRes, eventsRes] = await Promise.all([
            fetch(`${API_BASE}/api/v1/clubs/${c.slug}`, {
              next: { revalidate: 3600 },
            }),
            fetch(`${API_BASE}/api/v1/clubs/${c.slug}/events`, {
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
      }),
    );
    return settled.filter((c): c is ApiClub => !!c && !!c.slug);
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const clubs = await getClubs();
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

function initials(name: string) {
  const w = (name || '').trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

function ClubCard({ c }: { c: ApiClub }) {
  const headerImg = c.headerImageUrl || c.logoUrl || null;
  const headerIsLogoFallback = !c.headerImageUrl && !!c.logoUrl;
  const members = c.stats?.members ?? 0;

  return (
    <Link href={`/clubs/${c.slug}`} className="v1c-club-card">
      <div className="v1c-club-card-header">
        <div className="v1c-club-card-header-fallback">{initials(c.name)}</div>
        {headerImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headerImg}
            alt={c.name}
            loading="lazy"
            className={headerIsLogoFallback ? 'is-logo-fallback' : ''}
          />
        )}
      </div>
      <div className="v1c-club-card-body">
        <div className="v1c-club-card-logo">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt={`${c.name} logo`} />
          ) : (
            initials(c.name)
          )}
        </div>
        <div className="v1c-club-card-top">
          <h3 className="v1c-club-card-title">{c.name}</h3>
        </div>
        <div className="v1c-club-card-city">
          {c.city}
          {c.establishedYear ? ` · Est ${c.establishedYear}` : ''}
        </div>
        {c.tags && c.tags.length > 0 && (
          <div className="v1c-club-card-tags">
            {c.tags.slice(0, 3).map((t) => (
              <span key={t} className="v1c-club-card-tag">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="v1c-club-card-foot">
          <span className="v1c-club-card-stat">
            <strong>{members.toLocaleString('en-IN')}</strong> members
          </span>
        </div>
      </div>
    </Link>
  );
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

  const allClubs = await getClubs();
  const cityClubs = clubsForCityPage(allClubs, page);
  if (cityClubs.length < MIN_CLUBS_PER_CITY) notFound();

  const otherCities = CLUB_CITY_PAGES.filter((p) => {
    if (p.slug === page.slug) return false;
    return clubsForCityPage(allClubs, p).length >= MIN_CLUBS_PER_CITY;
  });

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
        {/* Hero */}
        <section className="v1c-hero">
          <div className="v1c-hero-bg" aria-hidden />
          <div className="v1c-container">
            <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: 14, opacity: 0.75 }}>
              <Link href="/clubs">All clubs</Link>
              <span aria-hidden> · </span>
              <span>{page.name}</span>
            </nav>
            <h1 className="v1c-hero-title">
              Run clubs in<br /><span className="v1c-red">{page.name}.</span>
            </h1>
            <div className="v1c-hero-foot">
              <p className="v1c-hero-sub">{page.intro}</p>
              <div className="v1c-hero-stats">
                <div>
                  <div className="v1c-hero-stat-n">{cityClubs.length}</div>
                  <div className="v1c-hero-stat-l">Clubs</div>
                </div>
                <div>
                  <div className="v1c-hero-stat-n">{page.region}</div>
                  <div className="v1c-hero-stat-l">Region</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Listing */}
        <section className="v1c-featured" aria-label={`Run clubs in ${page.name}`}>
          <div className="v1c-container">
            <div className="v1c-section-header">
              <h2 className="v1c-section-title">
                Every run club in <b>{page.name}</b>
              </h2>
              <span className="v1c-section-count">
                {cityClubs.length === 1 ? '1 club' : `${cityClubs.length} clubs`}
              </span>
            </div>

            <div
              className="v1c-grid"
              style={{
                display: 'grid',
                gap: 18,
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                marginTop: 24,
              }}
            >
              {cityClubs.map((c) => (
                <ClubCard key={c.slug} c={c} />
              ))}
            </div>
          </div>
        </section>

        {/* Other cities */}
        {otherCities.length > 0 && (
          <section className="v1c-featured" aria-label="Browse run clubs in other cities">
            <div className="v1c-container">
              <div className="v1c-section-header">
                <h2 className="v1c-section-title">
                  Run clubs in <b>other cities</b>
                </h2>
              </div>
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  listStyle: 'none',
                  padding: 0,
                  marginTop: 16,
                }}
              >
                {otherCities.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/run-clubs/${p.slug}`}
                      className="v1c-chip"
                      style={{ textDecoration: 'none' }}
                    >
                      Run clubs in {p.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/clubs" className="v1c-chip" style={{ textDecoration: 'none' }}>
                    All clubs across India
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
