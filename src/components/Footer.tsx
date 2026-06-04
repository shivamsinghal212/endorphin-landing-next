import Link from 'next/link';
import { Suspense } from 'react';
import Logo from './Logo';
import { PLAY_STORE_URL, APP_STORE_URL } from '@/lib/store-links';
import type { ApiEvent } from '@/app/running-events/page';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
} from '@/lib/club-city-pages';
import {
  RACE_CITY_PAGES,
  RACE_SCOPE_META,
  filterRacesForCityScope,
  passesQualityGate,
  type RaceScope,
} from '@/lib/race-city-pages';
import { fetchAllClubsList } from '@/lib/clubs-list';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const SITE = 'https://www.endorfin.run';

const PRODUCT = [
  { label: 'Running Events', href: '/running-events' },
  { label: 'Runners', href: '/runners' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Workout Plan', href: '/workout-plan' },
  { label: 'Coaches', href: '/coaches' },
];

const COMPANY = [
  { label: 'Support', href: '/support' },
  { label: 'Contact', href: 'mailto:hello@endorfin.run' },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

const INSTAGRAM_URL = 'https://www.instagram.com/hacknflex/';

type ListedClub = { slug: string; name: string; city: string };

// Paginated via fetchAllClubsList: the list endpoint caps at 50/page, so a
// single fetch would hide clubs past the first 50 and undercount the SEO
// city links below (the bug that 404'd /run-clubs/gurgaon).
function fetchClubs(): Promise<ListedClub[]> {
  return fetchAllClubsList<ListedClub>();
}

async function fetchRaces(): Promise<ApiEvent[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 20;
  const collected: ApiEvent[] = [];
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `${API_BASE}/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: ApiEvent[] = data.items || [];
      collected.push(...items);
      totalPages = Math.max(1, Number(data.pages) || 1);
      if (items.length < PAGE_SIZE) break;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);
  } catch {
    return [];
  }
  const cutoff = Date.now() - 86_400_000;
  return collected.filter(
    (e) => e.startTime && new Date(e.startTime).getTime() >= cutoff,
  );
}

/**
 * SEO cross-link block — internal links to /run-clubs/[city] and
 * /running-events/[scope]/[city] pages that pass quality gates. Streamed in via
 * Suspense so an API hiccup never blocks the rest of the footer.
 */
async function SeoFooterLinks() {
  const [clubs, races] = await Promise.all([fetchClubs(), fetchRaces()]);

  const clubCities = CLUB_CITY_PAGES
    .map((p) => ({ page: p, count: clubsForCityPage(clubs, p).length }))
    .filter((x) => x.count >= MIN_CLUBS_PER_CITY)
    .sort((a, b) => b.count - a.count);

  function citiesForScope(scope: RaceScope) {
    return RACE_CITY_PAGES.map((p) => ({
      page: p,
      count: filterRacesForCityScope(races, p, scope).length,
    }))
      .filter((x) => passesQualityGate(x.count, scope))
      .sort((a, b) => b.count - a.count);
  }

  const racesAllCities = citiesForScope('in');
  const marathonCities = citiesForScope('marathon-in');
  const halfMarathonCities = citiesForScope('half-marathon-in');

  if (
    clubCities.length === 0 &&
    racesAllCities.length === 0 &&
    marathonCities.length === 0 &&
    halfMarathonCities.length === 0
  ) {
    return null;
  }

  const columns: { title: string; links: { href: string; label: string }[] }[] = [];

  if (racesAllCities.length > 0) {
    columns.push({
      title: 'Running events by city',
      links: racesAllCities.map(({ page }) => ({
        href: `/running-events/in/${page.slug}`,
        label: `Running events in ${page.name}`,
      })),
    });
  }
  if (marathonCities.length > 0) {
    columns.push({
      title: 'Marathons by city',
      links: marathonCities.map(({ page }) => ({
        href: `/running-events/marathon-in/${page.slug}`,
        label: `${RACE_SCOPE_META['marathon-in'].noun} in ${page.name}`,
      })),
    });
  }
  if (halfMarathonCities.length > 0) {
    columns.push({
      title: 'Half marathons by city',
      links: halfMarathonCities.map(({ page }) => ({
        href: `/running-events/half-marathon-in/${page.slug}`,
        label: `${RACE_SCOPE_META['half-marathon-in'].noun} in ${page.name}`,
      })),
    });
  }
  if (clubCities.length > 0) {
    columns.push({
      title: 'Run clubs by city',
      links: clubCities.map(({ page }) => ({
        href: `/run-clubs/${page.slug}`,
        label: `Run clubs in ${page.name}`,
      })),
    });
  }

  return (
    <div className="v1-footer-seo">
      <div className="v1-footer-seo-grid">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="v1-footer-col-title">{col.title}</div>
            <ul className="v1-footer-links">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const Footer = () => (
  <footer className="v1-footer">
    <div className="v1-footer-top">
      <div>
        <Logo variant="light" />
        <p className="v1-footer-brand-sub">
          India&apos;s running community — running events, runners, clubs, and Kip, your AI run coach. Built for people who actually run.
        </p>
      </div>
      <div>
        <div className="v1-footer-col-title">Explore</div>
        <ul className="v1-footer-links">
          {PRODUCT.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="v1-footer-col-title">Company</div>
        <ul className="v1-footer-links">
          {COMPANY.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="v1-footer-col-title">Legal</div>
        <ul className="v1-footer-links">
          {LEGAL.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
          <li>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Google Play</a>
          </li>
          <li>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">App Store</a>
          </li>
        </ul>
      </div>
    </div>

    <Suspense fallback={null}>
      <SeoFooterLinks />
    </Suspense>

    <div className="v1-footer-bottom">
      <span>&copy; {new Date().getFullYear()} Endorfin · Made in India</span>
      <span className="v1-footer-bottom-right">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Endorfin on Instagram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <span>@hacknflex</span>
        </a>
        <span aria-hidden="true">·</span>
        <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>
      </span>
    </div>
  </footer>
);

export default Footer;
