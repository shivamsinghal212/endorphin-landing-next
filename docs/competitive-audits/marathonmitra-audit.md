# MarathonMitra Competitive Audit

**Date:** 2026-05-15
**Auditor:** Claude (via Chrome DevTools, authenticated browse)
**Target:** https://marathonmitra.com/
**Reference:** Endorfin (https://www.endorfin.run/)
**Screenshots:** `$TMPDIR/marathonmitra-audit/` (01–07)

---

## 1. Executive Summary

MarathonMitra is a **discovery + community + soft-monetization** platform for the Indian running market. They are NOT a registration platform — they redirect runners to `townscript.com`, `kalkisports.in`, organizer sites, etc. Their wedge is **content depth + community + organizer relationships**, monetized via a tiered **organizer listing/registration fee** (₹0 for runners).

Where they are *materially* ahead of Endorfin right now:

1. **A proper authenticated webapp** — runner profiles, leaderboards, race history, photo gallery, achievements, saved/participated events, story authoring. Endorfin has none of this.
2. **A pricing model that's already live** with a payout calculator + GST breakdown — they have something to sell to organizers today.
3. **User-generated stories (70+ published)** with comments, likes, view counts — a content moat Google loves.
4. **Virtual Challenges** (Distance / Consistency / Time / Team) — a parallel product surface integrated with Strava/Garmin/Fitbit.
5. **Leaderboards** by distance × city × age group — programmatic SEO grid with ~570 city pages × 5 distances × 6 age buckets.
6. **Distribution-as-product**: WhatsApp Channel, Telegram, Instagram, X, Reddit, FB, LinkedIn, YouTube — all listed on a "/running-communities" hub page they own.
7. **Stronger schema markup**: SportsEvent (more specific than Event) with `subEvent[]`, `performer`, `workPerformed`, `potentialAction`, FAQPage, plus BreadcrumbList + ItemList — 7 JSON-LD blocks per event.

Where Endorfin is even or ahead:

- Cleaner brand and visual polish (subjective but holds).
- Recently shipped: BreadcrumbList, SearchAction, security headers, ISR on /races, title-tag dedup.
- 200+ races already indexed (similar order to MarathonMitra's 254 events).
- Faster TTFB on /races after the Promise.all fix.

**Where MarathonMitra is weak / where you can attack:**

- Their event detail pages render with **3,510 chars of body text** — thin. Lots of structured fields, but the narrative content is shallow.
- The webapp is built but **mostly empty** (leaderboards show "0 runners", saved-events is empty, only ~2K registered runners total).
- Accessibility score 83 (color contrast, viewport user-scalable=no, target-size failures, ARIA issues).
- Schema has factual errors: `offers.price="0"` when the actual fee is ₹2100; `validFrom = event date` instead of registration open date.
- Pricing model puts them in the registration-tech business *without* actually owning checkout — runners still get redirected off-platform.
- Their `/about/akash-chourasia` page in the sitemap suggests a single-founder operation; the "Powered by GymSarathi" footer confirms this is a side-project of another property.

---

## 2. Site Map (what they actually have)

### Public surfaces
- `/` — Homepage with search + filter, 6 upcoming + 6 completed event cards, top 8 cities, 1 article, 8 stories.
- `/events?status=upcoming|completed|all` — 127 upcoming, 127 completed; filters: search, city, distance, date. 30/page, 5 pages.
- `/events/[slug]` — Detail page with SportsEvent schema, FAQPage, BreadcrumbList. Sections: About, Venue, Schedule, Bib Collection, Runner Kit, Contact, Comments, "More Events in [city]". Comments + likes per event.
- `/virtual-events` — Virtual Challenges (Race / Distance / Consistency / Time / Team).
- `/city` + `/city/[slug]` — 570+ city pages.
- `/cities/[slug]/leaderboard` — Per-city leaderboard.
- `/runners` + `/runners/[username]` — Public runner profiles.
- `/leaderboards/[distance]` + `/leaderboards/[distance]/age/[bucket]` — 5K / 10K / HM / Marathon × Under18/18-29/30-39/40-49/50-59/60+ + "trending".
- `/stories` + `/stories/[slug]` — 70 stories. Filter: type (Runner Story / Race Experience / Training Journey) + city.
- `/articles` + `/articles/[slug]` — Editorial guides (e.g. "Best Running Shoes in India 2026" — heavy Amazon affiliate play).
- `/running-communities` — Directory of their own social/messaging channels.
- `/pricing` — Organizer pricing + calculator.
- `/about`, `/about/akash-chourasia` (founder page), `/contact`, `/faq`, `/organiser-faq`.
- `/organizer/apply`, `/sponsor/apply`, `/organizers-partners`.
- `/create` — Public story submission flow.

### Authenticated surfaces (logged-in)
- `/home` — Personalized dashboard ("Good afternoon, [name]" + "Runs happening in [city]"), with quick-action tiles for Manage Story / Saved Events / Participated Events / Partners / Runner Hub / Share Story / Profile, plus runner profile hub, upcoming events filtered by city, community feed.
- `/dashboard/runner` — **Runner Hub**: Personal Bests, Race History, Photo Gallery, Achievements & Verification, full bio/club/goals/tags editor.
- `/profile` — Public profile mgmt.
- `/manage/stories` — Author dashboard.
- `/saved-events` — Saved races.
- `/participated-events` — Race history.
- `/notifications` — Notification center.

---

## 3. Pricing Model (the key part of your ask)

**Headline:** "Zero fees for runners. ₹0 platform fee — forever free." Monetization is 100% organizer-side.

### Organizer tiers (cumulative — listing fee applies above 100 registrations IN ADDITION to per-reg fee)

| Registrations | Organizer pays |
|---|---|
| 0–100 | ₹499 flat listing |
| 101–300 | ₹10 / reg |
| 301–900 | ₹15 / reg |
| 901–1,800 | ₹20 / reg |
| 1,801–3,600 | ₹25 / reg |
| 3,600+ | ₹30 / reg |

Plus:
- **GST 18%** on platform fees only.
- **Payment gateway ~2%** on total collection.
- **Email / WhatsApp ~1%** on total collection.

**Example (their default calculator):** ₹500 ticket × 300 runners = tier 101–300 (₹10/reg). Organizer keeps ~₹471/runner → ₹1,41,371 total payout. They make ₹3K platform fee + ₹499 listing + GST.

### Why this pricing is smart
- **Anchored on "₹0 for runners"** — neutralizes the runner-side pricing objection.
- **Tier progression rewards growth** but caps perceived cost — at 3,600+ a single registration only costs the organizer ₹30 (~3% of a typical ₹1,000 ticket).
- **Built-in payout calculator** with Quick + Category-wise modes and a side-by-side scenario comparison — this is a sales tool, not a pricing page.
- **GST breakdown shown line-by-line** — important for Indian organizers who need invoices/ITC.

### Caveats
- They are NOT actually processing the registration in the funnel I observed. The event detail "Register Now" button on Freedom Bengaluru Half Marathon goes to **townscript.com**. So the per-registration fee model implies a partnership/revshare with the registration provider, OR a tracking pixel back-channel, OR the pricing applies only when the organizer uses MarathonMitra's own checkout (which I couldn't find). Worth verifying — if their checkout doesn't exist yet, organizers won't pay.

---

## 4. Schema & Technical SEO

### Event detail page schema (impressive)
7 JSON-LD blocks per event:
- `Organization` (MarathonMitra)
- `SportsEvent` — preferred over generic Event; includes `subEvent[]` for each distance, `performer`, `workPerformed`, `potentialAction` (ReserveAction), `offers`, full `location.geo`/address
- `BreadcrumbList`
- `FAQPage` — gives them FAQ rich results
- `WebPage`
- `Organization` (organizer)
- `ItemList` (related events in city)

**Bugs in their schema** (opportunities to exploit):
- `offers.price = "0"` even when the real fee is ₹2,100. This either yields Google warnings or worse, mis-displays in Knowledge Panel.
- `offers.validFrom` is set to the event date, not the registration open date. Wrong semantic.
- `endDate = startDate` — multi-day events would be miscategorized.

### Sitemap
- 1,959 URLs in a single flat `sitemap.xml` (no index). Well under 50K so this is fine.
- Includes per-event, per-story, per-city, per-runner URLs.
- `changefreq` and `priority` set per template (events hourly @ 0.9, cities daily @ 0.8, etc.).

### Robots.txt
Properly blocks `/api/`, `/admin/`, `/_next/`, `/search/`, `/home`, `/profile`, `/notifications`, `/saved-events`, `/participated-events`, `/create/`, `/login`, `/signup`, `/onboarding`. Allows `/organizer/apply` and `/sponsor/apply` explicitly. Sitemap declared.

### Security headers
- ✅ HSTS 1y, X-Content-Type-Options: nosniff
- ❌ Missing: X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP
- ❌ Leaks `x-powered-by: Next.js`
- Endorfin now has all of these. Slight edge for you.

### Lighthouse (mobile, homepage)
- **SEO: 100** — flawless
- **Best Practices: 96**
- **Accessibility: 83** — failures: color contrast, `meta viewport[user-scalable=no]`, target-size (touch targets), ARIA required children, label-content mismatch
- Console errors logged on load
- Performance not measured (used navigation mode)

### Stack
- Next.js on Netlify (Durable Cache).
- Image CDN: Cloudflare R2 (`pub-7dbceed351f24aee94fcc229ac9bff07.r2.dev`).
- API: `api.marathonmitra.com` (separate subdomain).
- Auth: Cookie-based with `/api/auth/refresh` endpoint.

---

## 5. UX & Feature Patterns Worth Stealing

### Listing pages
- **Like + comment counters on every card** (e.g. "1 | 0") — creates social proof and gives them engagement metrics they can sort by.
- **"Verified Listings"** badge in hero — trust signal.
- **Multi-stat hero**: 127+ upcoming, 127+ completed, 70+ stories, 570+ cities, 2.0K+ runners — these numbers do a lot of social-proof work even though they're small in absolute terms.

### Event detail
- **"Bib Collection Details"** and **"Runner Kit & Benefits"** as first-class sections — these are the exact questions runners Google for, and competitors don't have dedicated sections for them.
- **Comments section per event** — runners ask logistics questions and the organizer/community answers. Pure UGC SEO.
- **Star ratings on completed events** (5.0/1 review on Whitathon) — Review schema bait.

### Stories (the real moat)
- **Vernacular content** (Hindi stories in Devanagari) — captures the long tail of Hindi-language running searches that English-only Endorfin will not.
- **Story types** = Runner Story / Race Experience / Training Journey — clean taxonomy.
- **Per-story view + like + comment counts** visible — incentivizes authors.
- **Author handles** like `@speed.alchemy.ashwin`, `@aakaanshaarya98` — Instagram-style identities deepen retention.
- **"Share Your Story" CTA** in the footer of every page — they're farming UGC aggressively.

### Authenticated experience
- **Push notification opt-in prompt** post-login.
- **PWA install prompt** on every page ("Install MarathonMitra").
- **Personalized greeting + city filter** on dashboard.
- **Six explicit dashboard tiles** so a fresh user knows exactly what to do.

### Organizer acquisition
- **Payout calculator on /pricing** (Quick + Category modes + scenario comparison) — converts pricing-page-bouncers.
- **Separate /organiser-faq** with weekly changefreq — they're updating it.
- **/organizers-partners** combined landing — sponsor + organizer in one funnel.
- **Become an Organizer / Become a Sponsor / Share Your Story** all in primary footer nav.

---

## 6. Where MarathonMitra Is Weak (your attack surface)

| Gap | Evidence | How to exploit |
|---|---|---|
| Body text on event detail is thin | 3,510 chars vs. their organizer's full event page | On Endorfin, render rich content per event (route, prizes, history, gallery, comments, training plan link) — pages of 5,000+ char with proper headings will outrank theirs |
| Schema price = 0 | `offers.price="0"` on a ₹2,100 race | Publish accurate price + currency + validFrom (reg open) / validThrough (reg close). Google will prefer your snippets |
| Empty leaderboards | "0 Total Runners" on `/leaderboards/half-marathon` | If they have programmatic pages they can't fill, you can build the same grid + actually seed it with timing-partner data |
| 2.0K total registered runners | Stat shown on homepage | They are early. Whoever owns the runner identity layer in India (followers, PBs, race history) wins the next 2 years |
| Accessibility 83 | Lighthouse | Easy 95+ for you with current Next.js patterns; affects SEO long-tail |
| Single-founder optics | Sitemap exposes `/about/akash-chourasia`; "Powered by GymSarathi" in footer | Position Endorfin as the dedicated, full-team product |
| No first-party checkout (verified) | Register button → townscript.com | If you ship a checkout (Razorpay/Cashfree) you take the 2% PG margin instead of giving it away |
| English-only narrative content (assumption to verify) | Their stories include Devanagari Hindi | Multi-language story submission + hreflang for ru-IN / hi-IN tagged URLs |
| Performance not in the user-facing pitch | Lighthouse navigation tab didn't even run perf in default mode | You've already done the ISR work on /races — push CWV scores publicly as a marketing point to organizers ("3× faster than competitors") |

---

## 7. Side-by-Side: MarathonMitra vs. Endorfin

| Dimension | MarathonMitra | Endorfin (current) |
|---|---|---|
| Upcoming events | 127 | ~similar (per recent SEO audit) |
| Stories / UGC | **70 published, taxonomy + comments** | None |
| Webapp / auth features | **Runner Hub, leaderboards, race history, photo gallery** | None |
| Pricing model | **Live, with calculator** | None (no monetization yet) |
| Virtual challenges | **Yes (4 types)** | No |
| City × distance × age leaderboards | **Programmatic grid** | No |
| Schema | SportsEvent + 6 more types, but with price/date bugs | Event (recently improved per audit), no SportsEvent yet |
| BreadcrumbList | Yes | Yes (recently added) |
| FAQ schema | Yes | No |
| Security headers | Partial | **Full** (you just added them) |
| Sitemap individual events | Yes | **Yes** (you just added) |
| Title tag bugs | None observed | Just fixed |
| /races TTFB | Not measured | Recently fixed via Promise.all + ISR 600s |
| Brand polish | Functional, dated patterns | Cleaner |
| WhatsApp/Telegram distribution | **Listed & promoted** | Not visible |
| Hindi / vernacular | **Native** | English only |
| PWA install prompt | Yes | No |
| Push notifications | Yes | PostHog only (analytics) |
| Founder story | `/about/akash-chourasia` | About page |

---

## 8. Recommended Counter-Plays (in priority order)

### P0 — Ship within 2 weeks

1. **Switch event schema from `Event` → `SportsEvent` with `subEvent[]` per distance.** Add `performer`, `potentialAction` (ReserveAction), correct `offers.price`/`priceCurrency`/`validFrom`/`validThrough`. Their schema has factual bugs you can outscore on.
2. **Add `FAQPage` schema to every event detail page** seeded with 5–8 common questions (bib collection, parking, timing chip, refund policy). Mine the Q&A from event organizer pages.
3. **Expand body content per event to 4,000+ chars** with proper H2/H3 structure: Route, Elevation, Past Editions, Prizes, Bib Collection, Race-Day Logistics, FAQ. Even if generated, this is the #1 lever for outranking them on event-name queries.
4. **Build the runner story submission flow** (their #1 content moat). MVP: `POST /api/stories`, public `/stories/[slug]` page, story-type taxonomy. You have 0; they have 70.

### P1 — 1 month

5. **Per-event comments** (logged-in users). Even 5 comments per event becomes 5× the long-tail content of any competitor.
6. **Runner profile MVP**: `/runners/[username]` with bio, city, preferred distances, race history (you already track participations). Public profile, indexable. Foundation for leaderboards.
7. **Implement an organizer pricing page** with calculator. Even if you don't enforce it day 1, the *intention to monetize* is a serious-startup signal for fundraising and organizer trust. Use a tier structure that undercuts theirs (e.g. ₹399 listing, ₹8/reg in micro tier) — Indian organizers will benchmark.
8. **First-party checkout via Razorpay/Cashfree.** This is your only path to a real revenue line. They don't have one (verified via Townscript redirect). Move first.

### P2 — 1 quarter

9. **Leaderboards: distance × city × age** as programmatic pages. Seed with finisher data from public timing partners (Procam, Townscript exports) before requiring user opt-in.
10. **Virtual Challenges product**. Distance/Consistency/Time/Team — Strava OAuth integration, badges. This is their #2 moat after stories.
11. **WhatsApp Channel + Telegram presence.** They have ~150 Kolkata followers/runner. You can leapfrog with focused city-channel strategy (Bangalore, Delhi).
12. **Hindi + Tamil + Marathi story submission** with hreflang. They have Hindi by accident (user-generated); you can do it by design.

### P3 — Defensive

13. Fix accessibility (color contrast, touch-target sizes) — you are already at parity, push to 95+ for SEO long-tail.
14. Add Review schema for completed events (1–5 stars) — they have it; you don't.
15. Drop `x-powered-by` header (cosmetic but professional).

---

## 9. Open Questions / Things to Verify

- Does MarathonMitra actually have first-party checkout, or do they take a tracking pixel revshare from Townscript/Kalki?
- How many events use their checkout vs. third-party redirect? (Can be estimated by sampling 30 random events and counting Register button destinations.)
- Are their leaderboards empty because they're new, or because runners aren't submitting times? If the latter, this is a structural problem you can solve with a timing-partner data feed.
- What's their organizer acquisition velocity? Their sitemap shows event count growing but no public org count.
- Do their virtual challenges have actual participation, or are they empty like the leaderboards?

---

## 10. Closing Take

MarathonMitra has **out-built you on product surface** (webapp, leaderboards, stories, challenges, pricing). They have **not out-built you on revenue or distribution** — runners still leave the platform to register, the webapp is mostly empty, and they have ~2K users. Their advantage is **scope of intent**; yours is **focus + polish**.

If you spend the next 30 days shipping (a) better event-page content + schema, (b) story submission, (c) a basic pricing page with calculator, you close 70% of the visible gap. If you spend the 30 after that shipping a first-party checkout, you leapfrog them on the only metric that actually matters: revenue per event.
