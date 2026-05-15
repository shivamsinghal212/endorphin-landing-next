# Content Quality & E-E-A-T Audit — endorfin.run
**Date:** 2026-05-15  
**Auditor role:** Content Quality Specialist (Google Sept 2025 QRG)  
**Methodology:** Full source-code analysis of all page templates, data files, and component copy. Live page fetching was not available; all word counts and duplication ratios are derived from rendered-content analysis of TSX source.

---

## Overall Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Content quality (0–100) | **58 / 100** | Pulled down heavily by city page duplication |
| E-E-A-T aggregate | **52 / 100** | No author signals; trust signals thin |
| AI citation readiness | **42 / 100** | Intros are quotable; listings are not |

---

## 1. E-E-A-T Breakdown

### Experience (20% weight) — Score: 38 / 100

**What is present:**
- Live, real-time race and club data from a functioning API. The "going count," ticket sales numbers, and upcoming-run schedules are genuine first-hand data signals rather than editorial claims.
- The Kip AI coach mock conversation (`MeetKip.tsx`) demonstrates product experience but is marketing copy, not lived experience.
- Club detail pages expose recap data (showedUp, paceGroups, after, photos) when populated by organizers — this is strong first-hand experience content *per club*, but it is organizer-submitted, not editorial.

**What is missing:**
- No author bylines anywhere in the codebase. Zero `.author`, `.byline`, or equivalent fields in any page template.
- No editorial content like race reports, training guides, or city running guides written from personal experience.
- The homepage's "Est. 2025 · Made in India" kicker is the only provenance signal on the whole site.
- City landing pages have a single `intro` field (written copy, ~60–110 words per city) that references specific landmarks and clubs. This is a meaningful experience signal — the writing demonstrates local knowledge — but it is the *only* editorial content on those pages.

### Expertise (25% weight) — Score: 50 / 100

**What is present:**
- Structured distance-category logic (`race-city-pages.ts`) correctly distinguishes marathons from half-marathons using standard race codes (FM, 42K, HM, 21K), demonstrating domain accuracy.
- ACWR (Acute-to-Chronic Workload Ratio) is correctly named in Kip's feature chips — a legitimate sports science term, signals domain expertise.
- The club-detail Stats section exposes "runsThisMonth," "kmThisMonth," "yearsRunning" — appropriate metrics for a running community.
- Race detail pages render distance categories, flag-off times, registration deadlines, and sourcing attribution — accurate, structured, domain-appropriate.

**What is missing:**
- No coach, trainer, or sports-medicine credentials anywhere. The "Coaches" section is marked "Soon."
- No FAQ, glossary, or educational content. A search for what a 10K or half marathon entails would find no answer here.
- The `description` field on race detail pages falls back to `"Register for [title] on Endorfin."` — a generic stub that contributes zero expertise signal for races with empty descriptions.

### Authoritativeness (25% weight) — Score: 48 / 100

**What is present:**
- Named landmark races (Tata Mumbai Marathon, Airtel Delhi Half Marathon, TCS World 10K, Adani Ahmedabad Marathon) cited by their correct full names in city intro copy — demonstrates recognition of the authority sources in the space.
- The clubs directory carries "Verified" status (`isVerified` flag + SVG tick), which is a trust/authority signal to users.
- Schema.org `SportsClub` and `Event` markup with `foundingDate`, `sameAs` social links, and organizer attribution present on club/race detail pages.

**What is missing:**
- No inbound citation strategy. The site does not link to or reference any external authoritative source (Athletics Federation, AIMS certification, etc.).
- No press mentions, media coverage, or "As seen in" section.
- No social proof aggregated at the site level (e.g., "X runners have RSVPed via Endorfin" is not surfaced publicly).

### Trustworthiness (30% weight) — Score: 64 / 100

**What is present:**
- Privacy policy (`/privacy`) and Terms (`/terms`) pages exist.
- Contact/support page exists (`/support`).
- HTTPS assumed (standard for Next.js/Vercel deployment).
- Race prices shown in INR with explicit currency labeling.
- Sold-out status surfaced in both UI and `schema.org/SoldOut` markup.
- Club "requires approval" flag surfaced honestly in the join flow — not burying friction.
- ISR revalidation strategy (600s for race city pages, 3600s for club city pages) means content stays reasonably fresh without stale-data trust issues.

**What is missing:**
- No About page or "Who we are" content surfaced in the codebase.
- The homepage `page.tsx` has no organizational identity content — only the `HeroSection` kicker "Est. 2025 · Made in India."
- No physical address or company registration details visible.
- Registration URLs link to third-party systems without disclosure language.

---

## 2. Word Count Analysis by Page Type

All counts are rendered-text estimates from JSX source, excluding nav, footer boilerplate, and aria-hidden ribbons.

| Page | Template words (non-data) | Data-driven words | Total est. | Minimum threshold | Status |
|------|---------------------------|-------------------|------------|-------------------|--------|
| Homepage (`/`) | ~230 | 0 | ~230 | 500 | **FAIL** |
| /races listing | ~90 | Dynamic (race cards) | ~90 + cards | 800 | **FAIL** (copy-only) |
| /clubs listing | ~260 | Dynamic (club cards + admin panel) | ~260 + cards | 800 | **MARGINAL** |
| /run-clubs/[city] | 65–110 (intro) + card labels | Dynamic | ~200–350 | 500–600 | **FAIL** |
| /races/[scope]/[city] | 65–100 (intro) + card labels | Dynamic | ~200–300 | 500–600 | **FAIL** |
| /clubs/[slug] detail | 0 template + club description | Full dynamic | Varies | 300+ | DEPENDS on organizer copy |
| /races/[slug] detail | 0 template + race description | Full dynamic | Varies | 300+ | DEPENDS on organizer copy |

**Critical finding:** Both city page types fail the topical coverage floor. The intro paragraph is the *only* unique editorial text. Everything else is cards (name, city label, date, price) — structured UI data, not indexable prose.

---

## 3. Template Duplication Analysis — The Core Risk

### /run-clubs/[city] — 10 pages (Mumbai, Bengaluru, Delhi, Gurgaon, Noida, Pune, Hyderabad, Chennai, Kolkata, Ahmedabad)

**Shared structure (100% identical across all pages):**
- H1: `Run clubs in [CITY].` — only city name differs
- H2: `Every run club in [CITY]` — only city name differs
- H2: `Run clubs in other cities` — identical
- Breadcrumb: `All clubs · [CITY]` — only city name differs
- Stat labels: "Clubs" / "Region" — identical
- Cross-link list: varies by city count, but label pattern identical
- Meta title pattern: `Run clubs in [CITY] — every crew, listed | Endorfin`
- Meta description template: `Find a run club in [CITY]. A verified directory of morning crews, marathon training groups, and weekend trail collectives across [CITY]. RSVP to the next club run with Endorfin.` — only city name differs

**Unique per page (source of differentiation):**
- `page.intro` — a bespoke 60–110-word paragraph written specifically for each city. These are genuinely different and demonstrate local knowledge (specific park names, race names, neighborhood references).
- `page.landmarks` array — stored but NOT rendered on the page (used only internally). This is a missed opportunity.
- The club cards themselves — club names, logos, tags, and member counts differ by city.

**Duplication ratio (template vs. unique text):**
Rendered template chrome = ~150 words (headings, labels, breadcrumb, CTA copy, cross-links).  
Unique intro = ~80 words average.  
Club cards text contribution = ~30–60 words per card (name + city + tags + member count).  
Assuming 4 clubs shown: ~180–240 words from cards.

Total unique non-template prose = **~80 words** (the intro only).  
Total page text = **~410–490 words** estimated.  
**Unique differentiation ratio: ~17–20%** — the bulk of the page is identical chrome.

### /races/[scope]/[city] — Up to 50 pages (10 cities × 5 scopes)

**Shared structure (100% identical across all pages):**
- H1: `[SCOPE_NOUN] in [CITY].` — two variables differ
- H2: `Upcoming [scope_noun] in [CITY].` — two variables differ
- Breadcrumb: `All races · [SCOPE_NOUN] in [CITY]`
- Cross-link chips: "Other distances" / "Other cities" — label patterns identical
- Meta title: `[SCOPE_NOUN] in [CITY] — every race, listed | Endorfin`
- Meta description: `Find every upcoming [keyword] in [CITY]. Dates, distances, entry fees, and one-tap RSVP. Endorfin lists [noun] in [CITY] for runners across India.` — formula with two slots

**Unique per page:**
- `page.intro` — 55–90 words, genuinely city-specific (names TMM, Airtel Delhi HM, Vedanta Delhi HM, TCS World 10K, etc. in the appropriate city intro). Well-written and differentiated.
- Race cards — differ by city/scope filter. This is the strongest differentiator: a `/races/marathon-in/mumbai` page and `/races/marathon-in/bengaluru` page will show completely different race listings.

**Duplication ratio:**
Rendered template chrome = ~120 words.  
Unique intro = ~70 words average.  
Race cards text = ~25–40 words per card × N cards (N varies by quality gate).  

For a thin-scope page with only 2 races (minimum gate): 2 × ~30 = ~60 words from cards.  
Total ~250 words — well below the 500-word location page floor.  
**Unique intro is ~70/250 = 28% of page text** on minimal-gate pages.

### Cross-Scope Duplication (Worst Case)

Compare `/races/in/mumbai` vs `/races/marathon-in/mumbai`:
- H1 differs: "Running races in Mumbai." vs "Marathons in Mumbai."
- Intro text is **the same Mumbai intro in both** — the `intro` field lives on `RaceCityPage` and is scope-agnostic. All five scopes for Mumbai share identical intro text.
- Only the race card listing differs by scope filter.

**This is the highest duplication risk.** For a given city, all 5 scope-variant pages share identical hero intro text. Google can see this across 10 cities × 5 scopes = **50 pages sharing 10 distinct intros (5 copies each).**

### Comparing Two Club City Pages Side-By-Side

**Mumbai intro (94 words):** "Mumbai runs on its coastline. Marine Drive at 5:30am, Bandra Bandstand loops, the Carter Road promenade, and the Worli sea-face stretch..."  
**Bengaluru intro (96 words):** "Bengaluru's weather makes it India's most consistent running city — sub-25°C mornings almost year-round and Cubbon Park, Lalbagh, and Sankey Tank loops..."

The intros are genuinely different. No city intro duplicates another. This is good — the editorial differentiation is real. The problem is the *density* of unique content is too low relative to template chrome.

---

## 4. Readability Assessment

**Homepage:** Flesch-Kincaid estimated Grade 8–10. Punchy, imperative sentences ("Find races and train with Kip"). Good contrast between section headings and body copy. The accordion panel sub-copy ("Discover 500+ running events across 25+ Indian cities. Marathons, half marathons, 10Ks, 5Ks, trail runs — all filterable, all RSVPable, all free.") is clear and scannable.

**City club pages:** The intro paragraphs read at approximately Grade 9–11. Sentences are long but controlled. Example from Mumbai: "Endorfin lists every active crew in Mumbai, Navi Mumbai, and Thane: TMM training squads, suburban morning groups, and trail clubs heading to Yeoor and SGNP on weekends." — grammatically sound, appropriately specific. No readability issues flagged.

**City race pages:** Similar quality. Delhi race intro names four specific races (Airtel Delhi HM, Vedanta Delhi HM, IDBI Delhi Marathon, timing-chip 10Ks) and a seasonal pattern ("October through February") — good scannability and specificity.

**Race detail pages:** Readability entirely dependent on organizer-submitted description. The fallback copy ("Register for [title] on Endorfin — a [category] event in [location].") is grammatically correct but contributes nothing.

**Club detail pages:** Template sections (Stats, Upcoming, Led By) are functional UI, not prose. The `description` field drives all editorial content quality here. No quality floor enforced in code.

---

## 5. AI Citation Readiness

**Score: 42 / 100**

**Positive signals:**
- City intros contain passage-level facts that could be cited directly: "The Tata Mumbai Marathon (TMM) — held every January and finishing under Rajabai Tower" is a citable, quotable fact.
- Race detail pages expose structured Event schema with `startDate`, `location`, `offers` — machine-readable and citation-ready.
- Club pages expose `SportsClub` schema with `foundingDate`, `sameAs`, `numberOfEmployees` — structured for AI indexing.
- The `ItemList` schema on city pages with `numberOfItems` and `itemListElement` up to 30 items is directly usable by AI overviews for "list" queries.

**Missing signals:**
- No FAQ sections anywhere. The most AI-citation-friendly format ("What is the Tata Mumbai Marathon?", "When is the Mumbai running season?") is entirely absent.
- No definition-style content. Glossary of race distances (what distinguishes a half marathon from a 10K, ITRA points for ultras, etc.) would be highly quotable.
- The `landmarks` array in `ClubCityPage` is populated with specific running spots (e.g., `['Marine Drive', 'Bandra Bandstand', 'Carter Road', 'Yeoor Hills', 'SGNP']`) but is never rendered on-page — pure lost signal.
- Meta descriptions are formula-generated and do not contain any unique, citable information.
- No `dateModified` or `datePublished` signals in page schemas (only ISR revalidation timestamps, which are not visible in markup).

---

## 6. AI Content Quality Flags (Sept 2025 QRG Criteria)

The city intro paragraphs in both `club-city-pages.ts` and `race-city-pages.ts` appear to be written with genuine local knowledge. Specific evidence against generic AI generation:

- Named specific meeting points at precise times ("Marine Drive at 5:30am")
- References trail destinations correctly attributed to specific cities (Yeoor Hills and SGNP = Mumbai; Nandi Hills and Skandagiri = Bengaluru; Sinhagad and Lonavla = Pune)
- Uses correct local shorthand (TMM for Tata Mumbai Marathon; ADHM for Airtel Delhi Half Marathon)
- Mentions Sabarmati Riverfront's actual length ("11.5km") for Ahmedabad
- Names Kolkata's unusual 25K race format correctly ("Tata Steel Kolkata 25K — a unique odd-distance race")

These are not patterns that generic AI text generation would produce without specific prompting and verification. **The intro copy passes the Sept 2025 QRG "demonstrates E-E-A-T" bar for AI-assisted content.** The content shows genuine editorial effort even if it was AI-drafted.

**Flags for the rest of the pages:**
- The fallback meta description for race detail pages ("Register for [title] on Endorfin") is generic AI-style fill and provides no value.
- The club detail page's description quality is externally variable and unauditable from this codebase review.

---

## 7. Specific Page Assessments

### Homepage (/)

**Content quality: 48 / 100**

The homepage is a pure product/marketing page, not an informational page. Rendered editorial text:
- Hero: ~30 words ("Powering India's running landscape · Est. 2025 · Made in India · Find races and train with Kip")
- Stats bar: "500+ Races / 10K+ Runners / 50+ Verified Clubs / 25+ Indian Cities / Kip AI Run Coach" — 5 claims, no context
- Pillar section heading: "Races, runners, clubs, training, and coaches. One app." (~10 words)
- Accordion sub-copy: ~200 words total across 5 panels
- MeetKip section: ~100 words of editorial copy
- CTA footer: ~30 words

**Total: ~370 words of editorial copy** — below the 500-word homepage minimum.

**Trust signal gaps:** No founders named, no team, no company story, no address. "Made in India" and "Est. 2025" are the only provenance signals.

**What's strong:** The Kip section includes a technically accurate simulated conversation (cardiac drift reference, specific carbohydrate fueling guidance of "30g carbs at KM 6 and KM 12") that demonstrates domain expertise.

### /races Listing

**Content quality: 55 / 100**

Hero copy is minimal (~40 words). The page's value is entirely in live race data. The "Every race in India. Listed." H1 is clean for the target query.

Strong: Dynamic race count and city count in hero stats give freshness signals. Featured card section with `storySnippet()` pulling from race descriptions adds some editorial context.

Weak: No introductory copy about what Endorfin is, what types of races are listed, or how to use the page. A new visitor from Google would see only a functional listing with no editorial framing.

### /clubs Listing

**Content quality: 63 / 100**

Meaningfully richer than /races due to the admin panel section (ClubsView.tsx lines 310–395). The four admin tab panels ("Approve the runners who'll show up," "Plan runs, not logistics," etc.) contribute approximately 200 words of editorial copy describing the platform's value proposition. This is above baseline.

Hero copy: ~40 words. Admin section: ~200 words across tabs (only one tab visible at a time, so crawlers may see all or just the default). CTA footer: ~30 words.

The "For club admins" section is the strongest editorial block on any listing page and is a genuine differentiator from competitor directories.

### /run-clubs/[city] — Representative Sample: Mumbai vs Bengaluru vs Delhi

**Mumbai (/run-clubs/mumbai):**
- Intro: 94 words, high specificity (Marine Drive, Bandra Bandstand, Carter Road, Worli sea-face, TMM, Yeoor, SGNP)
- Page word total estimate: 400–520 words (including card content)
- Unique non-template content: ~94 words intro + club card names/tags (~30–50 words per club × N clubs)
- Content quality: 44 / 100

**Bengaluru (/run-clubs/bengaluru):**
- Intro: 96 words, high specificity (Cubbon Park, Lalbagh, Sankey Tank, MG Road, Whitefield, Koramangala, Nandi Hills, Skandagiri)
- Page word total estimate: 380–500 words
- Content quality: 45 / 100

**Delhi (/run-clubs/delhi):**
- Intro: 89 words (Lodhi Gardens loop, Nehru Park warm-up circle, Rajpath/Kartavya Path, Aravalli ridge)
- Content quality: 43 / 100

**Cross-page duplication analysis:**  
Template chrome shared across all three pages: H1 structure, H2 "Every run club in [city]," H2 "Run clubs in other cities," breadcrumb, stat labels, CTA footer, other-cities cross-links.  
Estimated template-identical word ratio: **~65–70%** of rendered text per page.

The club cards themselves (club names, tags, member counts) are 100% unique per city and represent the strongest differentiation signal. However, each card contributes only ~15–25 words.

**Bottom line for /run-clubs/[city]:** Google's duplication classifier will see pages sharing the same H1 template, same H2s, same CTA, same breadcrumb pattern, and the same ~150-word structural chrome. The 80–100 word city intro and the dynamic club listings are the only signals that distinguish pages. This is a "Crawled - currently not indexed" risk for cities with fewer than 4–5 clubs, where card diversity is minimal.

### /races/[scope]/[city] — Representative Sample: /races/in/mumbai vs /races/marathon-in/mumbai

**Critical finding: same intro, different scope.**  
Both pages render the same Mumbai intro verbatim. The only H1/H2 difference is "Running races in Mumbai." vs "Marathons in Mumbai." The cross-link chips and race card listings differ. But the editorial intro — the only substantial prose on the page — is identical.

This means 5 pages per city share 1 intro paragraph. For 10 cities = 50 pages with only 10 distinct intro texts. **Deduplication ratio: 5:1.**

- /races/in/mumbai content quality: 41 / 100
- /races/marathon-in/mumbai content quality: 39 / 100
- /races/5k-in/mumbai content quality: 34 / 100 (likely only 3 races at gate minimum = very sparse)

### Club Detail Pages (/clubs/[slug])

**Content quality: variable, estimated 55–75 / 100 for established clubs**

This is the strongest page type in the site. The template surface exposed to the crawler is rich:
- Club description (editorial, organizer-written) via `ExpandableDescription`
- Tags (categorical signals)
- Stats (members, runs/month, km/month, years running) — live data, fresh signals
- Upcoming events section with location, distance, going count
- Previous runs section with recap summaries, photos/videos, pace groups
- Led By section with named admins and social links — the strongest authority/expertise signal in the entire site

The "Led By" section with real named individuals (with their Instagram, Strava, WhatsApp) is an E-E-A-T signal that no city landing page has. **This is where the site's real E-E-A-T lives.**

Weaknesses: No author bio for admin cards. No founding story section. Club description quality is entirely organizer-dependent.

### Race Detail Pages (/races/[slug])

**Content quality: variable, estimated 40–68 / 100**

For well-described races: The `ReactMarkdown` rendered description can be substantial. The structured meta strip (Race day, Where, From price, Going count) is clean and scannable. Distance category table with per-category pricing is genuinely useful.

For poorly-described races: The fallback "Register for [title] on Endorfin" stub means the page has essentially zero unique content beyond the structured data. This is a significant quality floor issue.

**Organizer attribution** (`By [organizerName]`) on the race hero provides a weak but present authority signal.

---

## 8. Structured Data Quality

| Page | Schema types | Completeness | Issues |
|------|-------------|--------------|--------|
| Homepage | `ItemList` (events) | Partial | `url` fields use api.endorfin.run, not www.endorfin.run |
| /races | `ItemList` (events) | Good | Same URL domain mismatch |
| /clubs | `ItemList` (SportsClub) | Good | — |
| /run-clubs/[city] | `ItemList` (SportsClub) + `BreadcrumbList` | Good | — |
| /races/[scope]/[city] | `ItemList` (Event) + `BreadcrumbList` | Excellent | Event offers with `validFrom`/`validThrough`, `soldOut` status — strong |
| /clubs/[slug] | `SportsClub` with `sameAs`, `foundingDate`, `numberOfEmployees` | Very good | `numberOfEmployees` used for members — technically incorrect type |
| /races/[slug] | `Event` with full offer, location, organizer | Excellent | — |

**Bug:** Homepage and /races `buildJsonLd` use `https://api.endorfin.run/e/${event.id}` as the `url` and `offers.url` in structured data. This points to the API domain, not the canonical site URL. Google may attribute the schema to the wrong domain. The city race pages (`races/[slug]/[city]/page.tsx`) correctly use `https://www.endorfin.run/races/${r.slug || r.id}` — this inconsistency should be fixed.

---

## 9. Content Freshness Signals

| Page | `revalidate` | Freshness assessment |
|------|-------------|----------------------|
| Homepage | 3600s (inferred from event fetch) | Low freshness — event list cached 1 hour |
| /races | 60s (anon) | Good |
| /clubs | 3600s | Adequate for club directories |
| /run-clubs/[city] | 3600s | Adequate |
| /races/[scope]/[city] | 600s | Good — 10-minute window |
| /clubs/[slug] | 60s | Good |
| /races/[slug] | 60s | Good |

No `dateModified` in page schemas. ISR revalidation timestamps are not exposed in markup. Google cannot determine from the page itself when it was last updated — a minor freshness signal gap.

---

## 10. Recommendations by Priority

### Priority 1 — Critical (fix before next crawl cycle)

**P1-A: Add scope-specific intro text to race city pages.**  
The root cause of the 5:1 duplication on `/races/[scope]/[city]` is that `RaceCityPage.intro` is scope-agnostic. Add an `introByScope: Partial<Record<RaceScope, string>>` field to `RaceCityPage` and write distinct 60–80-word intros for marathon, half-marathon, 10K, and 5K scopes in at least Mumbai, Delhi, and Bengaluru (the highest-traffic cities). Fall back to the generic intro for unconfigured scope/city pairs.

**P1-B: Render the `landmarks` array on city club pages.**  
The `ClubCityPage.landmarks` array (e.g., `['Marine Drive', 'Bandra Bandstand', 'Carter Road', 'Yeoor Hills', 'SGNP']`) exists in the data but is never rendered. A simple "Popular running spots in [city]" chip strip (5–7 named locations with links to Google Maps or route descriptions) would add ~50 rendered words of unique, specific content and strong local relevance signals. Cost: 1–2 hours of template work.

**P1-C: Fix the JSON-LD URL domain mismatch on the homepage and /races.**  
In `/src/app/page.tsx` `buildEventsJsonLd()` and `/src/app/races/page.tsx` `buildJsonLd()`, change `https://api.endorfin.run/e/${event.id}` to `https://www.endorfin.run/races/${event.slug || event.id}` so structured data `url` and `offers.url` resolve to the canonical site domain.

### Priority 2 — High (within 2–4 weeks)

**P2-A: Add a "Why run in [City]" editorial block to city pages.**  
Both city page types need a second content block below the listing (rendered server-side for crawling). A 100–150-word section per city covering running season, signature races, and terrain variety would roughly double the unique prose on each page and push totals above the 500-word floor. This can reuse the existing `landmarks` data plus add a `season` and `topRaces` field to the city page config.

**P2-B: Add an FAQ section to city pages.**  
Minimum 3 Q&A pairs per city, e.g., "When is the best time to run in Mumbai?", "Which are the biggest races in Mumbai?", "How do I find a run club near me in Mumbai?". Render as a `<details>/<summary>` accordion with `FAQPage` schema. High AI citation readiness and directly supports featured-snippet targeting.

**P2-C: Enforce a minimum description quality gate for race detail pages.**  
In `RaceDetailView.tsx` the "About this race" section only renders `when event.description || event.fullDescription`. The fallback in `buildJsonLd` uses a generic stub. Add an admin-side prompt to require a minimum 50-word description before a race can be marked `isFeatured`, and flag races with empty descriptions in the admin moderation queue.

### Priority 3 — Medium (within 4–8 weeks)

**P3-A: Add a "Who we are" page or at minimum an About section to the homepage.**  
A 100–200-word paragraph naming the founding team and the mission ("We built Endorfin because we ran the 2023 Bengaluru Marathon and couldn't find a single aggregated race calendar") would be the single highest-impact E-E-A-T improvement available. This adds Experience and Authoritativeness signals that currently score near zero.

**P3-B: Add named author/curator attribution to city pages.**  
Even a "Curated by [Name], [City] runner since [year]" kicker under the intro paragraph would establish a named human entity behind the editorial content — directly addressing the QRG's requirement for identified expertise.

**P3-C: Expose `dateModified` in page schemas.**  
Add `dateModified` to `ItemList` schemas on city pages using the latest `updatedAt` timestamp from the clubs/races in the listing. This gives Google a freshness signal it can compare across crawls.

**P3-D: Add homepage word count to the 500-word floor.**  
Currently ~370 words of editorial content. Options: expand the Kip section with a concrete example week plan, add a "How it works" 3-step section (Browse → RSVP → Show up), or add a real testimonial from a runner. Target 500+ words total.

---

## 11. Summary Table

| Page type | Quality score | Primary risk | Estimated "Crawled - not indexed" risk |
|-----------|--------------|--------------|----------------------------------------|
| Homepage | 48 / 100 | Sub-threshold word count; no E-E-A-T identity | Low (homepage exempted from thin-content classifier) |
| /races | 55 / 100 | Minimal editorial copy | Low (directory pages with strong structured data) |
| /clubs | 63 / 100 | Acceptable, admin panel copy helps | Low |
| /run-clubs/[city] | 43 / 100 | 65–70% template duplication; under word floor | **Medium–High** (cities with <4 clubs) |
| /races/[scope]/[city] | 37–41 / 100 | Same intro across 5 scope variants; well under word floor | **High** (especially 5K/10K scope pages with 3 races minimum) |
| /clubs/[slug] | 55–75 / 100 | Variable organizer copy quality | Low (unique data per club) |
| /races/[slug] | 40–68 / 100 | Generic fallback description on data-sparse races | Medium (races with no description) |
