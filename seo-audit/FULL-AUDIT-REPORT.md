# Endorfin SEO Audit — Full Report

**Site:** https://www.endorfin.run/
**Audited:** 2026-09-07
**Business type:** Running-event & run-club directory (India) — national aggregator, not a local business
**Stack:** Next.js 16 App Router on Vercel
**Previous audit:** 2026-05-15 (score 59/100) — preserved in git at `fd59821`

### Scope & limitations

Crawl-based audit against production, **now enriched with real-user field data.** A Google API key
was configured mid-audit, unlocking PageSpeed Insights, CrUX and CrUX History.

**Correction to an earlier draft of this report:** it stated that CrUX had no data for this domain
and that all performance numbers were lab-only. That was wrong. Chrome's local trace found no
*page-level* CrUX entry, and per-URL queries do return `404 chrome ux report data not found` — but
**origin-level CrUX has 28 days of real-user data** (window ending 2026-09-05) plus a history
series back to 2026-06-20. The Performance section below is now field-backed and its verdict has
changed materially.

Still missing: **Search Console, GA4 and the Indexing API**, which need OAuth or a service account
rather than an API key (`google_auth.py --check` reports "Credential Tier: 0 — API Key Only"). So
there is still no indexation data and no query data. Coverage on the 37 landers and the 40 UUID URLs
remains the highest-value missing signal — run
`python scripts/google_auth.py --auth --creds <client_secret.json>` to close it.

---

## SEO Health Score: **58 / 100**

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 22% | 60 | 13.2 |
| Content Quality | 23% | 55 | 12.7 |
| On-Page SEO | 20% | 82 | 16.4 |
| Schema / Structured Data | 10% | 42 | 4.2 |
| Performance (CWV, field) | 10% | 25 | 2.5 |
| AI Search Readiness | 10% | 65 | 6.5 |
| Images | 5% | 50 | 2.5 |
| **Total** | | | **58** |

Essentially flat against May's 59 — and the field data revealed a worse performance picture than lab measurement showed. Every Critical from the May audit is fixed: the `| Endorfin | Endorfin` title
duplication is gone (titles now 51–57 chars with a single suffix), security headers are present,
HSTS carries `includeSubDomains; preload`, and event detail URLs are now in the sitemap.

---

## Top 6 critical issues

1. **A fabricated `aggregateRating` (4.8★, 120 ratings) is declared on every page** with zero visible supporting content — a genuine Google manual-action risk that would strip rich results sitewide.
2. **Nothing on the site is CDN-cacheable** — every page returns `Cache-Control: private, no-cache, no-store` with `x-vercel-cache: MISS`.
3. **The `/running-events` hub ships 3.8 MB of HTML** (553 KB gzipped), 84% of it a serialized data payload the page never renders.
4. **25 events ship `endDate` earlier than `startDate`** — a hard Google Event validation failure.
5. **The hub loads 165.5 MB of images across 235 requests** — 99% of its weight — giving it a mobile LCP of 35.2 s and a real-user mobile LCP of 4,031 ms (POOR).
6. **Scraped Instagram data (usernames, comment text, signed profile-photo URLs) is embedded in public HTML** on a page that renders none of it.

Plus: `llms.txt` is stale (20 of 36 URLs redirect, 4 are hard 404s) — the cheapest high-value fix on the list.

## Top 5 quick wins (none over 20 minutes)

1. Regenerate `llms.txt` against current routes (~15 min).
2. Drop the stale "Experiences" wording from the `/clubs` H1 and its loading skeleton (~10 min).
3. Add `og:image` to the hub and the 37 landers (~20 min).
4. Dedupe the sitemap by event id — one URL is currently emitted twice (~10 min).
5. Add a `5k-in` footer column: 8 cities qualify and it is the only distance scope missing from the footer (~15 min).

---

## Technical SEO — 60/100

### C1 · Critical · Site-wide dynamic rendering defeats all caching

Every route — including the homepage and the ISR-declaring landers — returns:

```
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
x-vercel-cache: MISS
```

**Cause:** `src/components/Header.tsx` is a server component that calls `getSessionToken()` →
`cookies()`, and it renders on every public page. Reading cookies opts the whole route tree into
dynamic rendering.

**Consequences:**
- `export const revalidate = 600` in `src/app/running-events/[slug]/[city]/page.tsx` is inert.
- `generateStaticParams()` for the 37 landers is inert — nothing is prerendered.
- Every crawler hit triggers a full SSR plus the paginated event API fan-out. Hub TTFB measured 0.95 s; a real Chrome navigation to `/running-events` exceeded a 10 s timeout on first load.

The code comment in `Header.tsx` notes that `auth()` is skipped unless its cookie is present "which
is also what keeps it out of static prerenders" — but the unconditional `getSessionToken()` call
above it already forces dynamic, so the intent is defeated.

**Fix:** Move signed-in state out of the server render — resolve it client-side after hydration, or
isolate it in a `<Suspense>` boundary so the static shell stays cacheable. Then the landers become
genuinely static and the hub can serve from ISR.

### C2 · Critical · `/running-events` ships 3.8 MB of HTML

| Page | HTML | gzipped | of which RSC payload |
|---|---|---|---|
| `/running-events` | 3,836,737 B | 553 KB | 3,215,476 B (84%) |
| `/clubs` | 1,117,594 B | 194 KB | — |
| `/running-events/in/mumbai` | 483,748 B | 61 KB | — |
| `/` | 63,941 B | 12.5 KB | — |

`ClubsView` is a client component receiving the full `races` array, so Next serializes all 243
event objects into `self.__next_f` for hydration — on top of the SSR markup. Because the RSC payload
is JSON escaped inside HTML, every byte of prop data costs roughly two bytes on the wire.

The payload carries fields the page never renders. Largest string-value contributors:

| Field | Bytes | Rendered? |
|---|---|---|
| `userPictureUrl` | 205.8 KB | No |
| `description` | 159.8 KB | No (cards show title/date/place/price only) |
| `imageUrl` | 47.6 KB | Yes |
| `registrationUrl` | 16.0 KB | No |
| `locationAddress` | 15.8 KB | No |
| `fullDescription` | 18.3 KB | No |

Also present and unrendered: `recap`, `topComments`, `sponsorsSeen`, `secondaryActivities`,
`maxParticipants`, `inclusions`, `discountedPrice`, `categoryStartTime`, `isActive`, `createdBy`, `source`.

**Fix:** Pass a slim projection to `ClubsView` — `RaceCard` needs only `id`, `slug`, `title`,
`imageUrl`, `startTime`, `locationName`, `priceMin`, `distanceCategories`. Keep the full array in
the server component for the JSON-LD, which never crosses into the client. Expect roughly an 80%
reduction in page weight.

### C3 · Critical · Scraped Instagram data in public HTML

The unrendered `topComments` payload includes Instagram usernames, verbatim comment text with
@-mentions of third parties, like counts, and signed `cdninstagram.com` profile-photo URLs — 383
`userPictureUrl` values, 758 `cdninstagram` references.

Two distinct problems: publishing third-party personal data that no visitor asked to see and no
page displays; and the signed URLs expire, so any future use of them breaks. Fixing C2 removes this
as a side effect.

### H1 · High · 40 event URLs are raw UUIDs

16% of the 243 event-detail URLs in the sitemap look like
`/running-events/8ff9038d-ba07-4fcd-bcc0-87ca5e259ade`. They return 200, but carry no keyword
signal — and if a slug is assigned later, `eventPath()` silently switches to it with no redirect
from the UUID, orphaning the indexed URL.

**Fix:** Generate a slug at ingest for every event; keep the UUID path permanently redirecting to
the slug so already-indexed URLs survive.

### H2 · High · No Content-Security-Policy

Present and correct: `strict-transport-security: max-age=63072000; includeSubDomains; preload`,
`x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`,
`referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: camera=(self), microphone=(), geolocation=()`.

CSP is the remaining gap. Not a ranking factor; it is the last item on the security-header checklist.

### M1 · Medium · Sitemap emits a duplicate URL

525 `<loc>` entries, 524 distinct. `https://www.endorfin.run/running-events/wesnesswomens5kfunrunpune2026-36977`
appears twice, though the database holds exactly one matching row.

**Cause:** the race loop in `src/app/sitemap.ts` (~line 183) pushes one entry per fetched item with
no dedupe, and `fetchAllRaces()` paginates sequentially — an unstable sort or a row inserted
mid-pagination yields the same event on two pages.

**Fix:** dedupe by `race.id` before emitting.

### M2 · Resolved · The 243 vs 252 gap is an API-side filter, not a pagination bug

The database holds 252 upcoming `category='running'` rows while the sitemap and hub both report 243.
Paginating the live API directly returns exactly **243 items across all pages**, and the
`(eventType, eventFormat)` distribution of that feed is `('on_ground','in_person') 202` and
`(null,'in_person') 41` — **no virtual events at all**.

So the API excludes virtual events (and a few others) from the list feed. The
`if (items.length < PAGE_SIZE) break;` early exit is not firing. No fix needed in `sitemap.ts`; the
sitemap faithfully reflects the feed. Worth deciding deliberately whether the 4 virtual events
*should* be in the sitemap — they have live, indexable detail pages today (see H6) but no sitemap
entry and no list-page link, making them effectively orphaned.

### M3 · Medium · 243 sitemap entries carry a future-dated `lastmod`

Of 525 `<lastmod>` values: **243 are in the future**, 59 are today, 223 are in the past.

The 243 future-dated ones are exactly the event-detail URLs, because `sitemap.ts:187` sets
`lastModified: new Date(race.startTime)` — the date the *race happens*, not the date the page last
changed. A `lastmod` in the future is invalid; Google ignores such values and repeated abuse can
lead it to distrust the field for the whole domain.

The 223 past-dated club entries look correct. The 59 set to today are static routes and landers
using `new Date()` at build time, which is merely uninformative rather than wrong.

**Fix:** use a real content-modified timestamp for event pages, or omit `lastmod` for them rather
than asserting a future date.

### Low · 404 pages emit two conflicting robots directives

A nonexistent event slug correctly returns a hard HTTP 404 (verified — not a soft-404). But the
`<head>` carries **two** `<meta name="robots">` tags: `noindex` from Next's not-found shell, then
`index, follow, max-image-preview:large, max-snippet:-1` from the route's default metadata, which
is not overridden for the not-found case. The canonical on that page also points at `/`.

Google applies the most restrictive directive and the 404 status already excludes the page, so
risk today is minimal — but it relies on tie-break behaviour rather than an explicit signal. Set
`robots: { index: false }` in the not-found path.

### Clean

- Migration redirects are single-hop 308s: `/experiences`, `/experiences/:path*`, `/races`, `/races/:path*` → `/running-events`. No chains, no loops, nothing still 200 at the old paths.
- Canonicals are self-referential and correct on all four page types.
- `robots.txt`: `Allow: /`, disallows `/api/` and `/admin/`, sitemap declared, AI crawlers explicitly allowed.
- All 37 sitemap landers return 200 — the quality gate is honest about what it publishes.
- `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">` sitewide.
- `skipTrailingSlashRedirect` creates no duplicate-URL pairs in practice; canonicals cover it.

---

## Content Quality — 55/100

### H3 · High · 14% of event pages have no description

Of 252 upcoming events: **35 have no description at all**, 42 are under 150 characters. Those pages
are an H1, a date, a place, a price, and an image — below the threshold at which a page earns
indexing on its own merits. The JSON-LD papers over it with a synthesized
`"{title} — a running event in {city}. Register on Endorfin."`, but the visible page stays thin.

Descriptions are otherwise genuinely unique (218 distinct values across 252 rows, and the collision
is almost entirely the empty ones collapsing together) — so this is a *missing* content problem, not
a duplicate content problem.

**Fix:** either synthesize something substantive on the page from structured fields already held
(distances, categories, start times, route, organiser, price tiers), or gate detail pages on having
real copy the way the landers are gated.

### C6 · Critical · Lander prose is reused verbatim across up to six URLs per city

`/running-events/marathon-in/mumbai` renders **two race cards** plus the shared 60-word city
paragraph — it passes only because `minCount` for `marathon-in` is 2. A two-item list under a
distance-specific H1 is the doorway-page shape.

Compounding it: the same ~60-word `intro` is reused verbatim across every scope for a city, so
`/in/mumbai`, `/10k-in/mumbai`, `/half-marathon-in/mumbai`, `/5k-in/mumbai` and
`/marathon-in/mumbai` share their only hand-written prose. Where the race lists are also similar,
differentiation rests on the list alone.

**Assessment.** `race-city-pages.ts` stores exactly one `intro` string per city, and
`[slug]/[city]/page.tsx:346` renders it as `<p>{cityPage.intro}</p>` with no scope-specific
variation — so the reuse is byte-identical, not merely similar. Every one of these URLs
self-canonicalises to itself and sits at near-identical sitemap priority (0.8–0.85), so the site is
telling Google "these are six distinct pages" while shipping one shared paragraph and a filtered
subset of one list. `/in/{city}` is a strict superset of every narrower scope
(`raceMatchesScope` returns `true` unconditionally for `'in'`), which is also a direct
cannibalisation setup for the broad "running events in {city}" query.

The surrounding architecture is genuinely good — the gate is real and does suppress empty cities
(`/in/kolkata` and `/in/ahmedabad` 404 rather than publish), the cross-links are honest, and the
city paragraphs themselves are well-researched and unique *across* cities (Rajabai Tower, the TCS
World 10K's Gold Label, the Kolkata 25K's odd distance). The defect is narrow and specific:
same-city, cross-scope reuse. Two changes settle it:

1. Change `intro: string` to a per-scope map and write 2–3 sentences per `(city, scope)`. Only ~30
   combinations ever render. The research already exists in the current intros — it needs splitting
   by distance, not redoing. This is a writing task, not a re-architecture.
2. Raise `minCount` for distance-specific scopes from 2 to 4–5, removing the doorway-shaped pages at
   the low-inventory end.

Optionally, inject a computed fact line from data already in scope at render time ("2 marathons,
next on 13 Sep") — cheap differentiation that updates itself.

Do **not** solve this by canonicalising narrow scopes to `/in/{city}`: that discards the ability to
rank for "marathon in mumbai", which is the entire point of the cluster.

### M10 · Medium · Seven duplicate event records

Same title, same date, two rows — one with a slug, one with only a UUID:

| Event | Date |
|---|---|
| Chandigarh Marathon & Wellness 2026 Edition 2 | 2026-10-10 |
| Delhi Neon Run | 2026-11-29 |
| Hare Krishna Run 2027 – 2nd Edition | 2027-02-06 |
| India Republic Half Marathon | 2027-01-17 |
| Mumbai Ultra Walkathon 2.0 | 2026-10-31 |
| Nutrifresh Farm Ultra 2026 – 2nd Edition | 2026-11-15 |
| Run for Child Health 2026 | 2026-10-03 |

Each is two indexable URLs for one event. The slug/UUID pairing indicates the ingest creates a
second record without a slug — the same root cause as H1.

**Fix:** dedupe on (normalised title, date, city) at ingest; 301 the loser to the winner.

### M4 · Medium · Stale "Experiences" branding on `/clubs`

The `/clubs` H1 still reads **"Run Clubs & Experiences in India"** — in both
`ClubsView.tsx:1862` and `ClubsExperiencesSkeleton.tsx:143`. "Experiences" is a retired concept:
the route is gone and 308s to `/running-events`. The page targets a term the product no longer uses.

Because `/clubs` has a `loading.tsx` skeleton, the streamed HTML also contains **two `<h1>`
elements** — the skeleton's, then the real one inside `<div hidden id="S:0">`. Googlebot renders JS
and sees one; raw-HTML consumers (many AI crawlers, social scrapers) see both. Low impact on its
own, worth fixing alongside the copy.

### Low-Medium · One CTA sentence repeats across every thin event page

`buildEventNarrative()` (`src/lib/event-seo.ts:71-99`) is defensively engineered: it uses real
`description`/`fullDescription`/`descriptionMd` when present and otherwise synthesises from
structured fields, so no event page is ever empty. But every synthesised narrative closes with the
identical sentence — *"View the full schedule, register, and set a start-line reminder on
Endorfin."* (`event-seo.ts:94-96`) — creating one repeated n-gram across the 35 events that have no
description. Rotate a few variants or drop it; the page already has a real Register button.

### E-E-A-T for an aggregator

Race listings are imported from third parties (indiarunning, townscript, citywoofer, mysamay) with
no visible sourcing, no editorial byline, and no "last verified" signal. For a directory the useful
signals are not author bios but provenance and freshness:

- State the source and a verification date on each event page.
- Say plainly how listings are collected and what is checked.
- Surface the club-verification process the directory already performs.
- Add a named editorial owner for the city pages — that is where the hand-written prose lives.

Concretely missing today: **no indexable About or company page exists at all.** `AboutSection.tsx`
is a homepage section, not a URL, so there is nothing in `sitemap.ts` for Google to attach
entity-level trust signals to — no founder name, no based-in-India statement, no address or
registration detail anywhere crawlable. Footer trust signals are `hello@endorfin.run`, an Instagram
handle, and the policy links. Worth noting the Instagram handle is `@hacknflex`, which does not
match the brand — a small but real credibility snag for anyone (or any rater) checking.

A "How we source event data" page is the single highest-value addition, because it answers the
question the quality-rater guidelines actually ask of an aggregator: who is responsible for this
content and how is it produced.

---

## On-Page SEO — 82/100

Strongest category. Titles are unique, keyword-led and well-sized; meta descriptions are unique and
in range; canonicals are correct; heading order is sequential.

| URL | Title (chars) | Meta desc | H1 |
|---|---|---|---|
| `/` | 50 | 163 | 1 |
| `/running-events` | 56 | 169 | 1 |
| `/clubs` | 56 | 146 | 2 (streaming artifact) |
| `/running-events/in/mumbai` | 57 | 158 | 1 |
| `/running-events/10k-in/mumbai` | 51 | 142 | 1 |
| `/running-events/marathon-in/mumbai` | 52 | 148 | 1 |

**Internal linking is strong.** The footer links 28 landers; lander-to-lander "Other distances"
cross-links reach the remaining 9, so all 37 are crawlable. The hub SSRs an anchor for every one of
the 243 upcoming races rather than only the 12 in the rails, and filtered cards use `hidden` rather
than unmounting — so filter state cannot affect crawlability.

### M5 · Medium · `5k-in` is the only distance scope missing from the footer

`in`, `10k-in`, `half-marathon-in` and `marathon-in` each get a footer column. `5k-in` has **8
qualifying cities** — more than `marathon-in`'s 5 — but no column, so those 8 landers sit at crawl
depth 3. `ultra-in` is correctly suppressed (1 city, below the 3-city column floor).

### M6 · Medium · No `og:image` on the hub or the landers

The homepage sets both `og:image` and `twitter:image`. `/running-events` has `twitter:image` but no
`og:image`; the landers have neither. Every share of a city or distance page renders as a bare text
card.

---

## Schema / Structured Data — 42/100

All JSON-LD is server-rendered, so crawlers that do not execute JS still see it. Three global
blocks (`MobileApplication`, `Organization`, `WebSite` with `SearchAction`) plus per-page
`ItemList`/`BreadcrumbList`. Exactly one `BreadcrumbList` per document — the duplicate introduced by
today's merge is gone. Currency is 100% INR with no anomalies, and free-vs-unpriced offers are
handled correctly (unknown price omits the `offers` block; genuinely free events emit `price: "0"`).

Multiple `ItemList` objects on `/running-events` are valid. Worth knowing, though: a generic
`ItemList` wrapping `Event`/`SportsClub` items does not unlock a Search carousel the way it does for
Recipe/Course/Movie. Google's Event rich results come from a separate per-Event pipeline, so keep
the three lists as honest entity groupings but expect no carousel from the wrapper.

### C5 · Critical · Fabricated `aggregateRating` on every page

`src/app/layout.tsx:71` hardcodes:

```js
aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', bestRating: '5', ratingCount: '120' }
```

This ships inside the `MobileApplication` block on **every page of the site**. Stripping all
`<script>` and `<style>` content from the rendered homepage and searching the visible text for
`4.8`, `120`, `rating`, `review` and `★` returns **zero matches** — there is no star widget, no
review count, no rating UI anywhere on the page.

Google's structured-data policy requires rating markup to reflect content genuinely visible on the
page. Self-declared, invisible ratings are called out explicitly in the spam policies, and the
penalty is not scoped to the offending block — a manual action can strip rich results across the
whole domain. The code comment states the figure "mirrors the Play Store figure", which is precisely
the pattern the policy prohibits: a rating asserted in markup that the page does not show.

**Fix:** delete `aggregateRating`. If you want the star rating as a legitimate asset, pull the live
Play/App Store figure and render a matching visible widget — then the markup is supported.

This is the highest-risk item in the audit. It is also a two-line deletion.

### H5 · High · 25 events ship `endDate` before `startDate`

Verified in the database: of 208 upcoming events carrying an `end_time`, **25 have
`end_time < start_time`** (12%). Google's Event validator requires `endDate >= startDate`; these
fail hard in Rich Results Test.

**Root cause** (traced by the schema agent and consistent with the data): `endTime` is being
populated from the race's *reporting/gate time*, which precedes the start. Because reporting
time-of-day is earlier than start time-of-day, UTC conversion lands it on the previous day. Event
descriptions for the affected races say things like "Reporting Time: 5 am / Run Start Time: 5:30 am".

All three JSON-LD builders do `endDate: r.endTime || r.startTime`
(`src/app/running-events/page.tsx:120`, `[slug]/page.tsx`, `[slug]/[city]/page.tsx`).

**Fix:** correct the ingest so `endTime` is a finish time or null. Until then, guard at the
serializer: `endDate: r.endTime && r.endTime > r.startTime ? r.endTime : r.startTime`.

### H6 · High · Virtual events are mislabelled — `eventAttendanceMode` checks the wrong column

**This corrects an earlier conclusion in this audit.** An initial pass checked `event_type` only,
found 2 upcoming rows set to `'virtual'`, and concluded nothing was mislabelled. That was wrong.

There are **two competing columns** and they disagree:

| `event_format` | `event_type` | rows | upcoming |
|---|---|---|---|
| `in_person` | `on_ground` | 519 | 202 |
| `in_person` | `null` | 125 | 47 |
| `in_person` | `'virtual'` | 37 | 2 |
| `'virtual'` | `null` | 4 | 1 |

`ApiEvent` exposes both (`src/lib/api.ts:111` `eventType`, `:137` `eventFormat`), and the rest of the
codebase treats **`eventFormat`** as authoritative (`RaceDetailView.tsx:576`,
`registration-form.tsx:689`). But the JSON-LD builders check `eventType`
(`running-events/page.tsx:123`, `[slug]/page.tsx:138`) — so the 4 rows that are genuinely virtual by
`event_format` fall through to Offline.

**Confirmed live right now.** `/running-events/the-great-himalaya-day-2026-virtual-marathon-cyclothon`
(returns 200, event starts tomorrow, `event_format = 'virtual'`):

```json
"eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
"location": { "@type": "Place", "name": "Virtual · run anywhere",
  "address": { "@type": "PostalAddress",
               "addressLocality": "Virtual · run anywhere", "addressCountry": "IN" } }
```

An in-person attendance mode on a virtual race, with the string "Virtual · run anywhere" stuffed
into `addressLocality` — a physical-address field.

Two mitigating facts, both verified: the API list feed returns 243 events of which **none** are
virtual by either column, so the hub and lander lists never encounter one; and the landers hardcode
`OfflineEventAttendanceMode` as a bare literal (`[slug]/[city]/page.tsx:148`) with no conditional at
all, which is currently harmless only because virtual events never reach them. Detail pages are the
live exposure.

**Fix:** switch both builders to `eventFormat === 'virtual'`; add the conditional to the lander
instead of the hardcoded literal; and for the online branch emit
`location: { "@type": "VirtualLocation", url: … }` rather than a fabricated `PostalAddress`.
Separately, reconcile `event_type` vs `event_format` upstream — 37 rows assert opposite values.

### H7 · High · The club-events ItemList is materially under-specified

On `/running-events`, all 28 Events in "Upcoming run-club events in India" are missing:

| Missing property | Count |
|---|---|
| `description` | 28/28 |
| `offers` | 28/28 |
| `eventStatus` | 28/28 |
| `eventAttendanceMode` | 28/28 |
| `performer` | 28/28 |
| `endDate` | 17/28 |
| `organizer` | 12/28 |

The race ItemList on the same page is built properly and has **no missing required fields**. The
club-events list simply was not given the same treatment. Build it through the same helper.

### M7 · Medium · `SportsClub.event` is a `QuantitativeValue`

`src/app/clubs/[slug]/page.tsx:378-388` emits:

```js
event: { '@type': 'QuantitativeValue', value: 32, description: 'runs hosted' }
```

Schema.org's `event` property expects an `Event`, not a count — generic validators flag this as a
type violation, and there is no Google rich-result upside to keeping it. **Fix:** rename to a
non-schema key such as `runsHosted`, or drop it.

### M8 · Medium · Hub Event addresses omit `addressRegion`

All 30 Events in the hub's race ItemList lack `addressRegion` — `running-events/page.tsx` sets
`addressLocality` only. The landers set both and are clean (0/26 missing). Related: roughly 17% of
sampled events ship `location: {name: "India"}, address: {addressCountry: "IN"}` with no city at
all, even though the same event carries correct city data when a lander serialises it. Two divergent
serialisers for one entity — worth consolidating into a shared builder.

### M9 · Medium · `numberOfItems` disagrees with the list

The hub's race ItemList declares `numberOfItems: 243` but contains 30 `itemListElement` entries
(`.slice(0, 30)`), with positions restarting at 1. The other two lists on the page and every lander
list are internally consistent, so this is isolated. Set it to 30, or emit true global positions.

### Low · Raw Markdown and inconsistent offer URLs

- Event `description` strings are shipped as raw, unrendered Markdown (`#`, `##`, `**`, `*` bullets) straight into JSON-LD. Any snippet reuse will surface literal `##` and `**`. Strip to plain text before serialising.
- `offers.url` is inconsistent for the same event: the detail page points at the third-party seller (townscript.com), the lander ItemList points back at the Endorfin URL. Pick one convention.

### `SportsEvent` vs `Event` — not worth changing

`SportsEvent` is a valid subtype and marginally more precise, but Google treats all `Event` subtypes
identically for rich results. Zero downside, zero measurable upside. Do it opportunistically if
already editing these builders.

### Worth adding

- **`Place.geo`** (lat/long) is absent everywhere. Static per-city coordinates already exist for the landers; adding geo strengthens map and "near me" surfacing for a race directory.
- **`offers.validThrough`** (registration close) is present on only a minority of events. For a dated-inventory directory this is exactly the signal Google uses to decide whether to keep showing an Event rich result as the date approaches.
- **`FAQPage`** on landers helps AI Overviews and LLM citation, but note Google restricted FAQ rich results to a government/health allowlist in Aug 2023 — do not expect SERP FAQ snippets. The existing `FAQPage` on `/clubs/{slug}` is inert for Search for the same reason.

## Performance (field) — 25/100

The worst category, and the one the earlier lab-only draft most understated. Field data from
origin-level CrUX, 28-day window ending **2026-09-05**:

| Metric | Phone | Desktop | All | Verdict (phone) |
|---|---|---|---|---|
| **LCP** | **4,031 ms** | 2,706 ms | 3,884 ms | **POOR** |
| INP | 191 ms | 78 ms | 179 ms | Good |
| CLS | 0.01 | 0.02 | 0.01 | Good |
| TTFB | 865 ms | 559 ms | 850 ms | Needs work |
| FCP | 2,797 ms | 2,005 ms | 2,711 ms | Needs work |

Only 34% of phone visits land in the "good" LCP bucket; **25% are in the poor bucket**. Google's
poor threshold is 4,000 ms, so mobile sits just over the line.

**This has been true for months, not days.** CrUX History (phone, p75 LCP):

| Window ending | LCP | TTFB | INP |
|---|---|---|---|
| 2026-06-27 | 3,810 | — | 162 |
| 2026-07-11 | 3,905 | 781 | 174 |
| 2026-07-25 | 4,016 | 850 | 184 |
| 2026-08-08 | 3,951 | 884 | 185 |
| 2026-08-22 | 3,866 | 832 | 178 |
| 2026-08-29 | 3,828 | 796 | 179 |

LCP has been pinned between 3,800 and 4,030 ms since the domain first entered CrUX in late June —
oscillating across the poor boundary rather than trending anywhere. INP has crept up from 159 to
~180 ms over the same period: still good, worth watching.

### Correcting the lab reading

An earlier draft reported "LCP 1,258 ms — Good" from a local Chrome trace. That number was taken on
**unthrottled desktop with a warm cache** and is not representative. PageSpeed Insights on mobile
tells a very different story:

| URL | PSI mobile score | LCP | Total weight |
|---|---|---|---|
| `/running-events` | **54** | **35.2 s** | **166.8 MB** |
| `/running-events/10k-in/mumbai` | 85 | 4.2 s | 19.3 MB |

An LCP of 35.2 s on the hub is also why a real Chrome navigation to it exceeded a 10 s timeout
during this audit. CLS held at 0.006 in both runs, confirming the one genuinely good result.

(PSI repeatedly returned "Lighthouse returned error" for the homepage — retried three times. Not
diagnosed; the homepage is only 12.5 KB gzipped, so this is more likely a PSI-side failure than a
page defect.)

### C4 · Critical · 165.5 MB of images on one page

The hub's resource breakdown from PSI, mobile:

| Resource | Requests | Transfer |
|---|---|---|
| **Image** | **235** | **165.5 MB** |
| Document | 1 | 0.5 MB |
| Script | 21 | 0.5 MB |
| Font | 13 | 0.3 MB |
| Stylesheet | 2 | 0.1 MB |
| **Total** | **287** | **166.8 MB** |
| *of which third-party* | *238* | *165.7 MB* |

**99% of the page's weight is race cover images** — 235 requests averaging ~700 KB each, hotlinked
at full resolution from five third-party CDNs (`race-registration-cdn.indiarunning.com`,
`s3.ap-south-1.amazonaws.com/townscript-production`, `cdn.citywoofer.com`, `f003.backblazeb2.com`,
`mysamay-production-public.s3…`), every one served with **`Cache-Control` TTL 0**.

Worst single files, re-downloaded on every visit:

| Image | Size |
|---|---|
| `backblazeb2.com/.../26bdc35c….jpg` | 8.2 MB |
| `backblazeb2.com/.../496052aa….jpeg` | 4.2 MB |
| `backblazeb2.com/.../f2f65531….png` | 1.9 MB |
| `backblazeb2.com/.../5fd805d9….png` | 943 KB |
| `backblazeb2.com/.../d3e009ed….png` | 438 KB |

Endorfin's own images (`endorfin-media.shivam-8a5.workers.dev`) correctly cache for 86,400 s — the
gap is entirely third-party hotlinks. Note this dwarfs the 16.1 MB of "wasted cacheable bytes" the
earlier desktop trace reported; that figure was measured with a partly warm cache and understated
the cold-load reality by an order of magnitude.

PSI also flags **"reduce initial server response time — 928 ms"**, independently corroborating C1.

**Fix — one change carries almost the whole category:** proxy third-party covers through the
existing Cloudflare Worker or `next/image`, with resize and WebP/AVIF conversion. Serving ~40 KB
thumbnails instead of ~700 KB originals takes the page from 166.8 MB to roughly 5 MB. That single
change also delivers real cache headers, removes the Referer-based 403 from `indiarunning`'s
hotlink protection (worked around today with `referrerPolicy="no-referrer"`), and ends the
dependency on third-party CDN uptime.

The lander at 19.3 MB has the same root cause on a smaller list and gets fixed by the same change.

## AI Search Readiness — 65/100

Good posture: `llms.txt` exists, AI crawlers are explicitly allowed in `robots.txt` (GPTBot,
OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended), `max-snippet:-1` and
`max-image-preview:large` permit full snippet harvesting, and both content and JSON-LD are
server-rendered so non-JS crawlers see everything.

### H8 · High · `llms.txt` points almost entirely at redirects and dead ends

Of 36 URLs in the file: **20 return 308** (all the legacy `/races/*` prefix) and **4 are hard 404s**.

| Broken URL | Status |
|---|---|
| `/races/in/ahmedabad` | 308 → 404 |
| `/races/in/kolkata` | 308 → 404 |
| `/races/marathon-in/delhi` | 308 → 404 |
| `/run-clubs/thane` | 404 |

The three lander 404s are the quality gate working correctly — those cities lack inventory — but
`llms.txt` still advertises them. A file whose whole purpose is to hand AI crawlers a clean map is
currently handing them a redirect on every event link and four dead ends.

**Fix:** generate `llms.txt` from the same source as the sitemap so it cannot drift, and include the
`5k-in` / `ultra-in` scopes it never had.

### Citability

The landers are the citable assets — a specific question ("what 10Ks are in Mumbai?") answered with
a dated, priced list. Two things hold them back: the 60-word city paragraph is thin for extraction,
and the shared-paragraph problem (C6) means an AI crawler sees near-identical prose across a city's
scopes. Per-scope paragraphs fix retrieval quality and the doorway risk together.

---

## Images — 50/100

**Alt text is clean** — zero missing `alt` attributes across all six sampled page types. The 16
empty `alt=""` values on the hub and `/clubs` are decorative background layers and correctly empty.
`RaceCard` uses the race title as alt text, and its no-image fallback renders the title rather than
initials.

Everything else is the C4 story: raw `<img>` tags (`next/image` deliberately bypassed with an
eslint-disable), no `srcset`, no width/height attributes, no WebP/AVIF, third-party originals at
full print resolution. On the hub that totals **165.5 MB across 235 image requests** — 99% of the
page. CLS measures 0.01 in the field because CSS reserves the aspect ratio, so the missing
dimensions are not currently costing anything; the bytes are the whole problem.

Seven upcoming events have no image at all and fall back to the title tile.

---

## Appendix — what was measured

- 525 sitemap URLs parsed; 524 distinct; all 37 landers probed for status.
- 6 page types fetched and parsed for title/meta/canonical/robots/headings/images.
- 36 `llms.txt` URLs probed for redirect and final status.
- JSON-LD extracted and validated from 3 page types (14 blocks) against Google's Event requirements.
- Chrome performance trace of `/running-events` (LCP/CLS/cache/image insights).
- Response headers inspected on 5 routes.
- Database queried directly for event counts, description coverage, slug coverage, `event_type`
  distribution, and duplicate detection.
