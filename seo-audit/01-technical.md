# Technical SEO Audit — endorfin.run

**Audited:** 2026-05-15
**Method:** Live curl probes against production (Vercel). Subagent runs blocked by sandbox; performed inline.

## Summary

The site has solid foundations — HTTPS-only, proper redirects, sitemap declared in robots, AI crawlers explicitly allowed, modern meta robots directives, single H1 per page, canonicals correct. Two critical issues stand out: a **title-tag duplication bug** affecting most page types and a **4-second TTFB on `/races`** caused by fetching the full event catalog server-side per request.

## Critical

### C1. Duplicated " | Endorfin" suffix in title tags across multiple page types
Multiple pages render `... | Endorfin | Endorfin` because the page-level `metadata.title` already includes "Endorfin" and the root layout's `title.template` appends "| Endorfin" again.

Confirmed on:
- `/races/in/mumbai` → `Running races in Mumbai — every race, listed | Endorfin | Endorfin`
- `/run-clubs/mumbai` → `Run clubs in Mumbai — every crew, listed | Endorfin | Endorfin`
- `/races/[slug]` → `Omaxe Faridabad Neon Run -2026 — Endorfin | Endorfin`

**Why it matters:** Title tags are the single highest-impact on-page SEO element. Duplicated brand suffix wastes characters Google could allocate to keywords, looks spammy, and may trigger Google's title rewriting (where Google replaces your title with its own — you lose control of SERP appearance).

**Fix:** Either drop the `| Endorfin` from page-level titles, or use `template: '%s'` (no append) and let pages own their full title. The home page is unaffected because it sets an absolute title.

### C2. TTFB on `/races` is 4.0s; full load 5.7s
```
/                       TTFB 0.41s  total 0.47s
/races                  TTFB 4.04s  total 5.67s
/clubs                  TTFB 0.50s  total 0.84s
/races/in/mumbai        TTFB 0.66s  total 1.17s
/run-clubs/mumbai       TTFB 0.48s  total 0.56s
```
`/races` is fetching up to 20 paginated batches of 50 events (1000 events) server-side before responding. Gzipped HTML is 302 KB — also the largest transferred page by ~10x.

**Why it matters:** Google's TTFB threshold for "Good" is < 800ms; > 1.8s is "Poor". 4s TTFB will hurt Core Web Vitals (specifically LCP, which can't fire until HTML arrives), and Googlebot may abandon slow pages on subsequent crawls.

**Fix options (pick one):**
1. **Paginate the visible listing** (e.g., show 50 races per page, "Load more" or numbered pagination) instead of rendering all 500+ inline. This is the lowest-risk fix.
2. **ISR cache** the page (`export const revalidate = 600`) so the slow fetch only happens once per 10 min, not per request.
3. **Split into "Featured + upcoming-30-days" hero rendered server-side, lazy-load the rest** with a client component fetched after hydration.

Option 2 (ISR) is the fastest win — it doesn't change the user experience but moves the latency to a background revalidation. Option 1 is the most defensible long term.

## High

### H1. No `Cache-Control: public` on stable HTML
Every HTML response includes `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`. Vercel's edge CDN handles its own caching independently of this header (via `x-vercel-cache: MISS/HIT`), so it isn't a functional bug. But intermediate proxies (corporate caches, ISPs) and shared crawl caches won't cache responses. For static-ish pages like `/`, `/clubs`, `/runners`, `/coaches`, `/workout-plan`, consider opting into `s-maxage` via `headers()` in next.config.

### H2. Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy)
HSTS is set (`max-age=63072000` — 2 years), but the only header present. Add via `next.config.js` `headers()`:
```js
{
  key: 'X-Content-Type-Options', value: 'nosniff',
  key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin',
  key: 'X-Frame-Options', value: 'SAMEORIGIN',
  key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()',
}
```
CSP is harder to ship safely with Next.js (need nonce strategy) but should follow.

### H3. HSTS doesn't include `preload` or `includeSubDomains`
Current: `strict-transport-security: max-age=63072000`. Should be `max-age=63072000; includeSubDomains; preload`, then submit to https://hstspreload.org/.

## Medium

### M1. Apex returns 307 (temporary) instead of 308 (permanent)
```
https://endorfin.run/ → HTTP/2 307 → https://www.endorfin.run/
```
307 is a temporary redirect. 308 (permanent) is the correct status for a fixed apex→www policy — it signals to search engines that the canonical change is permanent and preserves the request method. The HTTP→HTTPS redirect correctly uses 308. Make apex consistent.

### M2. Race detail page URLs are absent from sitemap.xml
The sitemap declares `/`, `/races`, `/clubs`, city pages, and static pages but does not enumerate `/races/[slug]` individual race pages. The sitemap subagent already flagged this. Race details have proper canonical + Event JSON-LD; they should be in the sitemap.

### M3. Vercel exposes `x-powered-by: Next.js`
Minor fingerprinting leak. Suppress via `next.config.js`:
```js
poweredByHeader: false,
```

### M4. The `link: rel=preload` font list includes 8 woff2 fonts preloaded on every page
Each preload is a network hint that competes with critical resources. Audit which fonts are actually used above the fold; remove preloads for those used only deep in the page or only in specific templates.

## Low

### L1. Sitemap `lastmod` is `new Date()` at build time for all static routes
Every regen sets lastmod = now, making lastmod meaningless to Googlebot (it ignores stable-but-not-fresh dates). Use file mtime or a manual constant for truly static pages.

### L2. No `<link rel="alternate" hreflang>` declared
India-only audience and the site doesn't ship localized variants — fine to skip. Mentioned only to note it's an intentional gap, not an oversight.

### L3. No `<meta name="theme-color">` value visible
The `name="theme-color"` meta is rendered but appears without a value attribute in the head — verify it has a hex value. Minor PWA/mobile UX polish.

### L4. URL pattern inconsistency: `/run-clubs/[city]` vs `/clubs/[slug]` vs `/races/[scope]/[city]`
Three different city-page URL conventions for three different content types. Not a search-engine issue, but inconsistent IA is harder for users and AI assistants to model. Document the convention and stick to it.

## Crawl coverage notes

- **Sitemap reachable** at `https://www.endorfin.run/sitemap.xml`, ~85–130 URLs (per sitemap subagent count).
- **robots.txt** at `https://www.endorfin.run/robots.txt`. Allows all user-agents to `/`, explicitly disallows `/api/` and `/admin/`, allows AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended) — strong GEO posture.
- **Apex** redirects to www via 307.
- **HTTP** redirects to HTTPS via 308.
- **HTTPS** working with HSTS.
- All sampled pages return 200, set `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">` (excellent for AI snippet harvesting).
- **One H1 per page** across all sampled types.
- **Canonicals** correctly self-reference on all sampled pages (no cross-domain or mistaken canonical issues).
- **`/clubs/mumbai` returns 404** — this is expected behavior. `/clubs/[slug]` is the club-detail route (slug = club name); `/run-clubs/[city]` is the city-listing route.

## Priority order (recommended fix sequence)

1. **C1** — Fix title duplication (1 small edit to layout.tsx or per-page metadata) — biggest SERP-appearance win for least effort.
2. **C2** — ISR-cache `/races` (`export const revalidate = 600`) — drops TTFB from 4s to ~500ms immediately.
3. **H2** — Add security headers in next.config.js (10 minutes).
4. **M2** — Add race detail URLs to sitemap.ts.
5. **M1** — Switch apex redirect to 308.
6. **H3** — Add `includeSubDomains; preload` to HSTS, submit to preload list.
7. **H1, M3, M4** — Polish.
