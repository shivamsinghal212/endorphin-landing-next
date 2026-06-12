# Discovery-focused landing rework

**Date:** 2026-06-12
**Status:** Approved (design) — pending implementation plan

## Goal

Refocus the public site on three discovery surfaces — **Running Events**, **Run
Clubs**, and **Club Experiences** — and move club-owner marketing onto its own
page. The immediate, concrete win is a new `/experiences` listing page that
makes the ~1,076 club events crawlable for the first time (today there is no
discovery page for club events, so they cannot rank in search).

This is one cohesive effort delivered as four connected pieces:

1. Header navigation rework
2. New `/experiences` listing page (the SEO fix)
3. New `/for-clubs` club-owner landing page
4. Home page redo (discovery focus + live teasers)

## Constraints & decisions

- **Aesthetic:** evolve the existing `v1-` design system (dark / signal-red,
  `globals.css`). No rebrand.
- **Experiences URL:** `/experiences` (permanent; chosen over `/club-experiences`
  and `/club-events`).
- **Experiences display:** two tabs, **Upcoming** / **Past**, both SSR'd into the
  DOM for crawlability.
- **Owners page:** new `/for-clubs`, reusing existing pitch copy. Leave
  `/club-pitch-deck` untouched.
- **Home pillars:** only the three discovery pillars. Runners / Workout Plan /
  Coaches are removed from the home page and nav (their pages still exist).
- **Home content:** add live teaser strips (events + experiences + clubs).

## Explicitly out of scope (do not modify)

`/clubs` and `ClubsView`, the club/race/club-event **detail** pages,
`/run-clubs/[city]`, `/club-pitch-deck`, and the discover/backend API. No
backend changes — everything reuses `/api/v1/discover/smart` and existing
fetch helpers.

---

## 1. Header navigation

File: `src/components/HeaderClient.tsx`

Replace `NAV_LINKS` with exactly four primary links:

| Label | href |
|---|---|
| Running Events | `/running-events` |
| Run Clubs | `/clubs` |
| Club Experiences | `/experiences` |
| For Club Owners | `/for-clubs` |

- Drop Runners / Workout Plan / Coaches entries (and their `soon` styling usage
  if now unused).
- All four are `primary: true`.
- Logo, Sign in, and Download/Studio CTA unchanged.
- Mobile menu renders the same list (it already maps `NAV_LINKS`).
- `isLinkActive` already handles `/experiences` and `/for-clubs` via the
  `startsWith` rule — no change needed.

---

## 2. New `/experiences` page (SEO fix)

Mirror the `/clubs` architecture:

- `src/app/experiences/page.tsx` — async server component.
- `src/app/experiences/ExperiencesView.tsx` — `'use client'` view (tabs, city
  filter, load-more), modeled on `ClubsView`.

### Data fetching

- Source: `GET /api/v1/discover/smart?kind=club_event&limit=50&offset=N&includeFacets=true`.
- Reuse the `DiscoverHit` type from `HeroSearchPanel` and the `DiscoverPage`
  pagination shape from `clubs/page.tsx` (first page returns `total`; fan out the
  rest in parallel).
- `revalidate: 3600`.
- `PAGE_SIZE = 50`, `MAX_PAGES = 30` (covers ~1,500 events; current total ~1,076
  = ~22 pages).
- Fetch **all** events (for SEO completeness), then partition in memory by
  `startTime` relative to "now":
  - **Upcoming**: `startTime >= now`, sorted ascending (soonest first). Default tab.
  - **Past**: `startTime < now`, sorted descending (most recent first).
- City facet: read `facets.cities` from the first page (already returned by the
  endpoint — verified `[Mumbai 286, Bangalore 183, Delhi 119, ...]`).

### View / interaction (`ExperiencesView`)

- **Tabs**: "Upcoming" (default) and "Past". Both tab panels are present in the
  SSR'd HTML; the inactive one is hidden via `hidden`/CSS (NOT conditionally
  mounted) so crawlers see every event.
- **City filter**: chip row from city facets, mirroring `ClubsView`'s filtering.
  Filters within the active tab. An "All cities" default chip.
- **Load more**: progressive reveal within a tab (same pattern as the clubs grid)
  so the initial DOM isn't enormous but all cards exist in markup for crawlers.
  (Follow whatever `ClubsView` does — render-all-in-DOM, reveal-on-click.)
- **Empty states**: if Upcoming is empty, show a friendly note and default the
  user's attention to Past.

### `ExperienceCard`

Fields from `DiscoverHit`:

- `imageUrl` (cover) with a graceful fallback block when null.
- `title`.
- Club name `clubName` linking to `/clubs/${clubSlug}` (when `clubSlug` present).
- `city` and `locationName`.
- Formatted date from `startTime`.
- Badge: distance (`${distanceKm}K`) when set, else a label derived from
  `eventType` (`club_run` → "Club run", `club_cross_train` → "Cross-train",
  `race_event` → "Race", etc.).
- Card links to the existing detail page:
  `/clubs/${clubSlug}/events/${slug || id}`.

### SEO

- `metadata`: keyword-rich title/description, e.g. "Run club events &
  experiences across India" + `alternates.canonical`
  `https://www.endorfin.run/experiences` + OpenGraph (mirror `/clubs`).
- `ItemList` JSON-LD covering **all** events (upcoming + past), each as an
  `Event` (name, `startDate`, `location` with `addressLocality`/`addressCountry`,
  `organizer` = club name, `image`, `url` = detail page). Model on the home
  page's `buildEventsJsonLd`.
- `BreadcrumbList` JSON-LD: Home → Club Experiences.

---

## 3. New `/for-clubs` page

File: `src/app/for-clubs/page.tsx` — server component (+ a small CSS file or
reuse of existing classes as needed).

- Owner-focused hero (headline like "Run a club? Grow it on Endorfin.").
- Reuse `<ManageClubSection/>` as the centerpiece (Studio pitch + the existing
  `KipOnboardForm` lead capture). This component is *moved* off the home page.
- A few benefit sections drawing copy from `/club-pitch-deck`:
  SEO-ranked club pages on Google, private in-app chat (no phone numbers
  exchanged), live RSVPs / admin tools, free.
- `metadata`: owner intent ("Free platform for run club founders in India…") +
  canonical `https://www.endorfin.run/for-clubs`.
- JSON-LD: `Service`/`Organization` describing the free club platform.
- `Header` + `Footer` wrappers like every other page.

---

## 4. Home page redo

File: `src/app/page.tsx` (+ `src/components/PillarsAccordion.tsx`).

- **Keep** `HeroSearch` (already searches clubs/races/club_events — the unified
  discovery entry point), stats bar, and app-store CTAs.
- **`PillarsAccordion` trimmed to three panels**: Running Events (`/running-events`),
  Run Clubs (`/clubs`), and a **new Club Experiences panel** (`/experiences`).
  Remove the Runners / Workout Plan / Coaches panels. Update the section heading
  copy accordingly. A new cover image/treatment is needed for the Experiences
  panel (reuse an existing club-event cover or a suitable `/images` asset).
- **Remove `ManageClubSection`** from the home page (now on `/for-clubs`). Add a
  slim "Run a club?" banner/CTA on the home linking to `/for-clubs` so owners
  retain an entry point.
- **Live teaser strips** below the pillars — each a horizontal card row with a
  heading and a "see all →" link:
  - **Upcoming running events** → `/running-events` (reuse `getUpcomingEvents`
    / `EventsShowcase` pattern).
  - **Upcoming club experiences** → `/experiences` (new fetch:
    `/discover/smart?kind=club_event`, filter to upcoming, take first ~6–8;
    render with `ExperienceCard`).
  - **Featured run clubs** → `/clubs` (reuse `clubs-featured` /
    `fetchFeaturedFull`).
  - Each strip degrades gracefully to nothing if its fetch returns empty.
- **Keep** `CTASection` + `Footer`. Retain the events `ItemList` JSON-LD.

---

## Architecture notes

- **Shared card**: `ExperienceCard` is the single source of truth for club-event
  cards, consumed by both `/experiences` and the home teaser strip. Put it in
  `src/components/` so both can import it.
- **Reuse over rebuild**: the `/experiences` page is deliberately a near-twin of
  `/clubs/page.tsx` + `ClubsView` to stay consistent and low-risk. Lift the
  pagination/fetch helper rather than reinventing it; if it's worth sharing,
  extract a small `fetchAllDiscover(kind)` helper into `src/lib/`.
- **Crawlability rule** (applies to `/experiences`): every event must exist in
  the server-rendered HTML and in JSON-LD. Tabs and "load more" may control
  *visibility* but never *presence* in the DOM.

## Testing / verification

- Build passes (`npm run build`) — recharts/react-is gotcha is unrelated but
  always run the full build before pushing.
- `/experiences` renders both tabs' cards in `curl` of the SSR HTML (grep for a
  known past-event title to confirm it's in the DOM while Upcoming is active).
- JSON-LD validates (structurally) and references detail-page URLs.
- Nav shows the four links and active states resolve on each page.
- `/for-clubs` renders the moved `ManageClubSection` and its form.
- Home shows three pillars and the three teaser strips populate.
