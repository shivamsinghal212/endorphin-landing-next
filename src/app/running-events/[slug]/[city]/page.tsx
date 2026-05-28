import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API_BASE } from '@/lib/api';
import type { ApiEvent } from '@/app/running-events/page';
import RaceCardsList from './RaceCardsList';
import {
  RACE_CITY_PAGES,
  RACE_SCOPES,
  RACE_SCOPE_META,
  filterRacesForCityScope,
  getRaceCityPage,
  getRaceScopeMeta,
  passesQualityGate,
  type RaceScope,
} from '@/lib/race-city-pages';

const SITE = 'https://www.endorfin.run';

export const revalidate = 600;

// `slug` here is the race-scope segment (e.g. "marathon-in", "in", "10k-in").
// The route folder is named [slug] to share the dynamic name with the
// /running-events/[slug] race-detail route — Next requires dynamic segment names
// to match at the same path depth, even when the deeper segment differs.
interface RouteParams {
  params: Promise<{ slug: string; city: string }>;
}

// Reuses /running-events getRaces logic but kept local — anon (no token) so we can ISR.
async function getRaces(): Promise<ApiEvent[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20;
  try {
    const collected: ApiEvent[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate: 600 } },
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: ApiEvent[] = data.items || [];
      collected.push(...items);
      totalPages = Math.max(1, Number(data.pages) || 1);
      if (items.length < PAGE_SIZE) break;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);

    const cutoff = Date.now() - 86_400_000;
    return collected
      .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const races = await getRaces();
  const params: { slug: string; city: string }[] = [];
  for (const page of RACE_CITY_PAGES) {
    for (const scope of RACE_SCOPES) {
      const count = filterRacesForCityScope(races, page, scope).length;
      if (passesQualityGate(count, scope)) {
        params.push({ slug: scope, city: page.slug });
      }
    }
  }
  return params;
}

function buildTitle(scope: RaceScope, cityName: string) {
  const meta = RACE_SCOPE_META[scope];
  return `${meta.noun} in ${cityName} — every event, listed`;
}

function buildDescription(scope: RaceScope, cityName: string) {
  const meta = RACE_SCOPE_META[scope];
  return `Find every upcoming ${meta.keyword} in ${cityName}. Dates, distances, entry fees, and one-tap RSVP. Endorfin lists ${meta.noun.toLowerCase()} in ${cityName} for runners across India.`;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug, city } = await params;
  const cityPage = getRaceCityPage(city);
  const scopeRes = getRaceScopeMeta(slug);
  if (!cityPage || !scopeRes) return { title: 'Not found' };

  const url = `${SITE}/running-events/${slug}/${city}`;
  const title = buildTitle(scopeRes.scope, cityPage.name);
  const socialTitle = `${title} | Endorfin`;
  const description = buildDescription(scopeRes.scope, cityPage.name);

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
    twitter: { card: 'summary_large_image', title: socialTitle, description },
  };
}

// Race-card rendering lives in ./RaceCardsList (client component) so it
// can host the auth-gated Register CTA + shared login modal, matching the
// /running-events listing UX exactly.

function buildJsonLd(
  cityPage: ReturnType<typeof getRaceCityPage>,
  scope: RaceScope,
  races: ApiEvent[],
) {
  if (!cityPage) return null;
  const url = `${SITE}/running-events/${scope}/${cityPage.slug}`;
  const meta = RACE_SCOPE_META[scope];

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${meta.noun} in ${cityPage.name}`,
    description: buildDescription(scope, cityPage.name),
    url,
    numberOfItems: races.length,
    itemListElement: races.slice(0, 30).map((r, i) => {
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
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: r.locationName || cityPage.name,
            address: {
              '@type': 'PostalAddress',
              addressLocality: cityPage.name,
              addressRegion: cityPage.region,
              addressCountry: 'IN',
            },
          },
          description:
            r.description ||
            `${r.title} — a running event in ${cityPage.name}. Register on Endorfin.`,
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
              url: `${SITE}/running-events/${r.slug || r.id}`,
              validFrom,
              ...(r.registrationEndDate && { validThrough: r.registrationEndDate }),
            },
          }),
          ...(r.imageUrl && { image: r.imageUrl }),
          url: `${SITE}/running-events/${r.slug || r.id}`,
        },
      };
    }),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Running Events', item: `${SITE}/running-events` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${meta.noun} in ${cityPage.name}`,
        item: url,
      },
    ],
  };

  return [itemList, breadcrumb];
}

export default async function RaceCityScopePage({ params }: RouteParams) {
  const { slug, city } = await params;
  const cityPage = getRaceCityPage(city);
  const scopeRes = getRaceScopeMeta(slug);
  if (!cityPage || !scopeRes) notFound();

  const allRaces = await getRaces();
  const races = filterRacesForCityScope(allRaces, cityPage, scopeRes.scope);
  if (!passesQualityGate(races.length, scopeRes.scope)) notFound();

  const meta = scopeRes.meta;
  const jsonLd = buildJsonLd(cityPage, scopeRes.scope, races);

  // Cross-link suggestions: other scopes in the SAME city, plus the same
  // scope in OTHER cities — only ones that pass the gate.
  const otherScopesInCity = RACE_SCOPES.filter((s) => s !== scopeRes.scope).filter(
    (s) => passesQualityGate(filterRacesForCityScope(allRaces, cityPage, s).length, s),
  );
  const sameScopeOtherCities = RACE_CITY_PAGES.filter((p) => p.slug !== cityPage.slug).filter(
    (p) =>
      passesQualityGate(filterRacesForCityScope(allRaces, p, scopeRes.scope).length, scopeRes.scope),
  );

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
        {/* Hero — matches /running-events styling exactly (v1r-* classes) */}
        <section className="v1r-hero">
          <div className="v1r-hero-bg" aria-hidden />
          <div className="v1r-container">
            <nav className="v1r-hero-crumb" aria-label="Breadcrumb">
              <span className="v1r-hero-crumb-trail">
                <Link href="/running-events">All events</Link>
                <span className="v1r-sep" aria-hidden>·</span>
                <span className="v1r-current">
                  {meta.noun} in {cityPage.name}
                </span>
              </span>
            </nav>
            <h1 className="v1r-hero-title">
              {meta.noun} in<br />
              <span className="v1r-red">{cityPage.name}.</span>
            </h1>
            <div className="v1r-hero-foot">
              <p className="v1r-hero-sub">{cityPage.intro}</p>
              <div className="v1r-hero-stats">
                <div>
                  <div className="v1r-hero-stat-n">{races.length}</div>
                  <div className="v1r-hero-stat-l">Upcoming</div>
                </div>
                <div>
                  <div className="v1r-hero-stat-n">{cityPage.region}</div>
                  <div className="v1r-hero-stat-l">Region</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cross-link chips: kept tight — small label + wrap chips,
            no big section headings. */}
        {(otherScopesInCity.length > 0 || sameScopeOtherCities.length > 0) && (
          <section
            className="v1r-filter-strip"
            aria-label="Browse running events in other distances and cities"
          >
            <div className="v1r-container">
              {otherScopesInCity.length > 0 && (
                <div className="v1r-filter-row v1r-seo-links">
                  <span className="v1r-filter-label">Other distances</span>
                  <div className="v1r-filter-chips">
                    {otherScopesInCity.map((s) => (
                      <Link
                        key={s}
                        href={`/running-events/${s}/${cityPage.slug}`}
                        className="v1r-chip"
                      >
                        {RACE_SCOPE_META[s].noun} in {cityPage.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {sameScopeOtherCities.length > 0 && (
                <div className="v1r-filter-row v1r-seo-links">
                  <span className="v1r-filter-label">Other cities</span>
                  <div className="v1r-filter-chips">
                    {sameScopeOtherCities.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/running-events/${scopeRes.scope}/${p.slug}`}
                        className="v1r-chip"
                      >
                        {meta.noun} in {p.name}
                      </Link>
                    ))}
                    <Link href="/running-events" className="v1r-chip">
                      All events across India
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Race listing — uses the real /running-events race-card design */}
        <section
          className="v1r-races-section"
          aria-label={`${meta.noun} in ${cityPage.name}`}
        >
          <div className="v1r-container">
            <div className="v1r-section-header">
              <h2 className="v1r-section-title">
                Upcoming {meta.noun.toLowerCase()} in <b>{cityPage.name}.</b>
              </h2>
              <span className="v1r-section-count">
                {races.length === 1 ? '1 event' : `${races.length} events`}
              </span>
            </div>

            <RaceCardsList races={races} />
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
