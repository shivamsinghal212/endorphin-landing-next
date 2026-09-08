# Endorfin SEO Action Plan

**Generated:** 2026-09-07
**Companion to:** [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md)
**Score:** 58/100 (was 59 on 2026-05-15) · field-data enriched

Sequenced by return on effort. Tier 0 is a five-minute deletion that removes a sitewide penalty
risk. Tier 1 is real crawl-facing defects; Tier 2 is where the ranking upside actually is.

---

## Tier 0 — Today

### 0. Delete the fabricated `aggregateRating`
**Fixes:** C5 · **Effort:** XS · **Impact:** Critical

`src/app/layout.tsx:71` asserts 4.8★ from 120 ratings inside the `MobileApplication` block on every
page. Nothing on any page displays a rating — verified by stripping all scripts and styles and
finding zero occurrences of `4.8`, `120`, `rating`, `review` or `★` in visible text.

Google's spam policies name invisible, self-declared rating markup specifically, and a manual action
is not scoped to the block — it can strip rich results across the domain. Highest risk-to-effort
ratio in the audit: delete the four lines.

If you want the stars as a real asset, fetch the live Play/App Store rating and render a visible
widget to match. Until then the markup is a liability.

---

## Tier 1 — This week

### 1. Stop reading cookies in the server-rendered header
**Fixes:** C1 · **Effort:** M · **Impact:** Critical

`src/components/Header.tsx` calls `getSessionToken()` → `cookies()` and renders on every public
page, forcing the entire site into dynamic rendering. Consequences: no CDN caching anywhere,
`revalidate = 600` on the landers is inert, `generateStaticParams()` never prerenders, and every
crawl hit pays a full SSR plus the event API fan-out.

Resolve signed-in state client-side after hydration, or isolate it in a `<Suspense>` boundary so the
static shell stays cacheable. Verify with `curl -I`: the landers should stop saying
`private, no-store` and start returning a `HIT` on second request.

This is the single highest-leverage change in the audit — it is also what makes items 2 and 5 pay off.

### 2. Pass a slim projection into `ClubsView`
**Fixes:** C2, C3 · **Effort:** S · **Impact:** Critical

`/running-events` ships 3.8 MB of HTML, 84% of it an RSC payload of 243 full event objects
serialized for hydration. `RaceCard` needs only `id`, `slug`, `title`, `imageUrl`, `startTime`,
`locationName`, `priceMin`, `distanceCategories`.

Map to those fields before passing to the client component; keep the full array in the server
component for the JSON-LD. Because RSC payloads are JSON-escaped into HTML, every byte saved counts
roughly double. Expect ~80% off the page weight.

This also removes the scraped Instagram usernames, comment text and signed profile-photo URLs (C3)
that are currently in public HTML on a page that renders none of it.

### 3. Proxy third-party race covers — **do this first of the three**
**Fixes:** C4, plus the image-optimisation half of Images · **Effort:** M · **Impact:** Critical

Field data promoted this above items 1 and 2. The hub loads **165.5 MB of images across 235
requests** — 99% of its 166.8 MB weight — all hotlinked from five third-party CDNs at
`Cache-Control` TTL 0, averaging ~700 KB each, largest 8.2 MB. Result: PSI mobile LCP **35.2 s**,
score 54, and a real-user mobile LCP of **4,031 ms (POOR)** that has not moved since June.

Route them through the existing Cloudflare Worker or `next/image` with resize + WebP/AVIF. Serving
~40 KB thumbnails takes the page from 166.8 MB to roughly 5 MB — the single largest win available
anywhere in this audit.

Also buys: real cache headers, permanent removal of the `indiarunning` Referer-403 problem currently
patched with `referrerPolicy="no-referrer"`, and independence from third-party CDN uptime. The
19.3 MB lander has the same cause and is fixed by the same change.

### 4. Regenerate `llms.txt`
**Fixes:** H8 · **Effort:** S · **Impact:** High

20 of 36 URLs are 308s on the retired `/races/*` prefix; 4 are hard 404s
(`/races/in/ahmedabad`, `/races/in/kolkata`, `/races/marathon-in/delhi`, `/run-clubs/thane`).

Generate it from the same source as `sitemap.ts` so it cannot drift again, and include the `5k-in`
and `ultra-in` scopes it never had.

### 4b. Fix the Event schema errors
**Fixes:** H5, H6 · **Effort:** S · **Impact:** High

Two hard validation problems, both small edits:

- **25 events ship `endDate` before `startDate`** (of 208 with an end time). `endTime` is being fed from the race's reporting/gate time, which precedes the start. Fix the ingest; guard the serialiser meanwhile with `endDate: r.endTime && r.endTime > r.startTime ? r.endTime : r.startTime`.
- **Virtual events are labelled in-person.** The JSON-LD builders test `eventType === 'virtual'`, but the authoritative column is `eventFormat` — so `/running-events/the-great-himalaya-day-2026-virtual-marathon-cyclothon` is live right now with `OfflineEventAttendanceMode` and "Virtual · run anywhere" inside a `PostalAddress`. Switch both builders to `eventFormat`, add the conditional to the lander (`[slug]/[city]/page.tsx:148` currently hardcodes Offline), and emit `VirtualLocation` for the online branch.

Also reconcile the two columns upstream: 37 rows have `event_type = 'virtual'` while
`event_format = 'in_person'`. One of them is lying.

### 5. Dedupe the sitemap
**Fixes:** M1 · **Effort:** S · **Impact:** Medium

`/running-events/wesnesswomens5kfunrunpune2026-36977` is emitted twice (525 entries, 524 distinct)
though the DB holds one row. The race loop in `src/app/sitemap.ts` (~line 183) has no dedupe and
`fetchAllRaces()` paginates sequentially. Dedupe by `race.id`.

While in the file, fix `lastmod` (M3): **243 event entries carry a future date** because
`sitemap.ts:187` uses `new Date(race.startTime)` — the race date, not the page's modified date.
Google ignores future `lastmod` values and can learn to distrust the field domain-wide. Use a real
content-modified timestamp or omit it for event pages.

The 243-vs-252 count gap is **resolved and not a bug**: the live API feed returns exactly 243 and
excludes virtual events, so the sitemap faithfully mirrors it. Do decide deliberately whether the 4
virtual events belong in the sitemap — they have live indexable detail pages but no sitemap entry
and no list-page link, so they are effectively orphaned.

### 6. Drop the stale "Experiences" copy
**Fixes:** M4 · **Effort:** S · **Impact:** Medium

The `/clubs` H1 reads "Run Clubs & Experiences in India" in both `ClubsView.tsx:1862` and
`ClubsExperiencesSkeleton.tsx:143`. The concept is retired and the route 308s away. Retarget to
run clubs and club events.

---

## Tier 2 — This month (the ranking upside)

### 7. Give every lander its own paragraph, and raise the floor
**Fixes:** C6 · **Effort:** L · **Impact:** Critical

The largest ranking opportunity and the largest risk, in the same place. The reuse is
byte-identical, not merely similar: one `intro` string per city, rendered verbatim on up to six
self-canonicalising URLs at near-equal sitemap priority. `/marathon-in/mumbai` is two race cards
plus a paragraph five siblings also use.

- Change `intro: string` to a per-scope map; write 2–3 sentences per `(city, scope)`. Only ~30 combinations render, and the research already exists in the current intros — it needs splitting by distance, not redoing.
- Raise `minCount` for distance-specific scopes from 2 to 4–5 in `RACE_SCOPE_META`.
- Optional, cheap: inject a computed fact line from `races`, already in scope at render time.

Do **not** canonicalise narrow scopes up to `/in/{city}` — that discards the "marathon in mumbai"
query, which is the point of the cluster. Do this before adding more cities or distances.

### 8. Fix thin event detail pages
**Fixes:** H3 · **Effort:** M · **Impact:** High

35 of 252 upcoming events have no description; 42 are under 150 characters. Descriptions are
otherwise unique, so this is missing content, not duplicate content.

Either compose real on-page copy from fields already stored (distances, category start times,
route, organiser, price tiers) or gate detail pages on having real copy, the way landers are gated.

### 9. Slugs for every event, with UUID redirects
**Fixes:** H1, and the root cause of M10 · **Effort:** M · **Impact:** High

40 of 243 event URLs are raw UUIDs. Worse, if a slug is assigned later `eventPath()` switches to it
with no redirect, orphaning the indexed URL.

Generate slugs at ingest; keep `/running-events/{uuid}` permanently redirecting to the slug. This
also addresses the seven duplicate event records (M3), which are all slug/UUID pairs from the same
ingest gap — dedupe on (normalised title, date, city) and 301 the loser.

### 10. Build the club-events ItemList through the race helper
**Fixes:** H7, M8, M9 · **Effort:** S · **Impact:** Medium

All 28 club Events on `/running-events` are missing `description`, `offers`, `eventStatus`,
`eventAttendanceMode` and `performer`; 17 lack `endDate`, 12 lack `organizer`. The race list on the
same page is clean — reuse its builder.

Same pass: add `addressRegion` to the hub's race addresses (the landers already do it), and make
`numberOfItems` agree with the 30 items actually emitted.

### 11. Add a `5k-in` footer column
**Fixes:** M5 · **Effort:** S · **Impact:** Medium

8 cities qualify — more than `marathon-in`'s 5 — but it is the only distance scope with no footer
column, leaving those landers at crawl depth 3. `ultra-in` is correctly suppressed at 1 city.

### 12. `og:image` for the hub and landers
**Fixes:** M6 · **Effort:** S · **Impact:** Medium

`/running-events` has `twitter:image` but no `og:image`; the 37 landers have neither. A generated
OG image per lander ("10K runs in Mumbai · 26 events") is a cheap `opengraph-image.tsx` away —
the pattern already exists under `src/app/clubs/`.

---

## Tier 3 — Backlog

| # | Item | Fixes | Effort |
|---|---|---|---|
| 13 | Add a Content-Security-Policy (every other security header is already correct) | H2 | M |
| 14 | Provenance + "last verified" on event pages; state how listings are collected; named editorial owner for city pages | E-E-A-T | M |
| 15 | `FAQPage` schema on landers — realistic rich-result surface for "when is X / what does Y cost" | Schema | M |
| 16 | Guard the landers' hardcoded `OfflineEventAttendanceMode` (correct today only because both upcoming virtual events have `location_name = 'Anywhere'`) | Schema | S |
| 17 | `Offer.availability` transition once registration closes, so SERP prices stop advertising sold-out entry | Schema | M |
| 18 | `SportsClub.event` is a `QuantitativeValue` (`clubs/[slug]/page.tsx:378`) — invalid typing; rename to `runsHosted` or drop | Schema | S |
| 19 | Strip Markdown from `description` before serialising into JSON-LD (literal `##`/`**` reach snippets) | Schema | S |
| 20 | Pick one `offers.url` convention — detail pages point at the third-party seller, landers at Endorfin | Schema | S |
| 21 | Add `Place.geo` per city; broaden `offers.validThrough` | Schema | M |
| 22 | Consolidate the two Event serialisers — same event gets different address granularity on detail vs lander | Schema | M |
| 23 | Rotate or drop the repeated closing sentence in `event-seo.ts:94-96` | Content | S |
| 24 | Explicit `robots: { index: false }` on the not-found event route (two conflicting robots metas today) | Technical | S |
| 25 | Remove the ~60 dead `v1r-*` CSS rules orphaned by deleting `RacesView` | Hygiene | S |
| 26 | Drop unnecessary legacy-JS transpilation (52.9 KB per Lighthouse) | Perf | S |
| 27 | Single `<h1>` in raw HTML on `/clubs` — the skeleton and real heading both ship (Googlebot renders JS and sees one) | On-page | S |

---

## Explicitly not worth doing

- **`SportsEvent` instead of `Event`.** No rich-result eligibility difference, no SERP feature gain. Do it only if already editing those builders for item 4b.
- **`FAQPage` for SERP snippets.** Google restricted FAQ rich results to a government/health allowlist in Aug 2023. Worth adding for AI Overviews and LLM citation (item 15), not for stars in Search. The existing `FAQPage` on `/clubs/{slug}` is already inert for the same reason.
- **`hreflang`.** India-only, single locale. Intentional gap, not an oversight.
- **Consolidating the three `ItemList` blocks on `/running-events`.** Valid as-is; Google handles sibling lists of distinct types.
- **Chasing CLS.** Measured 0.00. The missing `width`/`height` on `RaceCard` images cost nothing because CSS reserves the aspect ratio.

---

## Verification checklist

After Tier 1:

```bash
# 1. Caching actually works
curl -sI https://www.endorfin.run/running-events/10k-in/mumbai | grep -iE 'cache-control|x-vercel-cache'
#    expect: s-maxage/stale-while-revalidate, and HIT on a second call

# 2. Hub page weight
curl -s https://www.endorfin.run/running-events | wc -c      # target < 800KB, was 3,836,737
curl -s https://www.endorfin.run/running-events | grep -c cdninstagram   # target 0, was 758

# 3. llms.txt is clean
for u in $(grep -o 'https://www.endorfin.run[^)]*' llms.txt | sort -u); do
  curl -s -o /dev/null -w "%{http_code} $u\n" "$u"; done | grep -v '^200'   # target: no output

# 4. Sitemap has no duplicates, and no future-dated lastmod
curl -s https://www.endorfin.run/sitemap.xml | grep -o '<loc>[^<]*' | sort | uniq -d   # target: no output
curl -s https://www.endorfin.run/sitemap.xml | grep -o '<lastmod>[^<]*' | sed 's/<lastmod>//' \
  | cut -c1-10 | awk -v t="$(date +%F)" '$1>t' | wc -l                                 # target 0, was 243

# 5. No fabricated rating, and virtual events labelled correctly
curl -s https://www.endorfin.run/ | grep -c aggregateRating                            # target 0
curl -s https://www.endorfin.run/running-events/the-great-himalaya-day-2026-virtual-marathon-cyclothon \
  | grep -o 'OnlineEventAttendanceMode\|OfflineEventAttendanceMode' | head -1          # target Online
```

No GSC/GA4 access in this environment, so indexation and query impact cannot be measured from here —
worth checking Search Console directly for Coverage changes on the 37 landers and the 40 UUID URLs
after items 5 and 9 ship.
