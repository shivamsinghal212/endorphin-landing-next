import {
  RACE_CITY_PAGES,
  RACE_SCOPES,
  RACE_SCOPE_META,
  filterRacesForCityScope,
  passesQualityGate,
} from '@/lib/race-city-pages';
import {
  CLUB_CITY_PAGES,
  MIN_CLUBS_PER_CITY,
  clubsForCityPage,
} from '@/lib/club-city-pages';
import { fetchAllClubsList } from '@/lib/clubs-list';
import { fetchAllRaces } from '@/lib/races-list';

/**
 * /llms.txt — the map handed to AI crawlers.
 *
 * This was a hand-maintained file in public/. It rotted: by the time it was
 * audited, 20 of its 36 URLs were 308 redirects on the retired /races/*
 * prefix and 4 were hard 404s for cities that no longer pass the quality
 * gate. A file whose entire job is to hand crawlers a clean map was handing
 * them a redirect on every event link.
 *
 * So it is generated now, from the same sources and the same gate as
 * sitemap.ts. It cannot drift from what the site actually serves: a lander
 * appears here only if it would render, and the prefix comes from the same
 * constants the routes do.
 */

const SITE = 'https://www.endorfin.run';

export const revalidate = 3600;

type ListedClub = { slug: string; name: string; city: string; publishedAt?: string | null };

export async function GET() {
  const [races, allClubs] = await Promise.all([
    fetchAllRaces(3600),
    fetchAllClubsList<ListedClub>(3600),
  ]);
  const clubs = allClubs.filter((c) => c.publishedAt);

  const lines: string[] = [];
  const push = (s = '') => lines.push(s);

  push('# Endorfin — Running Events and Run Clubs in India');
  push();
  push(
    `> Endorfin is a free Android app and web directory for discovering running events and run clubs across India. It lists ${races.length}+ upcoming marathons, half marathons, 10K runs and 5K races, plus a verified directory of ${clubs.length}+ run clubs in every major Indian city. Users can RSVP to club runs, create community runs, follow other runners, and discuss race logistics in per-event chat threads. Available free on Google Play.`,
  );
  push();
  push('## Pages');
  push();
  push(`- [Homepage](${SITE}/) — Event discovery, app features, community overview`);
  push(
    `- [Running Events](${SITE}/running-events) — Every running event and run club in India, filterable by city`,
  );
  push(`- [Run Clubs](${SITE}/clubs) — Verified directory of run clubs across India`);
  push(`- [Privacy Policy](${SITE}/privacy) — Data handling and DPDPA 2023 compliance`);
  push(`- [Terms of Service](${SITE}/terms) — Usage terms for the Endorfin platform`);
  push(`- [Support](${SITE}/support) — Help and frequently asked questions`);

  // Race landers, grouped by scope. Only pages that pass the same quality
  // gate the route enforces, so nothing here can 404.
  for (const scope of RACE_SCOPES) {
    const meta = RACE_SCOPE_META[scope];
    const rows = RACE_CITY_PAGES.filter((page) =>
      passesQualityGate(filterRacesForCityScope(races, page, scope).length, scope),
    );
    if (rows.length === 0) continue;
    push();
    push(`## ${meta.noun} by City`);
    push();
    for (const page of rows) {
      const count = filterRacesForCityScope(races, page, scope).length;
      push(
        `- [${meta.noun} in ${page.name}](${SITE}/running-events/${scope}/${page.slug}) — ${count} upcoming`,
      );
    }
  }

  // Club city landers, same treatment.
  const clubRows = CLUB_CITY_PAGES.map((page) => ({
    page,
    matched: clubsForCityPage(clubs, page),
  })).filter(({ matched }) => matched.length >= MIN_CLUBS_PER_CITY);

  if (clubRows.length > 0) {
    push();
    push('## Run Clubs by City');
    push();
    for (const { page, matched } of clubRows) {
      push(
        `- [Run clubs in ${page.name}](${SITE}/run-clubs/${page.slug}) — ${matched.length} clubs`,
      );
    }
  }

  push();
  push('## Key Facts');
  push();
  push(`- ${races.length} upcoming running events listed across India`);
  push(`- ${clubs.length} verified run clubs in the directory`);
  push('- Verified run-club directory: morning crews, marathon training squads, trail collectives');
  push('- Free to use, available on Google Play');
  push(
    '- Features: event discovery, one-tap RSVP, community runs, club RSVPs, event discussions, runner profiles',
  );
  push('- Contact: hello@endorfin.run');
  push();

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
