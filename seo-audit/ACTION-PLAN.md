# Endorfin SEO Action Plan

**Generated:** 2026-05-15
**Companion to:** [FULL-AUDIT-REPORT.md](./FULL-AUDIT-REPORT.md)

Priorities are sequenced to maximize ROI: fix things that block indexing first, then things that affect SERP appearance, then things that affect ranking, then polish.

---

## Critical (do this week)

### 1. Fix title-tag duplication
**Effort:** ~10 min · **Impact:** High (every SERP impression)

`/races/in/[city]`, `/run-clubs/[city]`, and `/races/[slug]` all render titles ending in `... | Endorfin | Endorfin`. The root layout's `metadata.title.template` appends `| Endorfin` to every page-level title that already includes "Endorfin".

**Fix:** Open `src/app/layout.tsx`. Either:
- Change `title.template` to `'%s'` (let pages own their full title), and audit per-page titles to ensure they include the brand themselves, or
- Keep the template and strip `| Endorfin` from every per-page `metadata.title` value.

Verify on `/races/in/mumbai`, `/run-clubs/mumbai`, and a sample race detail URL.

### 2. Add ISR to `/races` to cut TTFB from 4s → ~100ms
**Effort:** 1 line · **Impact:** High (Core Web Vitals on the most-trafficked listing page)

Open `src/app/races/page.tsx` and add at the top:
```ts
export const revalidate = 600;
```
This caches the response at the edge for 10 minutes between regenerations. Users get instant responses; cold regenerations run in the background.

### 3. Fix wrong domain in Event JSON-LD on Home + /races
**Effort:** ~5 min · **Impact:** Medium-High (rich results validity)

The schema audit found:
- `src/app/page.tsx` emits `url: https://api.endorfin.run/e/{id}` and `offers.url: https://api.endorfin.run/e/{id}` — should be `https://www.endorfin.run/races/{slug || id}`.
- `src/app/races/page.tsx` emits `url: https://endorfin.run/e/{slug || id}` (missing www) — same fix.

Both are pointing at URLs that don't resolve to the canonical race detail page. This can disqualify the Event rich result.

### 4. Validate the GSC Event-warning fix (commit `8fb8164`) clears
**Effort:** 5 min · **Impact:** Already addressed, just confirm

1. Wait for Vercel deploy of `8fb8164` to be live (already pushed earlier today).
2. Open GSC → Enhancements → Events → click "Validate Fix" so Google reprocesses the 5 flagged events.
3. Spot-check one race detail URL in [Rich Results Test](https://search.google.com/test/rich-results).

---

## High (do within 1 week)

### 5. Add `BreadcrumbList` to /races, /clubs, /races/[slug], /clubs/[slug]
**Effort:** ~30 min · **Impact:** Medium (rich results + AI engine context)

The city pages already implement BreadcrumbList correctly. Copy the pattern to the four pages missing it. Pattern is in `src/app/races/[slug]/[city]/page.tsx` (search for `BreadcrumbList`).

### 6. Add `SearchAction` to global `WebSite` schema
**Effort:** 5 lines · **Impact:** Medium (qualifies for Google Sitelinks Search Box)

In `src/app/layout.tsx`, augment the `WebSite` block with:
```json
"potentialAction": {
  "@type": "SearchAction",
  "target": { "@type": "EntryPoint", "urlTemplate": "https://www.endorfin.run/races?q={search_term_string}" },
  "query-input": "required name=search_term_string"
}
```
(Assumes `/races?q=...` is a valid search URL. If not, point at whatever search UX you ship.)

### 7. Add security headers in next.config.js
**Effort:** 10 min · **Impact:** Low-Medium (security posture; minor ranking signal)

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }];
}
```
Also set `poweredByHeader: false` to suppress `x-powered-by: Next.js`.

### 8. Add race detail pages to sitemap
**Effort:** ~10 lines · **Impact:** Medium (faster indexation)

In `src/app/sitemap.ts`, after the existing race fetch, emit one URL per race:
```ts
for (const race of races) {
  const slug = race.slug || race.id;
  staticRoutes.push({
    url: `${SITE}/races/${slug}`,
    lastModified: race.updatedAt ? new Date(race.updatedAt) : new Date(race.startTime),
    changeFrequency: 'weekly',
    priority: 0.7,
  });
}
```

### 9. Filter unpublished clubs out of sitemap
**Effort:** ~5 lines · **Impact:** Medium (crawl budget; avoids indexed noindexed pages)

Per the sitemap audit, the sitemap emits all club slugs returned by `/api/v1/clubs` regardless of `publishedAt` status, while `generateMetadata` on `/clubs/[slug]` sets `robots: noindex` for unpublished clubs. Filter `.filter(c => c.publishedAt)` in `sitemap.ts` before emitting.

### 10. Strengthen city-page content (the indexation fix)
**Effort:** Medium · **Impact:** High (likely resolves "11 not indexed" in GSC)

The content audit shows city pages have ~80 unique words vs ~150 template words. To address Google's "Crawled - not indexed" risk:

For each `/run-clubs/[city]` and `/races/[scope]/[city]` page:
- **Expand the intro paragraph to 200–300 words.** Name specific landmarks, signature races, notable clubs, popular meetup spots.
- **Render the `landmarks` array that already exists in the data** but isn't being displayed — it's a data file with city-specific intel that's literally going to waste.
- **Add a 5-question FAQ** with `FAQPage` JSON-LD. Questions should be city-specific ("When is the [City] Marathon? What's the most popular distance? Are there beginner runs?"). This single addition is the largest lever for both indexation AND AI citation.
- **Add a "Related cities" cross-link block** (already present on club city pages; extend to race city pages).

This is the highest-impact ranking + indexation move available.

---

## Medium (do within 1 month)

### 11. Add an About / Team page with `Person` schema for named curators
**Effort:** ~1 day · **Impact:** Medium-High (E-E-A-T, AI citation eligibility)

Per the content audit and GEO audit: zero E-E-A-T identity content currently. Add `/about` or `/team` with:
- 2–3 named team members
- `Person` JSON-LD with `sameAs` linking to LinkedIn / Twitter
- One-paragraph mission statement
- Link to the about page from the footer

Also add a "Curated by the Endorfin team" kicker to programmatic city pages.

### 12. Add FAQPage schema to the homepage
**Effort:** ~1 hour · **Impact:** Medium (AI Overviews / Perplexity citation)

5-question FAQ at the bottom of the homepage. Questions: what is Endorfin, how do I find a race near me, do I have to pay, how do I create a club run, where can I download the app. Wrap in `FAQPage` JSON-LD.

### 13. Fix MobileApplication schema
**Effort:** 5 min · **Impact:** Low-Medium

In `src/app/layout.tsx`:
- Change `operatingSystem` from `"Android"` to `"Android, iOS"`.
- Add iOS App Store URL to `sameAs`.
- Either drive `aggregateRating.ratingCount` from a real source or remove it (hardcoded `120` will become stale and could trigger GSC manual action).

### 14. Tighten font preloads
**Effort:** ~15 min · **Impact:** Low-Medium (CWV — LCP, FCP)

8 woff2 fonts preloaded on every route. Audit which are used above the fold; set `preload: false` on the rest in the font config (`next/font/local` or `next/font/google`).

### 15. Defer PostHog client init to post-interaction
**Effort:** ~30 min · **Impact:** Low-Medium (CWV — INP)

PostHog is on every page. Wrap init in a `requestIdleCallback` or first-interaction listener so it doesn't compete for main-thread time during hydration.

### 16. Apex redirect 307 → 308
**Effort:** Vercel domain config · **Impact:** Low (signal clarity)

In Vercel project settings → Domains, set apex `endorfin.run` to permanent (308) redirect to `www.endorfin.run`. Currently it's 307 (temporary), inconsistent with the HTTP→HTTPS 308.

### 17. HSTS preload eligibility
**Effort:** 5 min · **Impact:** Low (security)

Add `includeSubDomains; preload` to the HSTS header and submit to https://hstspreload.org/.

---

## Low (backlog)

### 18. Fix meta description grammar
`/races/in/[city]`: "Find every upcoming **races**" → "Find every upcoming **race**". One word in `src/app/races/[slug]/[city]/page.tsx`.

### 19. Drop `priority` and `changeFrequency` from sitemap if you want to reduce noise
Google ignores both. Harmless but unnecessary.

### 20. Add `dns-prefetch` / `preconnect` for third-parties (PostHog endpoint, Fontshare CDN)
Marginal performance gain.

### 21. Image sitemap extensions
Add `<image:image>` entries to the sitemap for race hero images — improves image-search and AI-Overview surfacing.

### 22. URL convention consistency
`/run-clubs/[city]` vs `/clubs/[slug]` vs `/races/[scope]/[city]` — three different patterns for three content types. Not a search-engine bug; documentation gap. Pick a convention going forward.

---

## When you can configure these external integrations

1. **Google API credentials (PageSpeed Insights, CrUX, GSC, GA4)** — per project notes, run `python /Users/shivamsinghal/.claude/plugins/cache/agricidaniel-seo/claude-seo/1.8.2/scripts/google_auth.py --setup`. Unlocks field CWV data + real impressions/clicks/CTR + indexation status. Highest-value integration.
2. **Moz Free API** (300 requests/month free) — gives ongoing Domain Authority + Spam Score tracking. Required for the backlinks audit to be meaningful.
3. **Bing Webmaster Tools** (free) — gives a referrers report that GSC won't show for a site this young.
4. **DataForSEO MCP** (paid) — only if you want live SERP rank tracking + AI visibility (ChatGPT scraper, LLM mention tracking). Defer until you have the basics resolved.

---

## Sequence I'd recommend

**Week 1 (CRITICAL):** Items 1, 2, 3, 4 — all small, all high-impact. None are risky.

**Week 2 (HIGH):** Items 5, 6, 7, 8, 9 — schema + sitemap + security. Setup tax.

**Weeks 3–4 (HIGH content):** Item 10 — city page content + FAQ schema. This is the real ranking + indexation move. Largest lift but pays the most.

**Month 2:** Items 11–17 — E-E-A-T, performance polish, app schema fixes.

**Backlog:** Items 18–22 — polish.

Re-run the audit after weeks 1–2 to confirm SEO Health Score moves from 59 → ~72. Re-run again after the content work to target 80+.
