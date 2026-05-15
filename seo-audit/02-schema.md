# Schema.org Structured Data Audit — endorfin.run

**Date:** 2026-05-15
**Scope:** Home, /races, /clubs, /races/[slug] (detail), /races/[scope]/[city] (city), /run-clubs/[city] (city), /clubs/[slug] (detail), /workout-plan
**Trigger:** Post-commit audit following GSC Event warning fix (commit 8fb8164 / context: organizer, performer, validFrom, validThrough, endDate, description fallbacks)

---

## 1. Inventory of Existing Schema (by page / source file)

| Page | Source File | Schema Type(s) |
|------|-------------|----------------|
| All pages (global) | `src/app/layout.tsx` | `Organization`, `WebSite`, `MobileApplication` |
| `/` (Home) | `src/app/page.tsx` | `ItemList` → `Event` (×6 upcoming events) |
| `/races` | `src/app/races/page.tsx` | `ItemList` → `Event` (up to 30 of all upcoming) |
| `/clubs` | `src/app/clubs/page.tsx` | `ItemList` → `SportsClub` (up to 30) |
| `/races/[slug]` (detail) | `src/app/races/[slug]/page.tsx` | `Event` |
| `/races/[scope]/[city]` | `src/app/races/[slug]/[city]/page.tsx` | `ItemList` → `Event`, `BreadcrumbList` |
| `/run-clubs/[city]` | `src/app/run-clubs/[city]/page.tsx` | `ItemList` → `SportsClub`, `BreadcrumbList` |
| `/clubs/[slug]` (detail) | `src/app/clubs/[slug]/page.tsx` | `SportsClub` |
| `/workout-plan` | `src/app/workout-plan/page.tsx` | `SoftwareApplication`, `FAQPage`, `BreadcrumbList` |

**Format:** All blocks are JSON-LD. All use `https://schema.org` as `@context`. No Microdata or RDFa detected anywhere.

---

## 2. Validation Results

### 2A. Global Layout — `Organization`, `WebSite`, `MobileApplication`

**Organization** — PASS with one warning

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Endorfin",
  "url": "https://www.endorfin.run",
  "logo": { "@type": "ImageObject", "url": "https://www.endorfin.run/logo.png", "width": 512, "height": 512 },
  "description": "India's running community app...",
  "contactPoint": { "@type": "ContactPoint", "email": "hello@endorfin.run", "contactType": "customer support", "areaServed": "IN", "availableLanguage": "English" },
  "sameAs": ["https://play.google.com/store/apps/details?id=com.endorfin.app", "https://twitter.com/endorfinapp"]
}
```

- [PASS] `@context` is `https://schema.org`
- [PASS] All required properties present (name, url)
- [PASS] logo uses `ImageObject` with width/height — correct for Google Knowledge Panel
- [WARN] `sameAs` is missing the iOS App Store URL (`https://apps.apple.com/app/endorfin/id6762107286`). The iOS link exists in the club detail CTA but not in the global Organization. Add it.
- [WARN] No `@id` set. Adding `"@id": "https://www.endorfin.run/#organization"` enables cross-referencing from Event `organizer` blocks.
- [INFO] No Instagram or social handle in `sameAs`. If there is an Instagram account, add it.

**WebSite** — FAIL (missing SearchAction)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Endorfin",
  "url": "https://www.endorfin.run",
  "description": "Discover 500+ running events across India...",
  "inLanguage": "en-IN"
}
```

- [PASS] `@context`, `@type`, `name`, `url` all correct
- [FAIL] Missing `potentialAction` / `SearchAction` — this is required for Google Sitelinks Search Box eligibility. See recommendation in Section 3.

**MobileApplication** — PASS with warnings

- [PASS] `@context`, `@type`, `applicationCategory`, `operatingSystem` all correct
- [WARN] `operatingSystem` is only `"Android"`. The iOS app exists (App Store link in club pages). Should be `"Android, iOS"`.
- [WARN] `aggregateRating.ratingCount` is hardcoded to `"120"` — this becomes stale. Consider driving it from an API call or removing it entirely (a stale count can trigger GSC manual action for inaccurate data).
- [INFO] `screenshot` points to the OG image, not an actual screenshot. Google prefers a real app screenshot for rich results. Consider adding dedicated screenshot URL(s).

---

### 2B. Home (`/`) — `ItemList` of Events

Validated against: [Google Event rich results spec](https://developers.google.com/search/docs/appearance/structured-data/event)

**Recent fix verification (commit 8fb8164):** CONFIRMED present on `/` via `src/app/page.tsx` `buildEventsJsonLd()`:

| Required/Recommended Field | Status | Notes |
|----------------------------|--------|-------|
| `name` | PASS | `event.title` |
| `startDate` | PASS | `event.startTime` (ISO 8601 from API) |
| `endDate` | PASS | `event.endTime \|\| event.startTime` (fallback to startDate — acceptable) |
| `location` (Place) | PASS | `name` + `PostalAddress` |
| `eventStatus` | PASS | Hardcoded `EventScheduled` |
| `eventAttendanceMode` | PASS | Hardcoded `OfflineEventAttendanceMode` |
| `description` | PASS | Generated fallback string — no blank descriptions |
| `organizer` | PASS | `{ "@type": "Organization", "name": "Endorfin" }` |
| `performer` | PASS | `{ "@type": "PerformingGroup", "name": "Race participants" }` |
| `offers.validFrom` | PASS | Derived as 90 days before deadline or startDate |
| `offers.validThrough` | PASS | `registrationEndDate` when present (conditionally added) |

**Warnings on `/`:**

- [WARN] `ItemList` wrapping Events: Google supports Event rich results from a list page but the **items must have their own canonical URL**. The `url` and `offers.url` for each event resolve to `https://api.endorfin.run/e/{id}` — this is the API subdomain, not the website. Google prefers the landing-page URL for rich-result attribution. Use `https://www.endorfin.run/races/{slug}` instead (same fix needed on `/races` — see 2C).
- [WARN] `location.address.addressLocality` is set to `event.locationName` which is a display string like "Nehru Stadium, Delhi", not a pure locality name. This will not fail validation but may reduce geocoding accuracy. A separate `addressLocality` field from the API would be cleaner.
- [INFO] `image` is conditionally present (only when `event.imageUrl` exists). Google recommends at least one image for Event rich results; events without an image will be ineligible.

---

### 2C. `/races` — `ItemList` of Events

The `/races` `buildJsonLd()` function is more complete than the Home version (has `organizerName`, `soldOut` awareness, `description` from API or fallback). Post-fix fields all confirmed present.

**Additional issues:**

- [FAIL] `url` and `offers.url` are `https://endorfin.run/e/{slug}` — missing `www.` and pointing at the canonical `www.endorfin.run` domain. Use `https://www.endorfin.run/races/${r.slug || r.id}` consistently. This is the same URL mismatch that can cause GSC to attribute rich results to the wrong property.
- [WARN] `numberOfItems` is set to `races.length` (all races fetched), but `itemListElement` is sliced to 30. These two values will disagree when there are more than 30 races. Set `numberOfItems: Math.min(races.length, 30)` or unslice.
- [WARN] `eventAttendanceMode` is only `OnlineEventAttendanceMode` for `eventType === 'virtual'` — all others hardcoded to `Offline`. This is correct behaviour but worth verifying the API surface for hybrid events.

---

### 2D. `/clubs` — `ItemList` of SportsClub

- [PASS] `SportsClub` is a valid subtype of `LocalBusiness` and is supported by Google.
- [PASS] `sport: "Running"` is a valid string value.
- [PASS] `address`, `url`, `foundingDate`, `logo`, `image` all conditional and correct.
- [WARN] Same `numberOfItems` vs slice(0,30) mismatch as `/races`. Fix: use `Math.min(clubs.length, 30)`.
- [INFO] No `BreadcrumbList` on `/clubs`. Add one (see recommendations in Section 3).

---

### 2E. `/races/[slug]` (Race Detail) — `Event`

This is the primary target of the GSC fix. Full field audit:

| Field | Status | Notes |
|-------|--------|-------|
| `name` | PASS | `event.title` |
| `startDate` | PASS | `event.startTime` |
| `endDate` | PASS | `event.endTime \|\| event.startTime` |
| `eventStatus` | PASS | `EventScheduled` hardcoded |
| `eventAttendanceMode` | PASS | virtual-aware |
| `location` | PASS | `venueName` preferred, fallback to `locationName`; `streetAddress` from `locationAddress` when present |
| `description` | PASS | `event.description \|\| event.fullDescription \|\| generated fallback` |
| `organizer` | PASS | `organizerName \|\| 'Endorfin'` |
| `performer` | PASS | `PerformingGroup` — "Race participants" |
| `offers.validFrom` | PASS | 90-day heuristic |
| `offers.validThrough` | PASS | `registrationEndDate` when present |
| `offers.url` | PASS | Uses `registrationUrl \|\| canonical race URL` — correct |
| `image` | CONDITIONAL | Present only when `event.imageUrl` exists |
| `url` | PASS | Absolute `https://www.endorfin.run/races/...` |

- [PASS] All GSC-warned fields confirmed present after fix.
- [WARN] `organizer` is a flat `{ "@type": "Organization", "name": "..." }` object. For GSC accuracy, adding `"@id": "https://www.endorfin.run/#organization"` on the global Organization and referencing it here via `"organizer": { "@id": "https://www.endorfin.run/#organization" }` would link the Event to the known entity.
- [INFO] No `BreadcrumbList` on the detail page (noted in RaceDetailView.tsx: "Crumb removed on detail page" comment). Breadcrumb was intentionally removed from visible UI. Re-adding only the JSON-LD block (invisible to users) is advisable for GSC navigation signals.

---

### 2F. `/races/[scope]/[city]` — `ItemList` + `BreadcrumbList`

- [PASS] `BreadcrumbList` present with 3 levels: Home > Races > Scope+City.
- [PASS] All `item` values in BreadcrumbList are absolute URLs.
- [PASS] Event fields match `/races` quality (organizer, performer, description, offers).
- [WARN] Same `numberOfItems` vs slice(30) mismatch — fix as above.
- [WARN] `eventAttendanceMode` is hardcoded to `OfflineEventAttendanceMode` for all events — no virtual check here (unlike `/races`). Add the same virtual-aware ternary.

---

### 2G. `/run-clubs/[city]` — `ItemList` + `BreadcrumbList`

- [PASS] `BreadcrumbList` with 3 levels: Home > Clubs > City. Correct.
- [PASS] `SportsClub` items have `addressRegion` populated (more precise than /clubs list).
- [WARN] Same `numberOfItems` vs slice(30) mismatch.
- [INFO] No BreadcrumbList on the parallel `/clubs` listing page.

---

### 2H. `/clubs/[slug]` (Club Detail) — `SportsClub`

- [PASS] `@context`, `@type`, `name`, `url`, `sport`, `address` all present.
- [PASS] `sameAs` built from Instagram, Strava, WhatsApp social links.
- [WARN] `numberOfEmployees` is used to represent member count. This is a creative but technically incorrect use — `numberOfEmployees` is for paid employees. No standard Schema.org property exists for "members of a sports club", but `memberOf` / a custom extension would be cleaner. For Google's purposes this is low-priority since `numberOfEmployees` won't trigger a rich result type on its own.
- [INFO] Club detail has no `BreadcrumbList` JSON-LD. Add Home > Clubs > [Club Name].

---

### 2I. `/workout-plan` — `SoftwareApplication`, `FAQPage`, `BreadcrumbList`

- [PASS] All three block types present.
- [PASS] `BreadcrumbList` with 2 levels: Home > Workout Plan. Correct.
- [PASS] `FAQPage` structure is valid (`mainEntity` array, each `Question` with `acceptedAnswer`).
- [INFO] **FAQPage — commercial site restriction:** Google restricted FAQ rich results to government and health sites in August 2023. This page will NOT get FAQ rich-result snippets in SERPs. However, FAQPage schema still benefits AI/LLM citation systems (ChatGPT, Perplexity, Google SGE) — retain it for GEO (Generative Engine Optimisation) value.
- [WARN] `SoftwareApplication.operatingSystem` is `"Android"` only. The iOS App Store link exists elsewhere on the site. Change to `"Android, iOS"`.
- [WARN] `offers.availability` is `PreOrder` — valid for a waitlist, but once the product launches this must be updated to `InStock`.

---

## 3. Missing Schema Opportunities

### 3A. WebSite SearchAction (HIGH PRIORITY — Sitelinks Search Box)

The global `WebSite` block is missing `potentialAction`. Adding a `SearchAction` makes the site eligible for Google's Sitelinks Search Box.

**Add to `websiteJsonLd` in `src/app/layout.tsx`:**

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Endorfin",
  "url": "https://www.endorfin.run",
  "description": "Discover 500+ running events across India. Find marathons, half marathons, 10K and 5K races near you.",
  "inLanguage": "en-IN",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.endorfin.run/races?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

> Note: The `urlTemplate` should resolve to a functional search results page. If `/races?q=` does not currently filter results, either implement client-side query filtering first, or hold off until it does — Google validates the endpoint.

---

### 3B. BreadcrumbList on `/races` (MEDIUM PRIORITY)

No breadcrumb on the `/races` listing page. Add:

**In `src/app/races/page.tsx` `buildJsonLd()`, append a second block:**

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.endorfin.run/" },
    { "@type": "ListItem", "position": 2, "name": "Races", "item": "https://www.endorfin.run/races" }
  ]
}
```

Emit as an array: `return [itemList, breadcrumb]` (same pattern used in city pages).

---

### 3C. BreadcrumbList on `/clubs` (MEDIUM PRIORITY)

**In `src/app/clubs/page.tsx` `buildJsonLd()`, append:**

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.endorfin.run/" },
    { "@type": "ListItem", "position": 2, "name": "Clubs", "item": "https://www.endorfin.run/clubs" }
  ]
}
```

---

### 3D. BreadcrumbList on `/clubs/[slug]` (MEDIUM PRIORITY)

**In `ClubJsonLd()` function in `src/app/clubs/[slug]/page.tsx`, add a second `<script>` block alongside the existing SportsClub one:**

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.endorfin.run/" },
    { "@type": "ListItem", "position": 2, "name": "Clubs", "item": "https://www.endorfin.run/clubs" },
    { "@type": "ListItem", "position": 3, "name": "[club.name]", "item": "https://www.endorfin.run/clubs/[club.slug]" }
  ]
}
```

Use the real `club.name` and `club.slug` values — this is a server component so the data is available.

---

### 3E. BreadcrumbList on `/races/[slug]` (MEDIUM PRIORITY)

The comment in `RaceDetailView.tsx` confirms the visible breadcrumb was removed intentionally. The JSON-LD version (invisible to users) should still be emitted. **Add to `buildJsonLd()` in `src/app/races/[slug]/page.tsx`:**

Return an array `[eventBlock, breadcrumbBlock]`:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.endorfin.run/" },
    { "@type": "ListItem", "position": 2, "name": "Races", "item": "https://www.endorfin.run/races" },
    { "@type": "ListItem", "position": 3, "name": "[event.title]", "item": "https://www.endorfin.run/races/[event.slug || event.id]" }
  ]
}
```

---

### 3F. Organization `@id` + Cross-reference in Events (LOW PRIORITY)

To enable Google's entity graph to associate events with the known Organization:

**In `layout.tsx` `orgJsonLd`:**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.endorfin.run/#organization",
  "name": "Endorfin",
  ...
}
```

**In every Event block where `organizer` is `"Endorfin"` (not a third-party name):**

```json
"organizer": {
  "@type": "Organization",
  "@id": "https://www.endorfin.run/#organization",
  "name": "Endorfin"
}
```

This applies to the fallback case in all four Event-emitting pages. When `r.organizerName` is a third-party name, omit `@id`.

---

### 3G. FAQPage — Not Recommended for New Commercial Pages

The `/workout-plan` FAQPage is already present — retain it for AI/LLM discoverability (GEO value). Do not add `FAQPage` to other commercial pages (e.g., `/races`, `/clubs`) because Google will not display FAQ rich results for commercial sites and the added markup weight is not justified by Google SERP benefit alone.

---

### 3H. Organization `sameAs` — Add iOS App Store

**In `layout.tsx` `orgJsonLd.sameAs`:**

```json
"sameAs": [
  "https://play.google.com/store/apps/details?id=com.endorfin.app",
  "https://apps.apple.com/app/endorfin/id6762107286",
  "https://twitter.com/endorfinapp"
]
```

---

## 4. URL Consistency Bugs

Two URL patterns produce `https://endorfin.run/e/{id}` (missing `www.`) on `/` and `https://endorfin.run/e/{slug}` on `/races`. These should be the canonical race detail pages, not API-subdomain links.

| Location | Current Value | Correct Value |
|----------|---------------|---------------|
| `src/app/page.tsx` Event `url` + `offers.url` | `https://api.endorfin.run/e/{id}` | `https://www.endorfin.run/races/{id}` |
| `src/app/races/page.tsx` Event `url` + `offers.url` | `https://endorfin.run/e/{slug \|\| id}` | `https://www.endorfin.run/races/{slug \|\| id}` |

The city pages (`/races/[scope]/[city]`) already use `${SITE}/races/${r.slug || r.id}` correctly.

---

## 5. Priority Matrix

| # | Issue | Page(s) | Priority | Type |
|---|-------|---------|----------|------|
| 1 | Event `url`/`offers.url` pointing to API subdomain | `/`, `/races` | Critical | Bug |
| 2 | WebSite missing SearchAction | Global | High | Opportunity |
| 3 | `numberOfItems` vs slice(30) mismatch | `/races`, `/clubs`, city pages | Medium | Warning |
| 4 | BreadcrumbList missing | `/races`, `/clubs`, `/races/[slug]`, `/clubs/[slug]` | Medium | Opportunity |
| 5 | `MobileApplication.operatingSystem` missing iOS | Global | Medium | Warning |
| 6 | `eventAttendanceMode` not virtual-aware in city page | `/races/[scope]/[city]` | Medium | Bug |
| 7 | `MobileApplication.aggregateRating.ratingCount` hardcoded | Global | Low | Warning |
| 8 | Organization `@id` for cross-referencing | Global | Low | Enhancement |
| 9 | Organization `sameAs` missing iOS App Store | Global | Low | Enhancement |
| 10 | FAQPage on `/workout-plan` — no Google rich result (retain for GEO) | `/workout-plan` | Info | Note |
| 11 | Club detail `numberOfEmployees` semantically incorrect for members | `/clubs/[slug]` | Info | Note |

---

## 6. GSC Fix Verification Summary

The following fields added in the recent Event schema fix are **confirmed present** across all four Event-emitting pages (Home, /races, /races/[slug], /races/[scope]/[city]):

- `organizer` — present with `organizerName` fallback to `"Endorfin"`
- `performer` — present as `PerformingGroup` "Race participants"
- `description` — present with API value or generated fallback (no empty strings)
- `endDate` — present with `endTime || startTime` fallback
- `offers.validFrom` — present (90-day heuristic from deadline or startDate)
- `offers.validThrough` — conditionally present when `registrationEndDate` exists

The GSC warnings should clear within the next crawl cycle (typically 1–4 weeks after reindexing).
