# Townscript Competitive Audit

**Date:** 2026-05-15
**Auditor:** Claude (via Chrome DevTools)
**Target:** https://www.townscript.com/
**Operator:** Townscript (independent), with Townhall as sister product for virtual events
**Reference:** Endorfin (https://www.endorfin.run/) — payment gateway coming soon
**Companion docs:** `marathonmitra-audit.md`, `indiarunning-audit.md`

---

## 1. TL;DR — Why Townscript Matters

Townscript is the *infrastructure layer* underneath a huge chunk of Indian event ticketing. They are **not running-specific** — they sell ticket checkout for conferences, college fests, workshops, marathons, treks, entertainment, meetups, anything. Marathons are one vertical. Their published scale: **29,983 organizers, 117,876 events created, 2.4M tickets sold across 6,140 cities.**

For Endorfin's poach plan this matters a lot:

1. **Many of the races we scrape from IR / list from MarathonMitra actually run their checkout on Townscript.** The Freedom Bengaluru Half Marathon's "Register" button on MarathonMitra and the "Register" button on IndiaRunning both end at `townscript.com/e/freedom-bengaluru-half-marathon-2026-241410`. So Townscript is *the* neutral commerce layer the mid/long-tail of Indian race organizers actually trust.
2. **Their pricing is fully public and benchmarks where serious self-serve organizers expect to land:** India = **1.99% + ₹10 per ticket** (organizer fee) + **1.75% (domestic) / 2.9% (international)** PG fee. Plus a **₹20 platform fee charged to the buyer, not the organizer**. On a ₹1,000 ticket the organizer keeps **₹941.10** (94.1%).
3. **They actually pay organizers daily** ("Fastest Money Clearance / one-day dues clearance"). This is what IndiaRunning *cannot* match (IR settles only post-event per their public T&C). It's also the bar Endorfin must clear.
4. **They sell timing services too** — BIB tags, decoders, mats, results portal, race-pack collection. Their value-prop to race organizers is "we'll handle checkout, timing, and on-spot registration in one place."
5. **They expose a public API** (`townscript-api.readme.io`) for developers to integrate Townscript into their own sites.

The good news: Townscript is genuinely old (footer copyright "@2019", Lighthouse best-practices 54, Express on Node backend, third-party cookies, broken canonical, no llms.txt). The product is mature but unloved. Their event detail pages use generic `Event` schema (not `SportsEvent`), no `FAQPage`, no `BreadcrumbList`, no `subEvent` for distances. **A modern running-vertical-focused product can out-experience them.**

The bad news: their pricing is the floor. Endorfin cannot win the IR-poach pitch ("save ₹2 lakhs") and lose to Townscript by being more expensive than them. If Endorfin charges more than ~6% all-in on India transactions, organizers will use Townscript instead of you for the registration backend even if they list with you for discovery.

**Strategic conclusion:** Endorfin's price needs to be ≤ Townscript on the registration backend, while owning the running-runner-organizer triangle that Townscript doesn't care about (since they serve 7 verticals).

---

## 2. The Pricing in Detail (India)

From `https://www.townscript.com/i/pricing` (live calculator):

### Per-ticket cost structure
- **Townscript fee:** 1.99% + ₹10 per ticket (organizer pays)
- **Payment gateway fee:** 1.75% domestic / 2.9% international per ticket (organizer pays)
- **Platform fee:** ₹20 per ticket — **charged to the buyer**, not the organizer
- **Taxes:** all fees exclusive of taxes (GST 18% applies on top of the Townscript fee separately)
- **Setup cost:** ₹0
- **Listing cost:** ₹0
- **Free events:** ₹0 platform fee (only paid events incur the fee)

### Live calculator example (₹1,000 ticket × 1 ticket, 0% organizer tax)
| Line | Amount |
|---|---|
| Ticket price | ₹1,000 |
| PG fee (1.75% + GST + flat) | ₹29 |
| Townscript fee (1.99% + ₹10 + GST) | ₹29.90 |
| Platform fee (charged to buyer) | ₹20 |
| **Amount payable by buyer** | **₹1,020** |
| **Money to organizer** | **₹941.10** |

Organizer effectively pays ~5.9% of ticket value. Buyer pays a 2% surcharge.

### How this compares
| Platform | Effective organizer take (₹1,000 ticket) | Settlement timing |
|---|---|---|
| **Townscript India** | ~5.9% (₹58.90) | T+1 daily |
| **MarathonMitra** | ₹10/reg + 18% GST + 2% PG + 1% comms ≈ 4.5% | Not in checkout business |
| **IndiaRunning** | 30–50% per T&C (often passed to buyer as surcharge) | Post-event only |
| **Endorfin (proposed)** | Must be ≤ Townscript's 5.9% to win backend | TBD — aim for T+2 |

### What Townscript *charges separately* (paid value-added services)
From the race-management page:
- Townscript timing services (BIB tags, mats, decoders, results portal, SMS result intimation, manpower) — quoted separately, no public price.
- Race-pack collection / participant check-in (BIB or phone or email check-in, automated kit allocation, attendee announcement system, spot registration) — quoted separately.
- Professional mobile-friendly SEO-optimized website with sitemaps + fast load times + free hosting + CMS + real-time feeds — value-added paid service.
- Townscript Newsletter promotion.
- Social media marketing.
- Paid digital media marketing.

This is significant: Townscript's true business model is **base ticketing fee at low margin + paid value-added services at higher margin**. Endorfin can either match each layer or focus on bundling them by default into a single per-registration price.

---

## 3. Product Surface

### Public web (www.townscript.com)
- `/` (with `/in/india` for India) — Homepage: search by city/event, popular events carousel, browse by category, featured cities.
- `/e/{slug}-{id}` — **Event detail page** with the full event description, gallery, organizer info, ticket categories, embedded checkout.
- `/{city}` — Per-city landing pages: Pune, Mumbai, Bangalore, Delhi, Hyderabad, Chennai, Jakarta, Bali, Singapore, Dubai (true international footprint).
- `/i/pricing` — Public pricing with live calculator.
- `/i/how-it-works` — Organizer onboarding pitch.
- `/organize/race-management-platform` — **Marathon-specific landing page** with timing services + stats + testimonials.
- `/organize/college-fest-management-software` — College-fest landing.
- `/i/conference-registration`, `/i/workshops-and-trainings`, `/i/marathon-cycling-trips-treks-registration`, `/i/entertainment-events-ticketing`, `/i/meetup-registration`, `/i/treks-trips-registration` — Per-category SEO pages.
- `/organize/best-eventbrite-alternative`, `/organize/peatix-alternative-why-townscript-is-better-than-peatix` — Comparison/alternative SEO pages.
- `/organize/event-management-software`, `/organize/online-event-registration-and-ticketing-platform`, `/organize/event-ticketing-website` — Bottom-of-funnel SEO landing pages.
- `/sitemap` — HTML sitemap.
- `/about-us`, `/contact-us`, `/terms-and-conditions`, `/privacy-policy`.

### Auth / signup
- `/signin`, `/signup` — both link to "CREATE EVENT" CTA.
- Email + password auth (not OTP).

### Organizer dashboard (separate app)
- `/dashboard/create-event` — Direct dashboard URL exposed from homepage "CREATE EVENT" CTA.

### Mobile apps
- iOS: "Townscript Event Manager" (id1441088900)
- Android: `com.dyulok.android.organizerapp` (organizer-side app)
- Note: **organizer-facing app**, not attendee-facing. Attendees register via browser.

### Developer ecosystem
- `townscript-api.readme.io` — Public REST API docs.
- Mobile Analytics powered by Mixpanel (partner badge in footer).

### Sister product
- **Townhall** — Virtual conference platform (live + recorded sessions, branded). Featured prominently on homepage as a separate product surface.

### Content / blog
- `blog.townscript.com` — General blog.
- `eventmagazine.townscript.com` — Event-organizer magazine (content marketing).
- `productblog.townscript.com` — Product update log.
- `engineering.townscript.com` — Engineering blog (talent acquisition / dev-rel).

---

## 4. Organizer Features (from "How it works" + race-management landing)

Five-step onboarding (per the how-it-works page):
1. **Create Events** — Sign up + fill event details in under a minute.
2. **Create Tickets** — Multiple ticket tiers.
3. **Customise Events** — Branding, content.
4. **Start Selling** — Live ticket sales.
5. **Manage Registration** — Dashboard for attendees, discounts, refunds.

Features explicitly claimed:
- **Custom registration forms** — checkbox, text input, multiple-choice.
- **Ticket Sale Widget** — embeddable checkout on organizer's own website (no redirect).
- **Fastest Money Clearance** — daily bank deposits.
- **24×7 customer service** — phone + email + social.
- **Socially shareable event pages**.
- **International registrations** — multi-currency support across 27+ countries.
- **Discounts management**.
- **On-spot / day-of registration management**.

Race-specific organizer features:
- **One-click refund / cancel registration**.
- **Edit attendee details** post-purchase.
- **Transfer tickets** between attendees.
- **Sell from your website or Facebook**.
- **One-day dues clearance** (T+1 daily payouts).
- **Townscript timing services** — UHF BIB tags + mat decoders at start/end + results portal + SMS result intimation + manpower support.
- **Race-pack collection service** — BIB/phone/email check-in + automated kit allocation + spot reg + attendee announcement system.

Testimonials cited on race page (real organizers):
- Ravi Handa, handakafunda.com — "Doubled my business in 1 year."
- Satish Talim, Go and Ruby Hobbyist — "Easiest tool for tech conferences."
- Saurov Kakoti, Headrush — "Improves interface and customer experience."
- Sujata Bogawat, SLP Pune.
- M. Asif, Nature Knights — "Edge in business and technology."

### G2 reviews
- 51 reviews on G2Crowd (independent), badge link from footer.

---

## 5. Tech & SEO Findings

### Stack
- **Frontend:** Likely AngularJS / older Angular era (the URL routing pattern + heavy client-side rendering + `/i/` prefix path + Express backend + Mixpanel partner badge all point to a 2016–2019 build that's been incrementally maintained).
- **Backend:** `x-powered-by: Express` (Node.js).
- **Server:** nginx in front of Express.
- **Hosting/CDN:** AWS S3 + CloudFront (`s3.ap-south-1.amazonaws.com`).
- **Analytics:** Mixpanel (visible partner badge in footer).
- **Cookie auth:** `ipInfoData` cookie sets country + city for geo personalization.

### Security headers
- ✅ X-XSS-Protection
- ❌ Missing: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP
- ❌ Leaks `x-powered-by: Express`
- ❌ Lighthouse flags third-party cookies + deprecated APIs.

Endorfin is materially ahead on security headers (you have HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy from the recent SEO audit fixes).

### robots.txt
```
User-agent: *
Disallow:

User-agent: Googlebot
Disallow: /s/*
Disallow: /mobile/search/$
Disallow: /search/*
Disallow: /timing/*
```
Properly structured. Allows everything except internal search and timing endpoints.

### Sitemap
- `https://www.townscript.com/sitemap.xml` is a **sitemap index** (proper multi-file structure):
  - `static-pages.xml`
  - `past-event-pages.xml` — **40,000 URLs**
  - `upcoming-event-pages.xml` — **7,910 URLs**
  - `organizer-pages.xml` — **7,422 URLs**
  - `organizer-landing-pages.xml`
  - 12 per-city sitemaps (Chennai, Kolkata, Jaipur, Chandigarh, Pune, Mumbai, Indore, Kochi, Bangalore, Delhi, Hyderabad, Ahmedabad)
- **Total indexable footprint: ~55,000+ URLs.** Approximately 30× IndiaRunning and 30× MarathonMitra.

### Schema (event detail page)
- ✅ `WebSite` (basic)
- ✅ `Event` (generic — NOT `SportsEvent`)
- ✅ `AggregateOffer` with `lowPrice`, `priceCurrency`, `availability`, `validFrom`
- ✅ `performer` (Organization = organizer)
- ✅ `description`, `image`, `startDate`, `endDate`, `location` with `Place` + `PostalAddress`
- ❌ No `SportsEvent`, no `subEvent[]` for race distances
- ❌ No `FAQPage`
- ❌ No `BreadcrumbList`
- ❌ No `Review` / `AggregateRating`
- ❌ **`canonical` link points to homepage** (`https://www.townscript.com/`) — Lighthouse flagged this. Self-canonical missing → potential duplicate-content issue.

### Lighthouse (mobile, event detail page)
- **Accessibility: 91** — best in class (better than IR 73, MM 83, Endorfin TBD)
- **Best Practices: 54** — worst in class (third-party cookies, deprecated APIs, frame-title missing, console errors, inspector issues)
- **SEO: 92** — docked for canonical bug + missing llms.txt
- **Agentic Browsing: 67**
- Performance not measured.

### Title / meta on event page
- Title: "Freedom Bengaluru Half Marathon Tickets by Kalki Sports, Sunday, 24 May 2026, Bengaluru Event" — descriptive, no truncation.
- Description: Generic template ("Online event Registration & ticketing page of {Event}. Buy Tickets for this {City} Event organized by {Org}.")
- OG image, OG title, OG description present.
- No Twitter card tags found.
- Body length: **7,599 chars** — best of the three competitors (MM 3.5k, IR 4k).

---

## 6. UX / Patterns Worth Noting

### Things they do well
| Feature | Where | Why it matters |
|---|---|---|
| Live pricing calculator with country/currency selector | `/i/pricing` | Removes all pricing FUD before signup. |
| "Money to you" + "Buyer pays" + per-ticket breakup | Pricing calculator | Honest, transparent. Organizers can budget. |
| Free for free events | Pricing | Low-friction onboarding for community races. |
| Multi-currency support across 27+ countries | Throughout | Few competitors can match; useful for diaspora races. |
| Marathon-specific landing page with timing services | `/organize/race-management-platform` | Doesn't pretend they're a running platform — sells running as a vertical with its own product. |
| Embeddable widget | "Ticket Sale Widget" | Organizer can keep traffic on their own domain. |
| Public REST API | `townscript-api.readme.io` | Lets organizers/timing partners integrate. |
| Sitemap index with separate files per type + per city | sitemap.xml | Scales to 55k URLs cleanly. |
| One-click refund + transfer + cancel | Organizer dashboard | Matches BookMyShow-tier expectations. |
| T+1 settlement | "One-day dues clearance" | Cash-flow advantage; this is the bar Endorfin must meet. |
| Hashtag chips on event pages | Event detail | `#half marathon #5km #10km` — clean visual nav. |
| AggregateOffer with `lowPrice` | Schema | Google Knowledge Panel shows "from ₹825". |
| Mobile organizer app (iOS + Android) | App stores | On-spot kit collection / check-in. |
| Engineering + product blogs | engineering.townscript.com, productblog.townscript.com | Dev-rel + organic SEO. |
| G2 + testimonials with photos and roles | Race page + footer | Real social proof. |

### Things they do poorly
| Issue | Where | How Endorfin can exploit |
|---|---|---|
| `canonical` points to homepage on event pages | All `/e/*` pages | Endorfin's per-page canonicals → outrank duplicate URLs. |
| Generic `Event` schema, no `SportsEvent` / `subEvent` / `FAQPage` | Event detail | Endorfin's richer schema wins SERP real estate. |
| No `Review` / `AggregateRating` schema despite organizer reviews on platform | Event detail | Endorfin can ship review schema and capture star snippets. |
| No Twitter cards | Event detail | Easy fix to win social shares. |
| Footer "Copyright @2019" | Sitewide | Visible stagnation signal in marketing. |
| Best Practices 54 (third-party cookies, deprecated APIs) | Lighthouse | Modern stack is a credibility win. |
| Missing HSTS, X-Frame-Options, CSP | Security headers | Enterprise organizers (corporate/charity races) care about security audits. |
| English-only (no Hindi/regional language event pages) | Throughout | Endorfin can offer Hindi event content; MarathonMitra has it accidentally. |
| Generic platform — running is one of 7 verticals | Strategic | Running-specific UX (distance × age leaderboards, route maps, training plan links, race photos) is a wedge. |
| OTP / email auth only — no Google/Apple SSO | Signup | Endorfin can offer faster signup. |
| No first-class "stories" or runner profiles | Strategic | Both MarathonMitra and Endorfin can build community moats Townscript will not. |
| No public API for runner-side data (only organizer) | Developer ecosystem | Endorfin can publish a runner stats API for fitness apps. |

---

## 7. Strategic Comparison: 4-Way Side-by-Side

| Dimension | IndiaRunning | Townscript | MarathonMitra | Endorfin (current) |
|---|---|---|---|---|
| **Vertical** | Running-only | Generalist (7 verticals) | Running-only | Running-only |
| **Footprint** | 91 upcoming events | 55,000+ indexed URLs | 1,959 URLs | ~200+ races, growing |
| **First-party checkout** | ✅ Razorpay | ✅ Razorpay + multi-currency | ❌ Redirects to TS/IR | 🟡 Coming soon |
| **Public pricing** | ❌ Hidden (talk-to-sales) | ✅ Calculator | ✅ Calculator | ❌ — **ship next** |
| **Take rate** | 30–50% (per T&C) | ~5.9% all-in | ~3–5% effective | TBD |
| **Settlement timing** | Post-event only | **T+1 daily** | n/a | TBD — aim T+2 |
| **Non-refundable platform fee on cancellation** | ✅ Per T&C | Not explicit | n/a | — |
| **Embeddable checkout widget** | ❌ | ✅ | ❌ | ❌ |
| **Public REST API** | ❌ | ✅ readme.io docs | ❌ | ❌ |
| **Timing services (BIB/mats/decoders)** | ❌ | ✅ Paid add-on | ❌ | ❌ |
| **Race-pack/check-in service** | ❌ | ✅ Paid add-on | ❌ | ❌ |
| **JSON-LD Event schema on event pages** | ❌ Zero | ✅ Event + AggregateOffer | ✅ SportsEvent + 6 more types | ✅ Event + BreadcrumbList |
| **FAQPage schema** | ❌ | ❌ | ✅ | ❌ |
| **SportsEvent + subEvent[] per distance** | ❌ | ❌ | ✅ | ❌ — **ship for parity** |
| **Canonical correctness** | OG/canonical conflict | ⚠️ Points to homepage (bug) | ✅ | ✅ |
| **robots.txt** | ❌ 404 | ✅ | ✅ | ✅ |
| **Sitemap** | ✅ 142 URLs | ✅ Sitemap-index, 55k+ URLs | ✅ 1,959 URLs | ✅ Recently improved |
| **Lighthouse SEO** | 100 | 92 (canonical docked) | 100 | High |
| **Lighthouse A11y** | 73 | 91 | 83 | TBD |
| **Lighthouse Best Practices** | 88 | 54 | 96 | High |
| **Security headers (HSTS, CSP, XCO)** | Strong CSP, HSTS | Weak (XSS only) | Partial | ✅ Strong (recent fix) |
| **Mobile apps** | ✅ iOS+Android (attendee) | ✅ iOS+Android (organizer) | ✅ PWA | ❌ |
| **Multi-currency** | INR only | 143 currencies | INR only | INR only |
| **International market footprint** | India only | India + 27+ countries | India only | India only |
| **Free listing tier** | ✅ Implicit | ✅ Free for free events | ✅ Discovery only | n/a |
| **Reviews / ratings (UI + data)** | ✅ Real reviews + counts | ✅ G2 51 | ✅ Star ratings | ❌ |
| **Community / UGC / stories** | ❌ | ❌ | ✅ 70 stories | ❌ |
| **Runner profiles + leaderboards** | ❌ | ❌ | ✅ (empty) | ❌ |
| **Sister products** | Fitpage (training) + Ascend Liv (nutrition) | Townhall (virtual events) | Powered by GymSarathi | None |
| **Engineering blog / dev-rel** | ❌ | ✅ engineering.townscript.com | ❌ | ❌ |
| **English-only** | ✅ | ✅ | Hindi UGC by accident | ✅ |
| **Visible product staleness signals** | Some (rebrand legacy bombayrunning) | ✅ Strong (Copyright @2019, Express, AngularJS-era) | None obvious | Brand-new |

---

## 8. Re-Calibrated Endorfin Pricing

Given Townscript sets the floor, my earlier "₹25/registration + 2% PG" recommendation in the IR audit needs revision.

### Townscript's effective take on common ticket prices (India, domestic cards)

| Ticket price | TS fee | PG fee | Buyer platform fee | Organizer keeps | Effective % |
|---:|---:|---:|---:|---:|---:|
| ₹500 | ₹19.95 | ₹14.50 | ₹20 | ₹465.55 | 6.9% |
| ₹1,000 | ₹29.90 | ₹29.00 | ₹20 | ₹941.10 | 5.9% |
| ₹2,000 | ₹49.80 | ₹58.00 | ₹20 | ₹1,892.20 | 5.4% |

### Recommended Endorfin pricing tiers

| Bracket | Take | Settlement | Notes |
|---|---|---|---|
| **Free events** | ₹0 | n/a | Match Townscript free tier. |
| **Paid events — Standard** | **₹15/reg + 2% PG passthrough** (no separate buyer fee) | T+2 business days | On a ₹1,000 ticket: organizer keeps ~₹965 (3.5% effective vs Townscript's 5.9%). Buyer pays the listed price; no hidden surcharges. |
| **Paid events — Growth** (1,000+ regs) | **₹25/reg + 2% PG** | T+2 | Slightly higher fixed reg fee but still ~3.7% effective on ₹1,000. |
| **Optional pre-event payout** | +1% fee | 50% released T-14 | This is the moat IR cannot match. |
| **Add-ons** | Custom quote | — | Timing services, bib expo logistics, photo gallery — outsource via partner, mark up modestly. |

This is **40–50% cheaper than Townscript** *and* still profitable for Endorfin. The marketing pitch becomes single-sentence:

> "Other platforms take 5.9% to 50%. Endorfin takes 3.5% — and you can get 50% of your money 14 days before race day."

### Why this is sustainable
- Razorpay net cost is ~1.6–1.8% domestic. Endorfin's 2% passthrough = ~0.2% margin on PG.
- ₹15/reg covers infra cost (S3 + Vercel + email + SMS) at ≥10x markup.
- Pre-event payout is float-based — Endorfin takes 1% to underwrite chargeback risk (typically <0.5%).

---

## 9. Recommended Plan — Re-Sequenced

Combining all three audits (IR, MM, TS):

### P0 (within 4 weeks) — required to compete at all
1. **Public pricing page** at `endorphin.run/pricing` with a live calculator. Show **side-by-side** vs IndiaRunning, MarathonMitra, and Townscript using the public numbers. This is the *most important* marketing asset Endorfin can ship.
2. **Razorpay first-party checkout** — without this, the rest is hypothetical.
3. **Per-event content + schema upgrade** — `SportsEvent` + `subEvent[]` per distance + `FAQPage` + `BreadcrumbList` + `AggregateOffer` (lowPrice) + `Review` schema. All four competitors miss at least one of these.
4. **Self-canonical link on every event page** — fix the same bug Townscript has.
5. **Organizer dashboard MVP** — create event → tickets → publish → live sales count → CSV export → one-click refund. Full feature gap table is in `indiarunning-audit.md` §4.5.

### P1 (weeks 4–8) — close feature gaps with TS
6. **Embeddable widget** so organizers can keep traffic on their own domain (like TS Ticket Sale Widget).
7. **Multi-currency support** if any diaspora races on the radar (Townscript supports 27+ countries; this is a competitive moat for international races).
8. **Discounts: 3 coupon types** (unique reusable, bulk allocated Excel, event-wide early-bird).
9. **Hot Leads / abandoned-cart recovery** (IR has it; TS doesn't surface as a feature).
10. **Daily T+1 settlement** to match TS.

### P2 (weeks 8–12) — differentiation moves no competitor has
11. **Pre-event 50% payout (T-14)** — single biggest differentiator. IR cannot match. TS does not offer.
12. **Public API for runner-side data** (race history, PBs, photos) — Townscript only has organizer API.
13. **Runner identity layer** (profile, race history, leaderboards) — MarathonMitra is also building this but it's empty. Win it by seeding with timing-partner data.
14. **Per-event microsite subdomains** (e.g. `freedom-bengaluru.endorfin.run`) — no competitor offers this.
15. **Hindi/regional language event pages** with hreflang — Townscript and IR are English-only.

### P3 (months 4–6) — ecosystem
16. **Timing-partner integration** (with companies like AsiaPacific Timing, Sports Timing Solutions) so finisher data flows automatically. Townscript bundles their own timing — Endorfin can partner with all of them.
17. **Engineering / product blog** — Townscript has one; it's a real organic-search asset.
18. **Mobile organizer app** (PWA first, native later) — for race-day kit collection, on-spot reg, check-in.

---

## 10. Outbound Playbook — Three Distinct Segments

The combined audit landscape suggests three different cold-pitch templates:

### A) Targets currently on IndiaRunning paying 30–50%
*Pitch the savings vs IR. Their event pages on IR are easy to find — sitemap.xml has 91 URLs. Many of these are mid-size charity / corporate races that probably don't have the leverage to negotiate IR down to 30%.*

> "Saw [Event]. Per IR's own T&C they take 30–50% of your revenue and settle only after the event. We take ~3.5% and you can pre-draw 50% T-14. On your event size that's +₹2 lakhs back in your pocket."

### B) Targets currently on Townscript paying ~6% but want better UX
*Pitch the running-specific product. They're price-sensitive but appreciate purpose-built tools. Their event pages on TS are easy to find — sitemap has 7,910 upcoming events filtered by /e/.*

> "You're already paying Townscript ~6%. We're 3.5% all-in, *and* we're running-specific: runner profiles, race photos, leaderboards, FAQ-rich event pages that rank on Google. Same one-click refund, T+1 payouts, plus 50% pre-event payout if you want it."

### C) Targets currently on MarathonMitra (free discovery, no checkout)
*Pitch the checkout. MM doesn't actually process payments — these organizers are using a third-party checkout (often Townscript). Endorfin can replace the third party.*

> "You're listing on MarathonMitra and your checkout is on Townscript? We can do both — your discovery + your checkout, in one place, at 3.5% all-in instead of ~6%."

---

## 11. Bottom Line

Townscript is the **invisible utility** Endorfin must price against, even though we won't directly fight them for marketing share. They don't market to runners; they sell ticket commerce. Their pricing (5.9% all-in) is the *floor*, not the ceiling — Endorfin's all-in cost to an organizer must come in lower or comparable, otherwise serious organizers will keep using Townscript for the backend and listing on whoever has runners.

The biggest practical takeaways:

1. **Endorfin's pricing should be ≤ Townscript's effective take. Recommended: ₹15/reg + 2% PG passthrough, all-in, no buyer surcharge.** Marketing this as "3.5% on ₹1,000 vs Townscript's 5.9% vs IR's 30–50%" is the cleanest pitch.
2. **T+1 or T+2 settlement is table stakes** — Townscript already offers it. Endorfin must too.
3. **Pre-event 50% payout (T-14) is the moat.** Townscript doesn't do it (probably can't underwrite the risk across 7 verticals). IR's T&C explicitly excludes it. Endorfin can build it for ~1% extra fee and absorb chargeback risk.
4. **The schema-rich, running-vertical-specific product** is what Townscript will never build — they serve too many verticals. Endorfin's per-event content depth + runner profiles + leaderboards + photos is the long-term moat.

If Endorfin ships P0 in 4 weeks (pricing page + Razorpay + schema + organizer dashboard), it can credibly pitch every organizer on IR's 91-event sitemap and Townscript's 7,910-event upcoming sitemap.
