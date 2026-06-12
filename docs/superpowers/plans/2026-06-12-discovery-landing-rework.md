# Discovery-focused Landing Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the public site on three discovery surfaces (Running Events, Run Clubs, Club Experiences), add a crawlable `/experiences` listing page so club events can rank in search, and move club-owner marketing to a dedicated `/for-clubs` page.

**Architecture:** Next.js App Router (note: this repo runs a modified Next — consult `node_modules/next/dist/docs/` before using any unfamiliar API). New pages are server components that fetch from the existing `/api/v1/discover/smart` endpoint and reuse the `DiscoverHit` type. The `/experiences` page is a near-twin of `/clubs` (server `page.tsx` + `'use client'` view), rendering **all** events into the SSR'd DOM (visibility controlled by tabs/pagination, presence never) for SEO. A shared presentational `ExperienceCard` is consumed by both `/experiences` and the home teaser strip. No backend changes.

**Tech Stack:** Next.js (App Router), React, TypeScript, custom CSS in `src/app/globals.css` (the `v1-` / `v1c-` design system; new code uses the `v1x-` namespace).

**Testing note:** This project has **no test framework** and **no lint script** (`package.json` scripts are only `dev`, `build`, `start`). The verification gate for every task is `npm run build` (which type-checks). The crawlability-critical task also verifies SSR output with a dev-server `curl` + `grep`. There is no TDD here because there is no runner — do not add one.

---

## File map

**Create:**
- `src/lib/format-date.ts` — shared IST date formatters for new code.
- `src/lib/discover.ts` — shared fetch helpers for `kind=club_event` (paginated fetch-all + upcoming/past partition).
- `src/components/ExperienceCard.tsx` — shared presentational card for a club event.
- `src/app/experiences/page.tsx` — `/experiences` server component (metadata, JSON-LD, data fetch).
- `src/app/experiences/ExperiencesView.tsx` — `'use client'` view (tabs, city filter, pagination).
- `src/app/for-clubs/page.tsx` — club-owner landing.

**Modify:**
- `src/components/HeaderClient.tsx:10-16` — nav links.
- `src/components/PillarsAccordion.tsx:21-102` — trim to 3 panels + heading.
- `src/app/page.tsx` — home redo (pillars 3, drop ManageClubSection, add teasers + slim owner banner).
- `src/app/globals.css` (append) — CSS for `v1x-` experiences page/card, home teaser strips, for-clubs sections.

**Do not touch:** `src/app/clubs/**`, the club/race/event detail pages, `src/app/run-clubs/**`, `src/app/club-pitch-deck/**`, the discover API.

---

## Task 1: Header navigation rework

**Files:**
- Modify: `src/components/HeaderClient.tsx:10-16`

- [ ] **Step 1: Replace the `NAV_LINKS` array**

Replace the existing block (lines 10-16):

```tsx
const NAV_LINKS = [
  { label: 'Running Events', href: '/running-events', soon: false, primary: true },
  { label: 'Clubs', href: '/clubs', soon: false, primary: true },
  { label: 'Runners', href: '/runners', soon: false, primary: false },
  { label: 'Workout Plan', href: '/workout-plan', soon: true, primary: false },
  { label: 'Coaches', href: '/coaches', soon: true, primary: false },
];
```

with:

```tsx
const NAV_LINKS = [
  { label: 'Running Events', href: '/running-events', soon: false, primary: true },
  { label: 'Run Clubs', href: '/clubs', soon: false, primary: true },
  { label: 'Club Experiences', href: '/experiences', soon: false, primary: true },
  { label: 'For Club Owners', href: '/for-clubs', soon: false, primary: true },
];
```

No other edits needed: the `.map` over `NAV_LINKS`, the `soon`/`primary`/`is-current` class logic, and `isLinkActive` (uses `startsWith`) all already handle these entries generically.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds (no type errors). If `soon` styling references break because no link is `soon` anymore, they won't — the class logic is conditional and simply never adds `has-soon`.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeaderClient.tsx
git commit -m "feat(nav): four discovery-focused header links (events, clubs, experiences, for owners)"
```

---

## Task 2: Shared IST date formatters

**Files:**
- Create: `src/lib/format-date.ts`

These mirror the IST-pinned formatters already proven in `ClubsView` (pinning to `Asia/Kolkata` avoids React #418 hydration mismatches between the UTC server and client zones). New code imports from here instead of duplicating.

- [ ] **Step 1: Create the file**

```ts
// Shared date formatting for discovery surfaces (experiences page + home
// teasers). Pinned to IST so SSR (UTC server) and the client format dates
// identically — without timeZone, locale formatting uses the runtime zone
// and hydration mismatches (React #418) for anyone outside it.
const IST = 'Asia/Kolkata';

function parse(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14 Jun" */
export function fmtDayShort(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
}

/** "Sat, 14 Jun" */
export function fmtDayWithWeekday(iso?: string | null): string {
  const d = parse(iso);
  if (!d) return '';
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: IST,
  });
}

/** "6:00 am" (empty string when the ISO has no meaningful time component) */
export function fmtTimeShort(iso?: string | null): string {
  if (!iso || !iso.includes('T')) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds (file is unused so far, but type-checks).

- [ ] **Step 3: Commit**

```bash
git add src/lib/format-date.ts
git commit -m "feat(lib): shared IST date formatters for discovery surfaces"
```

---

## Task 3: Shared club-event discover helpers

**Files:**
- Create: `src/lib/discover.ts`

Reuses the `DiscoverHit` type re-exported from `HeroSearchPanel` and the pagination shape proven in `src/app/clubs/page.tsx`. `fetchAllClubEvents` fans out all pages in parallel (cached via `revalidate: 3600`, so the home teaser and `/experiences` share the same cached underlying fetches). `partitionByTime` splits into upcoming (ascending) and past (descending).

- [ ] **Step 1: Create the file**

```ts
import type { DiscoverHit } from '@/components/HeroSearchPanel';

const API = 'https://api.endorfin.run/api/v1';
const PAGE_SIZE = 50;
// ~1,076 club events in prod = ~22 pages. 30 gives headroom to ~1,500
// before we'd silently truncate the directory.
const MAX_PAGES = 30;

export interface CityFacet {
  value: string;
  count: number;
}

interface DiscoverPage {
  items: DiscoverHit[];
  total: number;
  facets?: { cities?: CityFacet[] } | null;
}

/**
 * Fetches EVERY club event via /discover/smart?kind=club_event, paginated 50
 * at a time in parallel. Returns the raw list plus the city facet (read from
 * the first page). Sorted newest-first by the API; callers re-sort as needed.
 */
export async function fetchAllClubEvents(): Promise<{
  events: DiscoverHit[];
  cityFacets: CityFacet[];
}> {
  try {
    const firstRes = await fetch(
      `${API}/discover/smart?kind=club_event&limit=${PAGE_SIZE}&offset=0&includeFacets=true&sort=newest`,
      { next: { revalidate: 3600 } },
    );
    if (!firstRes.ok) return { events: [], cityFacets: [] };
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
                `${API}/discover/smart?kind=club_event&limit=${PAGE_SIZE}&offset=${(i + 1) * PAGE_SIZE}&sort=newest`,
                { next: { revalidate: 3600 } },
              )
                .then((r) =>
                  r.ok
                    ? (r.json() as Promise<DiscoverPage>)
                    : Promise.resolve({ items: [], total: 0 } as DiscoverPage),
                )
                .catch(() => ({ items: [], total: 0 } as DiscoverPage)),
            ),
          )
        : [];

    const events = [first, ...restPages].flatMap((p) => p.items);
    const cityFacets = first.facets?.cities ?? [];
    return { events, cityFacets };
  } catch {
    return { events: [], cityFacets: [] };
  }
}

/**
 * Splits events by startTime relative to `nowMs`. Upcoming is ascending
 * (soonest first); past is descending (most recent first). Events with an
 * unparseable startTime are dropped.
 */
export function partitionByTime(
  events: DiscoverHit[],
  nowMs: number,
): { upcoming: DiscoverHit[]; past: DiscoverHit[] } {
  const upcoming: DiscoverHit[] = [];
  const past: DiscoverHit[] = [];
  for (const e of events) {
    const t = e.startTime ? Date.parse(e.startTime) : NaN;
    if (!Number.isFinite(t)) continue;
    (t >= nowMs ? upcoming : past).push(e);
  }
  upcoming.sort((a, b) => Date.parse(a.startTime!) - Date.parse(b.startTime!));
  past.sort((a, b) => Date.parse(b.startTime!) - Date.parse(a.startTime!));
  return { upcoming, past };
}

/** Soonest N upcoming club events — for the home teaser strip. */
export async function fetchUpcomingClubEvents(limit: number): Promise<DiscoverHit[]> {
  const { events } = await fetchAllClubEvents();
  const { upcoming } = partitionByTime(events, Date.now());
  return upcoming.slice(0, limit);
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/discover.ts
git commit -m "feat(lib): club-event discover fetch + upcoming/past partition helpers"
```

---

## Task 4: Shared `ExperienceCard` component

**Files:**
- Create: `src/components/ExperienceCard.tsx`

Pure presentational server-renderable component (no client hooks). Links to the existing detail page `/clubs/{clubSlug}/events/{slug || id}` (the detail route accepts a slug **or** a UUID for `eventSlug`). Returns `null` when `clubSlug` is missing (can't build a valid detail URL). The `hidden` prop keeps a card in the SSR DOM while visually removing it (`.is-hidden`), matching the `/clubs` crawlability pattern.

- [ ] **Step 1: Create the file**

```tsx
import Link from 'next/link';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import { fmtDayShort, fmtTimeShort } from '@/lib/format-date';

// Human label for the club-event `eventType` enum. Unknown/blank → "Run".
function eventTypeLabel(eventType: string | null, distanceKm: number | null): string {
  if (distanceKm != null) return `${distanceKm}K`;
  switch (eventType) {
    case 'club_run':
      return 'Club run';
    case 'club_cross_train':
      return 'Cross-train';
    case 'race_event':
      return 'Race';
    default:
      return 'Run';
  }
}

function initials(name: string) {
  const w = (name || '').trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

export default function ExperienceCard({
  e,
  hidden = false,
  isLcp = false,
}: {
  e: DiscoverHit;
  hidden?: boolean;
  isLcp?: boolean;
}) {
  if (!e.clubSlug) return null;
  const eventIdent = e.slug || e.id;
  const href = `/clubs/${e.clubSlug}/events/${eventIdent}`;
  const day = fmtDayShort(e.startTime);
  const time = fmtTimeShort(e.startTime);
  const badge = eventTypeLabel(e.eventType, e.distanceKm);

  return (
    <article className={`v1x-card ${hidden ? 'is-hidden' : ''}`}>
      <Link href={href} className="v1x-card-link" aria-label={`View ${e.title}`}>
        <div className="v1x-card-media">
          <div className="v1x-card-media-fallback" aria-hidden>
            {initials(e.clubName || e.title)}
          </div>
          {e.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.imageUrl}
              alt={e.title}
              loading={isLcp ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={isLcp ? 'high' : 'low'}
            />
          )}
          {day && (
            <span className="v1x-card-datechip">
              {day}
              {time ? ` · ${time}` : ''}
            </span>
          )}
          <span className="v1x-card-typechip">{badge}</span>
        </div>
        <div className="v1x-card-body">
          <h3 className="v1x-card-title">{e.title}</h3>
          <div className="v1x-card-meta">
            {e.clubName && <span className="v1x-card-club">{e.clubName}</span>}
            {(e.city || e.locationName) && (
              <span className="v1x-card-loc">
                {e.locationName || e.city}
                {e.locationName && e.city ? ` · ${e.city}` : ''}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExperienceCard.tsx
git commit -m "feat(components): shared ExperienceCard for club events"
```

---

## Task 5: CSS for `ExperienceCard`, experiences page, tabs, and home strips

**Files:**
- Modify: `src/app/globals.css` (append at end of file)

All new selectors use the `v1x-` namespace so nothing collides with the existing `v1-` / `v1c-` systems. Colors/radii match the existing token usage in the file (bone `#F4F0EA`, jet `#101010`, signal red `#FF3B2F`).

- [ ] **Step 1: Append the CSS block**

```css
/* ─── Club Experiences (/experiences) + shared ExperienceCard (v1x-) ─── */

.v1x-page { background: #F4F0EA; }

.v1x-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

.v1x-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: rgba(16, 16, 16, 0.06);
  border-radius: 999px;
  margin: 0 auto 28px;
}
.v1x-tab {
  appearance: none;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  color: #101010;
  opacity: 0.55;
  padding: 9px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: opacity 0.15s ease, background 0.15s ease;
}
.v1x-tab.is-active {
  opacity: 1;
  background: #101010;
  color: #F4F0EA;
}
.v1x-tabs-row { display: flex; justify-content: center; }

.v1x-cityfilter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 0 auto 28px;
}
.v1x-citychip {
  appearance: none;
  border: 1px solid rgba(16, 16, 16, 0.16);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #101010;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.v1x-citychip:hover { border-color: rgba(16, 16, 16, 0.4); }
.v1x-citychip.is-active { background: #101010; color: #F4F0EA; border-color: #101010; }

.v1x-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.v1x-panel[hidden] { display: none; }
.v1x-empty {
  text-align: center;
  padding: 48px 24px;
  color: rgba(16, 16, 16, 0.6);
  font-size: 15px;
}

.v1x-card {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.v1x-card.is-hidden { display: none; }
.v1x-card:hover { box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12); transform: translateY(-2px); }
.v1x-card-link { display: block; color: inherit; text-decoration: none; }
.v1x-card-media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #EDE7E0;
  overflow: hidden;
}
.v1x-card-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.v1x-card:hover .v1x-card-media img { transform: scale(1.05); }
.v1x-card-media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 32px;
  color: rgba(16, 16, 16, 0.25);
}
.v1x-card-datechip {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.94);
  color: #101010;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.v1x-card-typechip {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #FF3B2F;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 5px 10px;
  border-radius: 999px;
}
.v1x-card-body { padding: 14px 16px 16px; }
.v1x-card-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  color: #101010;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.v1x-card-meta { display: flex; flex-direction: column; gap: 2px; }
.v1x-card-club { font-size: 13px; font-weight: 600; color: #FF3B2F; }
.v1x-card-loc { font-size: 13px; color: rgba(16, 16, 16, 0.6); }

/* Home discovery teaser strips */
.v1x-strip { padding: 56px 0; }
.v1x-strip:nth-child(odd) { background: #F4F0EA; }
.v1x-strip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.v1x-strip-title { font-size: 28px; font-weight: 800; color: #101010; margin: 0; }
.v1x-strip-title b { color: #FF3B2F; }
.v1x-strip-seeall { font-size: 14px; font-weight: 600; color: #101010; text-decoration: none; white-space: nowrap; }
.v1x-strip-seeall:hover { color: #FF3B2F; }
.v1x-strip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

/* Slim "run a club?" owner banner on the home page */
.v1x-ownerbanner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 32px;
  background: #101010;
  color: #F4F0EA;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.v1x-ownerbanner-copy { font-size: 18px; font-weight: 600; }
.v1x-ownerbanner-copy b { color: #FF3B2F; }
.v1x-ownerbanner-cta {
  background: #FF3B2F;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 22px;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
}

/* For Club Owners (/for-clubs) benefit grid */
.v1x-forclubs-benefits { padding: 64px 0; background: #F4F0EA; }
.v1x-benefit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 32px;
}
.v1x-benefit {
  background: #fff;
  border-radius: 18px;
  padding: 26px 24px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
}
.v1x-benefit-h { font-size: 18px; font-weight: 700; color: #101010; margin: 0 0 8px; }
.v1x-benefit-p { font-size: 14px; line-height: 1.5; color: rgba(16, 16, 16, 0.66); margin: 0; }

@media (max-width: 640px) {
  .v1x-strip-title { font-size: 22px; }
  .v1x-ownerbanner { padding: 22px; }
  .v1x-ownerbanner-copy { font-size: 16px; }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds (CSS only; no JS impact).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(css): v1x styles for experiences page, cards, home strips, for-clubs"
```

---

## Task 6: `/experiences` view component

**Files:**
- Create: `src/app/experiences/ExperiencesView.tsx`

Client component. Renders **two tab panels** (Upcoming default, Past). Both panels are always in the DOM; the inactive one carries the `hidden` attribute (`.v1x-panel[hidden]{display:none}`) so crawlers still see its markup. City filter and pagination only toggle `.is-hidden` on cards — every card stays in the SSR HTML. Pagination is a local copy of the proven `/clubs` Prev/Next bar (page size 24).

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { DiscoverHit } from '@/components/HeroSearchPanel';
import ExperienceCard from '@/components/ExperienceCard';

const PAGE_SIZE = 24;
type Tab = 'upcoming' | 'past';

function PaginationBar({
  pageIndex,
  totalPages,
  onChange,
}: {
  pageIndex: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="v1c-pagination v1c-pagination-bottom" aria-label="Pagination">
      <button
        type="button"
        className="v1c-pagination-btn"
        onClick={() => onChange(pageIndex - 1)}
        disabled={pageIndex === 0}
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="v1c-pagination-pos" aria-live="polite">
        Page <strong>{pageIndex + 1}</strong> of {totalPages}
      </span>
      <button
        type="button"
        className="v1c-pagination-btn"
        onClick={() => onChange(pageIndex + 1)}
        disabled={pageIndex >= totalPages - 1}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}

function Panel({
  events,
  activeCity,
  visible,
}: {
  events: DiscoverHit[];
  activeCity: string | null;
  visible: boolean;
}) {
  const [pageIndex, setPageIndex] = useState(0);

  // City filter is visual-only: matching is computed for visibility, but
  // every card is still rendered into the DOM (for SEO). When a city is
  // active we filter to it; pagination then applies to the filtered set.
  const filtered = useMemo(
    () => (activeCity ? events.filter((e) => e.city === activeCity) : events),
    [events, activeCity],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(pageIndex, totalPages - 1);
  const start = clampedPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  // Build a Set of currently-visible ids (active city + current page) so the
  // full-list render below can decide hidden vs shown without dropping cards.
  const visibleIds = useMemo(
    () => new Set(filtered.slice(start, end).map((e) => e.id)),
    [filtered, start, end],
  );

  const goto = (next: number) => {
    const clamped = Math.max(0, Math.min(next, totalPages - 1));
    setPageIndex(clamped);
    requestAnimationFrame(() => {
      document
        .querySelector('.v1x-grid')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="v1x-panel" hidden={!visible}>
      {filtered.length === 0 ? (
        <p className="v1x-empty">No experiences here yet — check the other tab.</p>
      ) : (
        <>
          <div className="v1x-grid">
            {events.map((e, i) => (
              <ExperienceCard
                key={e.id}
                e={e}
                isLcp={visible && i === 0}
                hidden={!visibleIds.has(e.id)}
              />
            ))}
          </div>
          <PaginationBar pageIndex={clampedPage} totalPages={totalPages} onChange={goto} />
        </>
      )}
    </div>
  );
}

export default function ExperiencesView({
  upcoming,
  past,
  cityFacets,
}: {
  upcoming: DiscoverHit[];
  past: DiscoverHit[];
  cityFacets: { value: string; count: number }[];
}) {
  const [tab, setTab] = useState<Tab>(upcoming.length > 0 ? 'upcoming' : 'past');
  const [activeCity, setActiveCity] = useState<string | null>(null);

  // Top cities by count, capped at 12 chips to keep the row tidy.
  const cities = useMemo(
    () =>
      [...cityFacets]
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
        .map((c) => c.value),
    [cityFacets],
  );

  return (
    <section className="v1x-container" style={{ padding: '36px 24px 80px' }}>
      <div className="v1x-tabs-row">
        <div className="v1x-tabs" role="tablist" aria-label="Experience timeframe">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'upcoming'}
            className={`v1x-tab ${tab === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Upcoming · {upcoming.length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'past'}
            className={`v1x-tab ${tab === 'past' ? 'is-active' : ''}`}
            onClick={() => setTab('past')}
          >
            Past · {past.length}
          </button>
        </div>
      </div>

      {cities.length > 0 && (
        <div className="v1x-cityfilter">
          <button
            type="button"
            className={`v1x-citychip ${activeCity === null ? 'is-active' : ''}`}
            onClick={() => setActiveCity(null)}
          >
            All cities
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className={`v1x-citychip ${activeCity === c ? 'is-active' : ''}`}
              onClick={() => setActiveCity(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <Panel events={upcoming} activeCity={activeCity} visible={tab === 'upcoming'} />
      <Panel events={past} activeCity={activeCity} visible={tab === 'past'} />
    </section>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds (component is unused until Task 7 wires the page — that's fine, it type-checks).

- [ ] **Step 3: Commit**

```bash
git add src/app/experiences/ExperiencesView.tsx
git commit -m "feat(experiences): tabs + city filter view (all cards SSR'd for SEO)"
```

---

## Task 7: `/experiences` page (server component, the SEO fix)

**Files:**
- Create: `src/app/experiences/page.tsx`

Fetches all club events, partitions them, renders `ExperiencesView`, and emits `ItemList` + `BreadcrumbList` JSON-LD covering **every** event (upcoming + past) plus keyword-rich metadata. Models the JSON-LD on the home page's `buildEventsJsonLd` and the metadata/breadcrumb shape on `src/app/clubs/page.tsx`.

- [ ] **Step 1: Create the file**

```tsx
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ExperiencesView from './ExperiencesView';
import { fetchAllClubEvents, partitionByTime } from '@/lib/discover';
import type { DiscoverHit } from '@/components/HeroSearchPanel';

export const metadata: Metadata = {
  title: 'Run club events & experiences across India | Endorfin',
  description:
    'Discover run club experiences across India — weekend long runs, social runs, cross-training meetups and community events from verified clubs. Browse upcoming and past sessions.',
  alternates: { canonical: 'https://www.endorfin.run/experiences' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/experiences',
    title: 'Run club events & experiences across India | Endorfin',
    description:
      'Weekend long runs, social runs, cross-training meetups and community events from verified run clubs across India.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

function buildItemListJsonLd(events: DiscoverHit[]) {
  if (!events.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Run Club Experiences in India',
    description:
      'Run club events and experiences across India — social runs, long runs, and community meetups from verified clubs.',
    url: 'https://www.endorfin.run/experiences',
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => {
      const locationLabel = e.locationName || e.city || 'India';
      const eventIdent = e.slug || e.id;
      const url = e.clubSlug
        ? `https://www.endorfin.run/clubs/${e.clubSlug}/events/${eventIdent}`
        : undefined;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: e.title,
          ...(e.startTime && { startDate: e.startTime }),
          ...(e.endTime && { endDate: e.endTime }),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: locationLabel,
            address: {
              '@type': 'PostalAddress',
              addressLocality: e.city || undefined,
              addressCountry: 'IN',
            },
          },
          description:
            e.description ||
            `${e.title} — a run club experience${e.city ? ` in ${e.city}` : ''}${
              e.clubName ? ` hosted by ${e.clubName}` : ''
            }.`,
          organizer: {
            '@type': 'Organization',
            name: e.clubName || 'Endorfin',
          },
          ...(e.imageUrl && { image: e.imageUrl }),
          ...(url && { url }),
        },
      };
    }),
  };
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.endorfin.run/' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Club Experiences',
      item: 'https://www.endorfin.run/experiences',
    },
  ],
};

export default async function ExperiencesPage() {
  const { events, cityFacets } = await fetchAllClubEvents();
  // Compute "now" once on the server so SSR is deterministic for this render.
  const { upcoming, past } = partitionByTime(events, Date.now());
  const itemListJsonLd = buildItemListJsonLd(events);

  return (
    <main id="main-content" className="overflow-x-hidden v1x-page">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <section className="v1-hero">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline">
            <span className="v1-hero-kicker">Club experiences · across India</span>
            <span className="v1-hero-meta">{events.length} listed</span>
          </div>
          <h1 className="v1-hero-title">
            Run club experiences in <span className="accent">India</span>
            <span className="accent">.</span>
          </h1>
          <div className="v1-hero-stats-bar">
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{upcoming.length}</span>
              <span className="v1-hero-stat-l">Upcoming</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{cityFacets.length}</span>
              <span className="v1-hero-stat-l">Cities</span>
            </span>
          </div>
        </div>
      </section>
      <ExperiencesView upcoming={upcoming} past={past} cityFacets={cityFacets} />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds; build output lists `/experiences` as a route.

- [ ] **Step 3: Verify SSR crawlability (the whole point of this page)**

Run the dev server and confirm a **past** event's title is present in the raw HTML even though the Upcoming tab is the default-visible one (proving the Past panel is in the DOM, just `hidden`):

```bash
npm run dev &
sleep 6
# Pull a known past-event title from the API to grep for:
PAST_TITLE=$(curl -s "https://api.endorfin.run/api/v1/discover/smart?kind=club_event&limit=1&sort=newest" | python3 -c "import sys,json;print(json.load(sys.stdin)['items'][0]['title'])")
echo "Looking for: $PAST_TITLE"
curl -s http://localhost:3000/experiences | grep -c "$PAST_TITLE"
curl -s http://localhost:3000/experiences | grep -c 'application/ld+json'
kill %1
```

Expected: the title grep prints `1` (or more) — the card is in the SSR'd DOM. The JSON-LD grep prints `2` (ItemList + Breadcrumb). If the title count is `0`, the panel is being conditionally mounted instead of `hidden` — fix `ExperiencesView` so both panels always render.

- [ ] **Step 4: Commit**

```bash
git add src/app/experiences/page.tsx
git commit -m "feat(experiences): /experiences listing page with full-coverage JSON-LD"
```

---

## Task 8: `/for-clubs` club-owner landing page

**Files:**
- Create: `src/app/for-clubs/page.tsx`

Reuses `<ManageClubSection/>` (the Studio pitch + lead-capture form) as the centerpiece, adds an owner hero and a benefit grid drawing copy from `/club-pitch-deck`, and emits `Service` JSON-LD. `ManageClubSection` is imported here now (it is removed from the home page in Task 10).

- [ ] **Step 1: Create the file**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ManageClubSection from '@/components/ManageClubSection';

export const metadata: Metadata = {
  title: 'For club owners — run your club on Endorfin (free) | Endorfin',
  description:
    'A free platform for run club founders in India. Get an SEO-ranked club page on Google, private in-app chat, live RSVPs and admin tools — without exchanging phone numbers or running a 400-person WhatsApp group.',
  alternates: { canonical: 'https://www.endorfin.run/for-clubs' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/for-clubs',
    title: 'For club owners — run your club on Endorfin (free)',
    description:
      'SEO-ranked club pages, in-app chat, RSVPs and admin tools for run club founders in India. Free.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

const BENEFITS = [
  {
    h: 'Get found on Google',
    p: 'Your club gets an SEO-ranked public page. Runners searching "run clubs in [your city]" find you — not just your existing followers.',
  },
  {
    h: 'Private by default',
    p: 'Members join and chat in-app. No phone numbers exchanged, no stranger added to a 400-person WhatsApp group.',
  },
  {
    h: 'Live RSVPs & rosters',
    p: 'Schedule runs with time, meet point and distance. See exactly who is showing up before you get to the start line.',
  },
  {
    h: 'Free, forever for clubs',
    p: 'Listing, member tools, chat and RSVPs cost nothing. Run free sessions or charge for paid events — your call.',
  },
];

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Endorfin for Run Clubs',
  serviceType: 'Run club management & discovery platform',
  description:
    'Free platform for Indian run club founders: SEO-ranked club pages, in-app chat, RSVPs and admin tools.',
  areaServed: { '@type': 'Country', name: 'India' },
  provider: { '@type': 'Organization', name: 'Endorfin', url: 'https://www.endorfin.run' },
  url: 'https://www.endorfin.run/for-clubs',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
};

export default function ForClubsPage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <Header />
      <section className="v1-hero">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline">
            <span className="v1-hero-kicker">For club owners · Endorfin Studio</span>
            <span className="v1-hero-meta">Free for clubs</span>
          </div>
          <h1 className="v1-hero-title">
            Run a club? Grow it on <span className="accent">Endorfin</span>
            <span className="accent">.</span>
          </h1>
          <div className="v1-hero-cta-row">
            <Link href="/admin/studio" className="v1-btn v1-btn-primary">
              Open Studio
            </Link>
            <Link href="/clubs" className="v1-btn v1-btn-ghost">
              See club pages
            </Link>
          </div>
        </div>
      </section>

      <section className="v1x-forclubs-benefits">
        <div className="v1x-container">
          <h2 className="v1x-strip-title">
            Everything you need to run a club <b>without the chaos.</b>
          </h2>
          <div className="v1x-benefit-grid">
            {BENEFITS.map((b) => (
              <div key={b.h} className="v1x-benefit">
                <h3 className="v1x-benefit-h">{b.h}</h3>
                <p className="v1x-benefit-p">{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ManageClubSection />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds; `/for-clubs` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/app/for-clubs/page.tsx
git commit -m "feat(for-clubs): club-owner landing page reusing Studio pitch + benefits"
```

---

## Task 9: Trim `PillarsAccordion` to the three discovery pillars

**Files:**
- Modify: `src/components/PillarsAccordion.tsx:21-102` (the `PANELS` array) and `:99-101` (the heading copy)

- [ ] **Step 1: Replace the `PANELS` array**

Replace the entire `const PANELS: Panel[] = [ ... ];` (lines 21-85) with the three discovery pillars (note the renumbered `num` values and the new Club Experiences panel using the existing `/images/mumbai-marathon.*` asset):

```tsx
const PANELS: Panel[] = [
  {
    num: '01',
    name: 'Running Events',
    vertical: 'Running Events',
    bg: 'bg-red',
    image: "image-set(url('/images/ext/pillars-races.avif') type('image/avif'), url('/images/ext/pillars-races.webp') type('image/webp'))",
    position: 'center 22%',
    filter: 'brightness(0.40)',
    title: 'Find your next\nstart line.',
    sub: 'Discover 500+ running events across 25+ Indian cities. Marathons, half marathons, 10Ks, 5Ks, trail runs — all filterable, all RSVPable, all free.',
    href: '/running-events',
    cta: 'Browse events →',
  },
  {
    num: '02',
    name: 'Run Clubs',
    vertical: 'Run Clubs',
    bg: 'bg-bone',
    image: "image-set(url('/images/clubs.avif') type('image/avif'), url('/images/clubs.webp') type('image/webp'))",
    position: 'center 30%',
    title: 'Join a run club\nbuilt for your pace.',
    sub: 'Find verified clubs near you — training groups, weekend long-run crews, beginner-friendly pods. Your crew is out there.',
    href: '/clubs',
    cta: 'Find a club →',
  },
  {
    num: '03',
    name: 'Club Experiences',
    vertical: 'Club Experiences',
    bg: 'bg-jet',
    image: "image-set(url('/images/mumbai-marathon.avif') type('image/avif'), url('/images/mumbai-marathon.webp') type('image/webp'))",
    position: 'center 30%',
    filter: 'brightness(0.45)',
    title: 'Show up to a\nclub experience.',
    sub: 'Weekend long runs, social runs, cross-training meetups and community events — see what clubs across India are running this week, and join in.',
    href: '/experiences',
    cta: 'Browse experiences →',
  },
];
```

- [ ] **Step 2: Update the section heading**

Replace the heading block (around lines 99-101):

```tsx
        <h2 className="v1-pillars-title">
          Running events, runners, clubs, training,<br />and coaches. One <b>app.</b>
        </h2>
```

with:

```tsx
        <h2 className="v1-pillars-title">
          Running events, run clubs, and club<br />experiences. One <b>app.</b>
        </h2>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. The `Panel` type already allows the fields used; `soon` is simply absent on all three.

- [ ] **Step 4: Commit**

```bash
git add src/components/PillarsAccordion.tsx
git commit -m "feat(home): trim pillars to events / clubs / experiences"
```

---

## Task 10: Home page redo

**Files:**
- Modify: `src/app/page.tsx` (full rewrite of the component + imports; keep the existing `ApiEvent` type, `getUpcomingEvents`, `HeroStats`, `HERO_STATS`, and `buildEventsJsonLd` — they're reused)

This keeps `HeroSearch` + the trimmed `PillarsAccordion`, **removes** `ManageClubSection` (now on `/for-clubs`), adds a slim owner banner linking to `/for-clubs`, and adds three live teaser strips (events, experiences, featured clubs). Featured clubs reuse `fetchFeaturedFull`; experiences reuse `fetchUpcomingClubEvents`; events reuse the existing `getUpcomingEvents`.

- [ ] **Step 1: Rewrite `src/app/page.tsx`**

Replace the whole file with:

```tsx
import Link from 'next/link';
import Header from '@/components/Header';
import HeroSearch from '@/components/HeroSearch';
import PillarsAccordion from '@/components/PillarsAccordion';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import ExperienceCard from '@/components/ExperienceCard';
import { fetchUpcomingClubEvents } from '@/lib/discover';
import { fetchFeaturedFull } from '@/lib/clubs-featured';
import { fmtDayWithWeekday } from '@/lib/format-date';
import type { ApiClub } from '@/app/clubs/page';

interface ApiEvent {
  id: string;
  slug?: string | null;
  title: string;
  startTime: string;
  endTime?: string | null;
  registrationEndDate?: string | null;
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

export interface HeroStats {
  clubs: number;
  races: number;
  clubEvents: number;
  cities: number;
}

// Curated marketing numbers. We used to derive these from
// /discover?includeFacets=true, but the backend folded that route into
// /discover/smart (the old URL 404s, so the fallback always rendered) and its
// facet counts don't match the marketing claims anyway — club_event counts
// every occurrence ever and cities counts raw name variants.
const HERO_STATS: HeroStats = { clubs: 110, races: 500, clubEvents: 200, cities: 30 };

function buildEventsJsonLd(events: ApiEvent[]) {
  if (!events.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming Running Events in India',
    description: 'Marathons, half marathons, 10K and 5K events across India',
    url: 'https://www.endorfin.run',
    numberOfItems: events.length,
    itemListElement: events.map((event, i) => {
      const locationLabel = event.locationName || event.locationAddress || 'India';
      const validFromAnchor = event.registrationEndDate || event.startTime;
      const validFrom = new Date(
        new Date(validFromAnchor).getTime() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: event.title,
          startDate: event.startTime,
          endDate: event.endTime || event.startTime,
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
          description: `${event.title} — a running event in ${locationLabel}. Register on Endorfin.`,
          organizer: { '@type': 'Organization', name: 'Endorfin' },
          performer: { '@type': 'PerformingGroup', name: 'Event participants' },
          ...(event.priceMin != null && {
            offers: {
              '@type': 'Offer',
              price: String(event.priceMin),
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
              url: `https://www.endorfin.run/running-events/${event.slug || event.id}`,
              validFrom,
              ...(event.registrationEndDate && { validThrough: event.registrationEndDate }),
            },
          }),
          ...(event.imageUrl && { image: event.imageUrl }),
          url: `https://api.endorfin.run/e/${event.id}`,
        },
      };
    }),
  };
}

function fmtPrice(p?: number) {
  return p != null && p > 0 ? `₹${p}` : 'Free';
}

function EventTeaserCard({ event }: { event: ApiEvent }) {
  const loc = event.locationName || event.locationAddress || 'India';
  return (
    <a
      href={`https://api.endorfin.run/e/${event.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="v1x-card v1x-card-link"
    >
      <div className="v1x-card-media">
        <div className="v1x-card-media-fallback" aria-hidden>
          {event.title.slice(0, 2).toUpperCase()}
        </div>
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt={event.title} loading="lazy" decoding="async" />
        )}
        {event.startTime && (
          <span className="v1x-card-datechip">{fmtDayWithWeekday(event.startTime)}</span>
        )}
        <span className="v1x-card-typechip">{fmtPrice(event.priceMin)}</span>
      </div>
      <div className="v1x-card-body">
        <h3 className="v1x-card-title">{event.title}</h3>
        <div className="v1x-card-meta">
          <span className="v1x-card-loc">{loc}</span>
        </div>
      </div>
    </a>
  );
}

function ClubTeaserCard({ club }: { club: ApiClub }) {
  const img = club.headerImageUrl || club.logoUrl || null;
  return (
    <Link href={`/clubs/${club.slug}`} className="v1x-card v1x-card-link">
      <div className="v1x-card-media">
        <div className="v1x-card-media-fallback" aria-hidden>
          {club.name.slice(0, 2).toUpperCase()}
        </div>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={club.name} loading="lazy" decoding="async" />
        )}
        {club.city && <span className="v1x-card-datechip">{club.city}</span>}
        {club.stats?.members ? (
          <span className="v1x-card-typechip">{club.stats.members.toLocaleString('en-IN')} members</span>
        ) : null}
      </div>
      <div className="v1x-card-body">
        <h3 className="v1x-card-title">{club.name}</h3>
        <div className="v1x-card-meta">
          {club.subtitle && <span className="v1x-card-loc">{club.subtitle}</span>}
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  // All three teaser fetches run in parallel; each degrades to [] on failure.
  const [events, experiences, featured] = await Promise.all([
    getUpcomingEvents(),
    fetchUpcomingClubEvents(8),
    fetchFeaturedFull(['']).then(() => [] as ApiClub[]).catch(() => [] as ApiClub[]),
  ]);
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
      <HeroSearch stats={HERO_STATS} />
      <PillarsAccordion />

      {experiences.length > 0 && (
        <section className="v1x-strip">
          <div className="v1x-container">
            <div className="v1x-strip-head">
              <h2 className="v1x-strip-title">
                Upcoming club <b>experiences</b>
              </h2>
              <Link href="/experiences" className="v1x-strip-seeall">
                See all experiences →
              </Link>
            </div>
            <div className="v1x-strip-grid">
              {experiences.map((e) => (
                <ExperienceCard key={e.id} e={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="v1x-strip">
          <div className="v1x-container">
            <div className="v1x-strip-head">
              <h2 className="v1x-strip-title">
                Upcoming running <b>events</b>
              </h2>
              <Link href="/running-events" className="v1x-strip-seeall">
                See all events →
              </Link>
            </div>
            <div className="v1x-strip-grid">
              {events.map((ev) => (
                <EventTeaserCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="v1x-strip">
          <div className="v1x-container">
            <div className="v1x-strip-head">
              <h2 className="v1x-strip-title">
                Featured run <b>clubs</b>
              </h2>
              <Link href="/clubs" className="v1x-strip-seeall">
                See all clubs →
              </Link>
            </div>
            <div className="v1x-strip-grid">
              {featured.map((c) => (
                <ClubTeaserCard key={c.slug} club={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="v1x-strip">
        <div className="v1x-container">
          <div className="v1x-ownerbanner">
            <div className="v1x-ownerbanner-copy">
              Run a club? <b>Grow it on Endorfin</b> — free pages, RSVPs and member tools.
            </div>
            <Link href="/for-clubs" className="v1x-ownerbanner-cta">
              For club owners →
            </Link>
          </div>
        </div>
      </section>

      <CTASection />
      <Footer />
    </main>
  );
}
```

> **Note on the featured-clubs fetch:** `fetchFeaturedFull(slugs)` takes an array of club slugs and returns rich `ApiClub` objects — it does NOT discover slugs on its own. The stub above resolves to `[]` so the strip is hidden by default. In Step 2 you will replace it with a real slug source.

- [ ] **Step 2: Wire featured clubs to real data**

`fetchFeaturedFull` needs slugs. Reuse the same `fetchAllClubEvents`-style discovery already used by `/clubs`: fetch the top clubs via `/discover/smart?kind=club` and pass their slugs. Add this helper to `src/lib/discover.ts`:

```ts
/** Top-N club slugs by member count — for the home "featured clubs" strip. */
export async function fetchTopClubSlugs(limit: number): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.endorfin.run/api/v1/discover/smart?kind=club&limit=${limit}&offset=0&sort=newest`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items: { slug: string | null; members: number | null }[] };
    return data.items
      .filter((c) => c.slug)
      .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
      .slice(0, limit)
      .map((c) => c.slug as string);
  } catch {
    return [];
  }
}
```

Then in `page.tsx`, update the import and the featured fetch:

```tsx
import { fetchUpcomingClubEvents, fetchTopClubSlugs } from '@/lib/discover';
```

```tsx
  const [events, experiences, featuredSlugs] = await Promise.all([
    getUpcomingEvents(),
    fetchUpcomingClubEvents(8),
    fetchTopClubSlugs(6),
  ]);
  const featured = await fetchFeaturedFull(featuredSlugs).catch(() => [] as ApiClub[]);
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. Confirm there are no remaining imports of `ManageClubSection` in `page.tsx` (it must only be imported by `/for-clubs`).

- [ ] **Step 4: Verify home renders the strips**

```bash
npm run dev &
sleep 6
curl -s http://localhost:3000/ | grep -c 'v1x-strip-title'
curl -s http://localhost:3000/ | grep -c '/for-clubs'
kill %1
```

Expected: `v1x-strip-title` count ≥ 1 (strips present, depending on live data), and `/for-clubs` count ≥ 1 (owner banner + header link).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/lib/discover.ts
git commit -m "feat(home): discovery focus — 3 pillars, live teaser strips, owner banner"
```

---

## Task 11: Full-site verification

**Files:** none (verification only)

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: succeeds with `/`, `/experiences`, and `/for-clubs` all listed as routes. (Recall the project's react-is/recharts gotcha is unrelated to this work but the build is still the gate — if it fails for react-is reasons, that's a pre-existing issue, not from this plan.)

- [ ] **Step 2: Smoke-test each surface on the dev server**

```bash
npm run dev &
sleep 6
for path in / /experiences /for-clubs /clubs /running-events; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$path -> $code"
done
kill %1
```

Expected: every path returns `200`. (`/clubs` and `/running-events` confirm we didn't break the untouched pages.)

- [ ] **Step 3: Confirm nav links resolve on a sub-page**

```bash
npm run dev &
sleep 6
curl -s http://localhost:3000/clubs | grep -o 'href="/experiences"' | head -1
curl -s http://localhost:3000/clubs | grep -o 'href="/for-clubs"' | head -1
kill %1
```

Expected: both `href` strings print (the four-link header renders on every page).

- [ ] **Step 4: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore: verification fixes for discovery landing rework" || echo "nothing to commit"
```

---

## Self-review notes (addressed)

- **Spec coverage:** Header (Task 1), `/experiences` listing + tabs + city filter + SSR crawlability + JSON-LD (Tasks 4,6,7), `/for-clubs` reusing `ManageClubSection` + pitch copy (Task 8), home redo to 3 pillars + live teasers + owner banner with `ManageClubSection` removed (Tasks 9,10). Shared `ExperienceCard` consumed by both `/experiences` and home (Tasks 4,10). All spec sections map to a task.
- **Type consistency:** `DiscoverHit` is imported from `@/components/HeroSearchPanel` everywhere. `ApiClub` is imported from `@/app/clubs/page` (where it is exported). `fetchAllClubEvents`/`partitionByTime`/`fetchUpcomingClubEvents`/`fetchTopClubSlugs` are defined in `src/lib/discover.ts` and used with matching signatures. `fmtDayShort`/`fmtTimeShort`/`fmtDayWithWeekday` are defined in `src/lib/format-date.ts`. The detail URL `/clubs/{clubSlug}/events/{slug||id}` matches the existing route (which accepts slug or UUID).
- **Crawlability:** Task 7 Step 3 explicitly tests that a Past-tab card appears in SSR HTML while Upcoming is the active tab — the load-bearing SEO assertion.
- **No placeholders:** every code step contains complete code; the one stub in Task 10 Step 1 is explicitly flagged and replaced with real data in Step 2.
