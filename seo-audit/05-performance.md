# Performance & Core Web Vitals — endorfin.run

**Audited:** 2026-05-15
**Method:** Live curl probes for size/TTFB, source-code inspection for render-blocking patterns. Lighthouse local run failed (no headless Chrome available); subagent runs blocked by sandbox. Recommend re-running with PageSpeed Insights or CrUX field data once Google API credentials are configured.

## Summary

The top issue is `/races` at **4-second TTFB / 5.7s total / 302 KB gzipped HTML** — caused by fetching the entire race catalog (up to 1000 events, 20 paginated API calls) server-side per request. Other page types ship lean payloads (10–50 KB gzipped) with sub-second TTFB. PostHog adds a third-party script bundle. Eight woff2 fonts preloaded on every page.

## Measured page weight (gzipped, transferred)

| Page | TTFB | Total | Gzip HTML size |
|---|---|---|---|
| `/` | 0.41s | 0.47s | 12 KB |
| `/races` | **4.04s** | **5.67s** | **302 KB** |
| `/clubs` | 0.50s | 0.84s | 25 KB |
| `/races/in/mumbai` | 0.66s | 1.17s | 49 KB |
| `/run-clubs/mumbai` | 0.48s | 0.56s | 11 KB |
| `/races/[slug]` | ~0.5s | ~0.6s | 14 KB |

## Critical

### C1. `/races` is the largest, slowest, and heaviest page on the site
- **TTFB 4 seconds** — exceeds Google's "Poor" threshold (1.8s) by 2.2x. Blocks LCP, which can't paint until HTML arrives.
- **302 KB gzipped** — 10x larger than the homepage and 3x larger than `/clubs`.
- **2 MB uncompressed** — the entire race catalog is serialized into the RSC payload.

Root cause is in `src/app/races/page.tsx:52` — `getRaces()` paginates the events API up to 20 times (PAGE_SIZE × 20 = 1000 events) on every request because the API caps `limit` at 50. There is no ISR / `revalidate` on the page, so this runs on every cold request.

**Fix:** Add `export const revalidate = 600` to `src/app/races/page.tsx`. Drops effective TTFB to whatever the cache lookup costs (typically 50–100ms on Vercel edge). For a directory listing that doesn't need to be real-time fresh, 10 minutes is plenty.

Long-term fix: paginate the visible UI (50 per page) and stop sending all 1000 in the HTML payload at once. Big LCP and INP wins.

## High

### H1. Eight woff2 fonts preloaded on every route
Response headers preload 7 self-hosted Next-optimized fonts + 1 Fontshare font. Each preload competes with critical resources for the first 100 KB of bandwidth.

**Why it matters:** Mobile FCP and LCP suffer when too many high-priority requests fight for bandwidth before paint. Preload only the 2–3 fonts used above the fold.

**Fix:** In whichever component declares the font (`src/app/layout.tsx` or font configs), set `preload: true` only on the hero font(s) and `preload: false` on the rest. Next.js's `next/font/local` and `next/font/google` both expose this flag.

### H2. PostHog client adds a third-party JS bundle on every page
Project memory notes PostHog was recently integrated (commit `e2213f8`). Each page now ships the PostHog SDK (~40–60 KB gzipped depending on config). PostHog's loader is async by default but the bundle still contends for main-thread time after hydration.

**Why it matters:** Affects INP and TBT, especially on low-end mobile. With Google's INP metric live in Core Web Vitals (March 2024), this is now an SEO signal, not just a UX one.

**Fix:** Lazy-load PostHog after first user interaction (defer init until `'load'` or first input). Project memory `4146` shows PostHog was already hardened — double-check it's not initializing during SSR.

### H3. Cache-Control on HTML is `private, no-cache, no-store, max-age=0`
Vercel edge caches independently (per `x-vercel-cache: MISS/HIT`), so this doesn't hurt CDN behavior. But it blocks ISP, mobile-carrier, and corporate-proxy caching — every visit re-downloads. For a directory site whose content is "fresh-ish but doesn't change every second", this is wasteful.

**Fix:** Set `s-maxage=3600, stale-while-revalidate=86400` on stable routes via `next.config.js` headers().

## Medium

### M1. Hero image format / size not verifiable from HTML headers alone
Sample homepage HTML references images. Without running Lighthouse I can't confirm format (WebP/AVIF vs JPEG), responsive `srcset`, or LCP candidate size. Action: run PageSpeed Insights on `/` and `/races/[slug]` and confirm Next.js's `<Image>` component is in use everywhere with `priority` on the LCP image.

### M2. No explicit CDN caching strategy declared in code
`next.config.js` should define cache headers for `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og-image.png`, `/icon.png`. Some of these may already be hitting the Vercel CDN by default, but explicit is better than implicit.

### M3. Sample race detail page renders fast (~0.5s) but ships a fixed 14 KB HTML
This is fine. Mentioned as a baseline — the race detail page is *not* a perf problem; only `/races` is.

## Low

### L1. No `<link rel="dns-prefetch">` or `preconnect` for known third-parties
PostHog (`us.i.posthog.com` or similar), Fontshare CDN, and the api.endorfin.run subdomain could all benefit from a `<link rel="preconnect">` hint. Marginal improvement.

### L2. JS payload not measured
Full performance audit requires runtime measurement. Recommend running PageSpeed Insights on each page type (https://pagespeed.web.dev/) and capturing the field-data CrUX percentiles when GSC traffic builds up.

## Recommended next step

Set up Google API credentials per project memory (PageSpeed Insights v5 + CrUX) and re-run the performance audit with field data. The current report is grounded in measured server response and source inspection, but the CWV (LCP, INP, CLS) numbers themselves need a real Lighthouse run or CrUX read to be authoritative.

## Priority order

1. **C1** — Add ISR (`revalidate = 600`) to `/races`. One-line change.
2. **H1** — Drop unnecessary font preloads.
3. **H2** — Defer PostHog init to post-interaction.
4. **H3** — Add CDN caching headers in next.config.js.
5. Then re-measure with Lighthouse / PageSpeed Insights.
