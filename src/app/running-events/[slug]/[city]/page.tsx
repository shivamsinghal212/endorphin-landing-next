import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API_BASE } from '@/lib/api';
import type { ApiEvent } from '@/app/running-events/page';
import RaceCard from '@/components/RaceCard';
import { eventAttendance, safeEndDate } from '@/lib/event-schema';
import { toRaceCardData } from '@/lib/race-card-data';
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
    numberOfItems: Math.min(races.length, 30),
    itemListElement: races.slice(0, 30).map((r, i) => {
      const validFromAnchor = r.registrationEndDate || r.startTime;
      const validFrom = new Date(
        new Date(validFromAnchor).getTime() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const eventUrl = `${SITE}/running-events/${r.slug || r.id}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: r.title,
          startDate: r.startTime,
          endDate: safeEndDate(r.startTime, r.endTime),
          eventStatus: 'https://schema.org/EventScheduled',
          // Was a hardcoded Offline literal with no conditional — harmless
          // only because the API list feed happens to exclude virtual events
          // today. One virtual event reaching a lander would have been
          // mislabelled, so route it through the shared helper like the
          // other two builders.
          ...eventAttendance(
            r,
            {
              name: r.locationName || cityPage.name,
              address: {
                addressLocality: cityPage.name,
                addressRegion: cityPage.region,
                addressCountry: 'IN',
              },
            },
            eventUrl,
          ),
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
              url: eventUrl,
              validFrom,
              ...(r.registrationEndDate && { validThrough: r.registrationEndDate }),
            },
          }),
          ...(r.imageUrl && { image: r.imageUrl }),
          url: eventUrl,
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
    <main id="main-content" style={{ overflowX: 'clip' }}>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <Header />
      {/* .v1-clubs-page, not .v1-races-page: these landers now share the hub's
          card and rail styling outright, rather than a parallel set that kept
          drifting out of sync with it. Every SEO-bearing element is unchanged
          — H1 string, city intro, section H2 + count, the full race list, and
          both cross-link blocks. */}
      <div className="v1-clubs-page">
        <section className="v1-hero v1c-hero-natl">
          <div className="container">
            <div className="v1-hero-topline is-compact">
              <span className="v1-hero-kicker">
                {meta.noun} · {cityPage.name}
              </span>
              <span className="v1-hero-meta">
                {races.length} upcoming · {cityPage.region}
              </span>
            </div>

            <nav className="v1c-lander-crumb" aria-label="Breadcrumb">
              <Link href="/running-events">All running events</Link>
              <span aria-hidden> · </span>
              <span aria-current="page">
                {meta.noun} in {cityPage.name}
              </span>
            </nav>

            <h1 className="v1c-search-h1">
              <span className="accent">
                {meta.noun} in {cityPage.name}
              </span>
            </h1>
          </div>
        </section>

        <div className="v1c-natl">
          <section className="v1c-exp">
            <div className="v1c-container">
              {/* Cross-links. These are the internal-linking spine of the
                  city × distance cluster — every one points at a page that
                  passed the quality gate. */}
              {(otherScopesInCity.length > 0 || sameScopeOtherCities.length > 0) && (
                <nav
                  className="v1c-lander-links"
                  aria-label="Browse running events in other distances and cities"
                >
                  {otherScopesInCity.length > 0 && (
                    <div className="v1c-lander-linkrow">
                      <span className="v1c-lander-linklabel">Other distances</span>
                      <div className="v1c-exp-citychips">
                        {otherScopesInCity.map((sc) => (
                          <Link
                            key={sc}
                            href={`/running-events/${sc}/${cityPage.slug}`}
                            className="v1c-exp-citychip"
                          >
                            {RACE_SCOPE_META[sc].noun} in {cityPage.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {sameScopeOtherCities.length > 0 && (
                    <div className="v1c-lander-linkrow">
                      <span className="v1c-lander-linklabel">Other cities</span>
                      <div className="v1c-exp-citychips">
                        {sameScopeOtherCities.map((cp) => (
                          <Link
                            key={cp.slug}
                            href={`/running-events/${scopeRes.scope}/${cp.slug}`}
                            className="v1c-exp-citychip"
                          >
                            {meta.noun} in {cp.name}
                          </Link>
                        ))}
                        <Link href="/running-events" className="v1c-exp-citychip">
                          All events across India
                        </Link>
                      </div>
                    </div>
                  )}
                </nav>
              )}

              <section className="v1c-exp-rail">
                <div className="v1c-exp-rail-head">
                  <h2 className="v1c-exp-rail-title">
                    Upcoming {meta.noun.toLowerCase()} in {cityPage.name}
                  </h2>
                  <span className="v1c-exp-seeall" aria-hidden>
                    {races.length === 1 ? '1 event' : `${races.length} events`}
                  </span>
                </div>
                {/* Grid, not the hub's scroller: on a lander this list IS the
                    page, so it gets the full-width treatment. */}
                {/* toRaceCardData: RaceCard is a client component, so the
                    raw ApiEvent would serialise ~30 full events (including
                    descriptions and scraped Instagram comment threads) into
                    this lander's flight payload. */}
                <div className="v1c-exp-grid">
                  {races.map((r) => (
                    <RaceCard key={r.id} r={toRaceCardData(r)} />
                  ))}
                </div>
              </section>

              {/* The city intro, moved out of the hero where it dominated the
                  fold. It stays on the page on purpose: it is the only
                  hand-written, city-specific copy here, and without it a
                  lander is an H1 over a generated list — the doorway-page
                  shape. Below the races it reads as context rather than
                  preamble. */}
              <section className="v1c-lander-about">
                <h2 className="v1c-lander-about-h">
                  Running in {cityPage.name}
                </h2>
                <p>{cityPage.intro}</p>
              </section>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
