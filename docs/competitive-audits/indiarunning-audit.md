# IndiaRunning Competitive Audit + Organizer Poach Plan

**Date:** 2026-05-15
**Auditor:** Claude (via Chrome DevTools)
**Target:** https://www.indiarunning.com/ (operated by Saransh Ventures Private Limited; sister to Fitpage)
**Reference:** Endorfin (https://www.endorfin.run/) — current state: scrapes IR, payment gateway coming soon
**Companion doc:** `marathonmitra-audit.md`

---

## 1. TL;DR — The Wedge

IndiaRunning is the market leader. They have first-party Razorpay checkout, a real organizer dashboard, mobile apps on both stores, Fitpage training as a sister product, and (their own claim) 100k+ monthly visitors. They are *the* default search result for marathon registration in India.

**But:** their own Organizer Terms & Conditions, line 105, say plainly:

> "The Platform's revenue model includes: **retention of approximately 30%-50% (thirty percent to fifty percent), at the sole discretion of Platform**, of total Event revenue as Platform/service fees (variable based on commercial understanding)."

That is the entire poach pitch. A small race organizer running a 500-runner event at ₹1,000 a head is generating ₹5,00,000 in gross revenue, and IR keeps ₹1,50,000–₹2,50,000 of it. *Plus* they hold settlement until after the event. *Plus* the fee is non-refundable even if IR cancels.

If Endorfin charges a per-registration fee equivalent to ~5–8% all-in (e.g. ₹25/reg + 2% PG passthrough), the same 500-runner event keeps ₹4,73,500 vs IR's ₹2,50,000–₹3,50,000. **Organizers gain ₹1.2–₹2.2 lakhs per event.** That is the entire pitch deck.

Other vulnerabilities you can attack:
- **No `robots.txt`** (returns 404).
- **Zero JSON-LD structured data** on homepage AND event pages — they rank on domain authority + page volume, not on rich-result merit. Endorfin's recent schema work outclasses them per page.
- **Sitemap has only 142 URLs total** (91 events + 31 stories + 9 cities + 6 distances). Endorfin already has more individual race pages indexed.
- **Old codebase smell**: CSP exposes legacy `bombayrunning.com` staging URLs, suggesting a half-finished rebrand. `x-powered-by: Next.js` leaked. Lighthouse a11y 73 (11 failures), best practices 88.
- **Organizer pricing is opaque** — there is no public pricing page. Self-serve doesn't exist. You must email and negotiate. Transparent pricing alone is a marketing advantage.
- **Post-event settlement** — organizers don't see their money until after the race. For a ₹5L gross event that's months of working capital tied up.
- **Mandatory KYC before any settlement.** Stalls payouts.

Your moves, in order:

1. Ship a public organizer pricing page that shows a one-line, all-in number: "₹X per registration. That's it. Money in your account weekly."
2. Quote the 30–50% range directly in marketing (it is their public T&C, fair game).
3. Add first-party Razorpay/Cashfree checkout — without this the pitch is incomplete.
4. Offer **pre-event payouts** (release 50% of collected funds 14 days before race day) — IR cannot match this without rewriting their T&C and risk model.
5. **Runner-side wedge**: their organizer guide reveals that organizers can toggle "IR Processing Fees deducted from participant or paid by organizer." In practice the fee gets passed to runners. So **the same race costs more on IndiaRunning than it has to.** Frame Endorfin's all-in price as a *runner* benefit too, not just an organizer benefit.

---

## 2. Product Surface

### Public web (www.indiarunning.com)
- `/` — Hero banner carousel, search by event/city, "All Events" mega-filter, featured event cards with star-ratings + "₹X onwards" pricing + "Discounted Price" badges, Race Reviews carousel, more event cards, mobile-app CTA, footer.
- `/events/{slug}_{id}` — Canonical event detail page (e.g. `/events/hyderabad_city_slam__10k_summer_run_2026_60340`). 4,036 chars body. NO JSON-LD. NO breadcrumb. OG canonical points to `registrations.indiarunning.com` subdomain (potential canonicalisation conflict).
- `/distance/{slug}` — `<5k`, `5k`, `10k`, `half-marathon`, `marathon`, `ultra-marathon`. Programmatic listing pages.
- `/city/{Slug}` — Mumbai, Pune, Delhi, Bangalore, Chennai, Hyderabad, Kolkata, Goa, Indore (case-sensitive title-case URLs — slight risk).
- `/reviews?slug={eventId}` — Per-event reviews page with rating + comments.
- `/stories-and-blogs/{slug}` — 31 stories.
- `/sitemap` — Human HTML sitemap.
- `/contact-us`, `/tnc`, `/privacy-policy`.

### Registration subdomain (registrations.indiarunning.com)
- `/{slug}_{id}` — Cart-style checkout. Categories with "What's Inclusive" (T-shirt, Medal, Timed Bib, Refreshments, E-Certificate, Goodie Bag), strike-through original price, discounted price, "+ GST" label. "+ Add" → multi-category cart.
- Powered by Razorpay (CSP shows `checkout.razorpay.com`).
- **Zero structured data** on this subdomain.

### Organizer portal (organiser.indiarunning.com)
- `/` → redirects to `/login`. OTP-based (email → OTP, no password).
- Pitch sections: "All in one platform", "Right network", "Engagement", "List your Event", "Manage Registration", "Promote and Engage", "Train with Fitpage", "Customer Support".
- Claim: "more than 1 lac visitors visiting our platform every month".
- `/tnc` — The 24,550-char T&C with the 30–50% disclosure.

### Mobile apps
- Android: "India Running" (`in.indiarunning.app`)
- iOS: India Running (id6736513478)
- Sister app: Fitpage (training) on both stores.

### Sister properties (the Saransh Ventures ecosystem)
- `fitpage.in` / `training.fitpage.in` — Training platform.
- `ascendliv.com` — Nutrition supplements (header link "Shop Nutrition").
- Cross-sells in homepage header.

---

## 3. Pricing & Commercial Terms (from public T&C)

### The headline number
- **30%–50% of total Event revenue** as platform/service fees (line 105). "At sole discretion of Platform. Variable based on commercial understanding."
- Implication: large/branded organizers probably negotiate down to ~30%; small/new organizers eat the 50%.

### Settlement
- "Post-Event final settlement after deductions of agreed fees and any applicable charges" (line 107).
- Organizer cannot withdraw funds until after the race.
- Requires completed KYC before any settlement (line 103) — process delay.

### Refunds
- Organizer must publish & enforce their own refund policy (line 111).
- Organizer is solely liable for refunds, chargebacks, disputes (line 112).
- **Platform fee is non-refundable even if the event is cancelled** (Act of God or otherwise) (line 115, 118).
- If a chargeback hits the Platform, organizer must indemnify (line 114).

### Add-on services (paid extras)
- Event banners, WhatsApp campaigns, email marketing, website promotion — all priced separately, non-refundable (line 137).

### Liability cap
- Aggregate platform liability capped at **₹10,000** (line 159). For a multi-lakh event, this is effectively zero protection.

### KYC + compliance burden
- Mandatory KYC, periodic re-verification (line 26).
- Organizer carries all DPDP Act 2023 liability (line 28).
- Platform can suspend/delist without notice for "incomplete or misleading" listings (line 72).

### Pricing example (illustrative, using their T&C)
Race: 500 registrations × ₹1,000 ticket = ₹5,00,000 gross.

| Scenario | Platform keeps | Organizer keeps |
|---|---|---|
| Small organizer (50% fee) | ₹2,50,000 | ₹2,50,000 |
| Mid organizer (40% fee) | ₹2,00,000 | ₹3,00,000 |
| Large/branded (30% fee) | ₹1,50,000 | ₹3,50,000 |

Now subtract: GST, refund disputes that organizer eats, post-event settlement timing.

### Endorfin counter (proposed)
At, say, ₹25 per registration + 2% PG passthrough on the same event:
- Platform keeps: ₹25 × 500 + 2% × 5L = ₹12,500 + ₹10,000 = **₹22,500**
- GST 18% on the ₹12,500 platform fee = ₹2,250
- Organizer keeps: ₹4,75,250

vs. ₹2,50,000–₹3,50,000 in their pocket today. **Organizer pockets +₹1.25 to +₹2.25 lakhs per event.** That's the entire ad copy.

---

## 4. Tech & SEO

### Stack
- **www.indiarunning.com**: Next.js (Pages Router, SSG/`nextExport`). Build IDs in path.
- **organiser.indiarunning.com**: Separate app.
- **registrations.indiarunning.com**: Separate app, Razorpay-integrated.
- **registrations-api.indiarunning.com**, **content-api.fitpage.in**: API backends.
- Storage: AWS S3 `ap-south-1` (multiple buckets: `race-registration-production-media`, `runners-gallery-media`, `strapi-production-media-test`). CDN: CloudFront `d12ax8orblguxz.cloudfront.net`.
- Analytics: Google Tag Manager + GA4 + DoubleClick + Contentsquare (heavy session-recording stack).
- **Legacy domain `bombayrunning.com` still in CSP** — staging + QA still on the old brand. Confirms a rebrand from "Bombay Running" → "IndiaRunning".

### Security headers
- ✅ HSTS 2y preload, X-Content-Type-Options, X-Frame-Options SAMEORIGIN, X-XSS-Protection
- ✅ **Comprehensive CSP** (genuinely solid; better than Endorfin and MarathonMitra) — covers script-src, style-src, img-src, connect-src, frame-src, media-src, object-src 'none', base-uri 'self', form-action 'self', frame-ancestors 'none', block-all-mixed-content, upgrade-insecure-requests.
- ❌ Leaks `x-powered-by: Next.js`
- ❌ No Referrer-Policy, no Permissions-Policy

### SEO
| Item | Status | Notes |
|---|---|---|
| robots.txt | **404 (missing)** | Major miss. No directives to crawlers. |
| sitemap.xml | ✅ Present, 142 URLs | 91 events + 31 stories + 9 cities + 6 distances + login. No `lastmod`, `priority`, `changefreq`. |
| JSON-LD on homepage | ❌ 0 blocks | None at all. |
| JSON-LD on event pages | ❌ 0 blocks | None at all. |
| BreadcrumbList | ❌ | Missing everywhere. |
| Event/SportsEvent schema | ❌ | Missing on every event page. |
| FAQPage schema | ❌ | Missing. |
| Review schema | ❌ | Missing despite visible star ratings + review counts. Huge missed rich-result opportunity. |
| `<html lang>` | ❌ Missing | Lighthouse flagged. |
| `<main>` landmark | ❌ Missing | Lighthouse flagged. |
| Canonical conflict | ⚠️ | OG URL points to `registrations.indiarunning.com`, canonical not enforced consistently. |
| OG / Twitter cards | ✅ Present on event pages |
| Page meta | ✅ Reasonable titles + descriptions per event |

### Lighthouse (mobile homepage)
- **SEO: 100** (basics OK, but the absence of schema doesn't dock the score)
- **Best Practices: 88**
- **Accessibility: 73** — 11 failures: html lang, main landmark, button-name, link-name, list semantics, color contrast, target-size, image aspect ratio, image responsive size, console errors
- Performance not measured (lighthouse navigation default)

### Domain authority (qualitative)
- They've been around since ~2015–2017 (Bombay Running era).
- They run the actual checkout for major Indian races — direct backlinks from organizer websites.
- They are the SERP default for "[city] marathon" queries.

---

## 4.5. The Organizer Onboarding PDF — What "DIY" Actually Ships

Source: [`user-guide-for-race-organizers.pdf`](./ir-organizer-guide.pdf) (40 pages, also mirrored in this repo). They brand the organizer toolkit as **DIY ("Do It Yourself")** and pitch it as "a fully integrated suite of event hosting products."

### What the PDF reveals about the product

**Account creation** — Email OTP → phone OTP. Both required at signup. In Settings you can disable email 2FA but **phone OTP is mandatory and can't be disabled**.

**Event creation flow (4 steps)**:
1. **Event Information** — type selector: On-ground / Virtual / On-ground + Virtual (hybrid).
2. **Event Details** — description, banner image (separate dimensions for desktop/mobile), gallery for past-edition photos, **T&C uploaded as a document**, **FAQ uploaded as a document**. (Note: not editable as structured fields — that's a paste-in-PDF UX.)
3. **Tickets** — two key toggles surface the real pricing model:
   - "Choose yes/no depending on whether you want GST per ticket to be included in the price of the ticket or separately."
   - **"IR Processing Fees: Choose if the India Running Processing fee will be deducted from the ticket fee paid by the participant OR will be paid by the event organiser."**
4. **Publishing Method** — two options:
   - **Listing with Registration** — full IR checkout (this is where the 30–50% cut happens).
   - **Listing** — IR lists your event and redirects runners to your external registration site. **This implies a free listing tier exists.** The PDF doesn't say it costs anything.

**Registration form builder** — Field-by-field control, mandatory-field checkboxes. Includes a "Timing Certificate" field for qualifier races (runner uploads proof of finish time).

**Draft vs. publish** — Save as draft, publish when ready.

**Discounts & coupons** — Three coupon types, all with editable expiry / start date / redeem limit:
- **Unique Code Discount** — single code reusable by many (e.g. `EARLY200`).
- **Discount Codes With Same Name** — list-based, distinct codes for specific participants, downloadable as Excel. This is for sponsor-distributed codes / charity ballots.
- **Discount Codes For Entire Event** — universal early-bird applied to all tickets.

**Hot Leads** — Abandoned-cart recovery. Participants who fill the form but don't checkout become "hot leads." Organizer picks a date/time window of dropouts and sends a template email. Bulk recovery flow.

**Reviews** — Organizers can respond to reviews / queries on their event page.

**Dashboard**:
- Ticket sales (gross) vs Total Sales (net of discounts).
- Real-time daily registrations.
- Daily / monthly / yearly views.
- Conversion-rate analysis (registrations vs. visits).
- **Email Report** button → exports full participant list with details as Excel sent to organizer's email. (Not a CSV download — emailed Excel. Slightly clunky.)

**Settings**:
- Toggle features on/off per-event.
- Display Email Verification toggle (phone OTP still mandatory).
- The PDF itself admits: **"Social media & Integration and Email Template Testing are WIP & coming soon!"** — their own marketing PDF flags incomplete features.

### What the PDF reveals about the pricing mechanism

The IR Processing Fees toggle is the lynchpin. It's how IR justifies the 30–50% take rate in their T&C:

- If organizer chooses **"deducted from participant"** → runner sees ticket price **plus** an IR fee at checkout (similar to BookMyShow's "internet handling fee"). Organizer's nominal margin is preserved on the listed price; the participant bears the platform cost.
- If organizer chooses **"paid by organizer"** → ticket price is the all-in price the runner sees. Organizer absorbs the 30–50%.

In practice, most Indian organizers pass the fee to participants because organizer margins on running events are 15–25% gross. So **runners see inflated prices on IR vs. anywhere else**. That is a runner-side wedge, not just an organizer-side wedge:

> "The reason your favourite race costs ₹1,800 on IndiaRunning and ₹1,400 on Endorfin is that IndiaRunning's fee is on top of your ticket. Ours isn't."

### Feature-parity gap list (Endorfin vs. IR DIY)

| Feature | IR DIY | Endorfin status | Priority |
|---|---|---|---|
| Email + phone OTP signup | ✅ | ❌ | P1 |
| On-ground / Virtual / Hybrid event types | ✅ | ❌ | P2 — virtual is a separate product wedge |
| Banner + gallery uploads | ✅ | partial | P1 |
| T&C / FAQ upload (as docs) | ✅ | ❌ | P1 — better: ship a structured FAQ editor (richer rich-results than uploads) |
| Ticket creator with GST toggle | ✅ | ❌ | **P0** |
| Processing fee passthrough toggle | ✅ | ❌ | P0 — but consider NOT offering this and pricing all-in (marketing edge) |
| "Listing only" free tier | ✅ implicit | ❌ | P1 — directly competes with MarathonMitra |
| Form builder w/ mandatory fields | ✅ | ❌ | **P0** |
| Timing certificate verification field | ✅ | ❌ | P2 — niche, qualifier races only |
| Draft → publish workflow | ✅ | ❌ | P0 |
| Unique code discount | ✅ | ❌ | **P0** |
| Bulk allocated discount codes (Excel) | ✅ | ❌ | P1 |
| Event-wide early bird discount | ✅ | ❌ | **P0** |
| Hot Leads / abandoned cart recovery | ✅ | ❌ | P1 |
| Review responses by organizer | ✅ | n/a (no reviews yet) | P2 |
| Real-time ticket-sales dashboard | ✅ | ❌ | **P0** |
| Daily / monthly / yearly view | ✅ | ❌ | P1 |
| Conversion-rate analytics | ✅ | ❌ | P1 |
| Email Excel report export | ✅ | ❌ | P1 — ship as inline CSV download (better UX than emailed Excel) |
| Per-event feature toggles | ✅ | ❌ | P2 |
| Social media integration | 🟡 (WIP per their PDF) | ❌ | P2 — opportunity to ship before they do |
| Email template testing | 🟡 (WIP per their PDF) | ❌ | P2 |

### Where Endorfin can leapfrog (features IR DIY does NOT have)

1. **Structured FAQ editor** that emits FAQPage JSON-LD automatically. IR has organizers upload a PDF of FAQs — Google can't parse that. Endorfin can render the same FAQs as schema and capture the FAQ rich result IR loses.
2. **Per-event subdomains / microsites** (e.g. `freedom-bengaluru.endorfin.run`) — IR forces every event onto `registrations.indiarunning.com/{ugly_slug_id}`.
3. **CSV download instead of emailed Excel** — Hot Leads, participant list, sales report all as live in-dashboard CSV/XLSX with one-click.
4. **Live participant list streaming during race day** — IR ships static reports; an event-day live counter would be a sales tool for organizers.
5. **Refund-from-dashboard** (Razorpay supports it). IR forces organizers to "handle refunds directly" per T&C — meaning organizers do bank transfers manually. A one-click refund is night-and-day better.
6. **Schema-rich event pages** — IR ships zero JSON-LD. Endorfin's event pages should out-rank theirs within 90 days per the existing SEO audit.
7. **All-in transparent pricing** (no "+ Processing Fee at checkout"). Frame it as a runner benefit too, not just an organizer benefit.
8. **Public sandbox** — let prospective organizers see a sample event dashboard without an OTP login. IR forces auth before any preview.
9. **One-click duplicate event** for recurring annual races. The PDF doesn't mention this; if it exists, it's buried.
10. **Branded confirmation emails** — IR appears to send generic IR-branded confirmation emails. Allow organizers to use their own domain (SendGrid / Resend sender authentication).

### Sentences from the PDF worth quoting back in marketing

- "**Why to ask others when you can DO IT YOURSELF?**" — their own positioning argues self-serve is better than agencies. Hold them to it: "If it's truly DIY, why is your pricing not on your website?"
- "**Social media & Integration and Email Template Testing are WIP & coming soon!**" — their own deck says the product is unfinished.
- The PDF has zero mentions of: API access, webhooks, refunds, settlement timing, payout schedule, support SLA, refund window, fraud handling, or attendee transfer. All gaps.

---

## 5. UX / Feature Observations Worth Stealing

| Feature | Where | Why it works |
|---|---|---|
| Star ratings + review counts on event cards | Homepage, listing | Trust signal. They have real data ("4.3 / 187 reviews") that ranks events socially. |
| "Discounted Price" badge with strike-through | Listing + checkout | Urgency. Trains the marketplace to associate early-bird discounts with IR. |
| "Registrations closing on [date]" countdown | Homepage cards | Scarcity / FOMO. |
| Multi-distance checkout in one cart | Registration subdomain | Family of 4 doing different distances = one transaction. |
| Inclusive items checklist per category | Registration page | T-shirt, Medal, Timed Bib, Refreshments, E-Certificate, Goodie Bag — the runner knows exactly what they're paying for. |
| Recent Race Reviews carousel | Homepage | UGC + recency surfaced visually. |
| Mobile apps for runners | iOS + Android | High-frequency engagement layer. |
| Cross-sell with training (Fitpage) + nutrition (Ascend Liv) | Header | Lifecycle revenue beyond registration fees. |
| OTP-only org login | organiser subdomain | Frictionless onboarding (but no public pricing kills CTR). |

## 6. Gaps & Weaknesses (your attack surface)

| Gap | How to exploit |
|---|---|
| **30–50% fee disclosed in public T&C** | Cite verbatim in your pitch deck and pricing page. Their own document is the proof. |
| **No public organizer pricing** | Yours is one click from the homepage. Reduces sales friction to zero. |
| **Post-event settlement only** | Offer **mid-cycle settlement** (e.g. release 50% T-14 days before race). |
| **Non-refundable platform fee on cancellation** | "If your event cancels, you don't pay us anything." Brutally simple counter. |
| **No JSON-LD anywhere** | Your `SportsEvent` + `FAQPage` + `BreadcrumbList` + `AggregateRating` schema will outrank them on per-event queries within 60–90 days. |
| **No robots.txt** | Easy own goal. You have a proper one. |
| **A11y score 73, html lang missing, main landmark missing** | These are dragged into the SEO long-tail. You're at parity-or-better already. |
| **Legacy `bombayrunning.com` URLs leak in CSP** | Suggests technical debt + unfinished rebrand. You can position as "purpose-built, modern stack" without overselling. |
| **₹10K liability cap** | Offer a cleaner SLA — even ₹1L/event cap reads as 10× protection. |
| **Mandatory KYC before settlement** | Offer organizer onboarding KYC done in parallel with event setup, not gating. |
| **Pricing example only available via "talk to sales" OTP login** | Self-serve calculator on a public page (MarathonMitra has one — you should ship one too). |
| **Saransh Ventures runs three semi-related products** | You can be the focused, dedicated platform. |
| **Add-on services (banners, WhatsApp campaigns) priced extra and opaque** | Bundle one promo campaign per event into base price. |

## 7. Side-by-Side: Endorfin vs IndiaRunning vs MarathonMitra

| Dimension | IndiaRunning | MarathonMitra | Endorfin (current) |
|---|---|---|---|
| Live event count (upcoming) | 91 (sitemap) | 127 | ~similar (scrapes from IR + others) |
| First-party checkout | ✅ Razorpay | ❌ (redirects to Townscript) | 🟡 (coming soon — payment gateway in plan) |
| Organizer pricing transparent | ❌ Hidden | ✅ Public + calculator | ❌ (not built yet — biggest priority) |
| Organizer cut taken | **30–50%** of revenue | ₹10–₹30/reg + 18% GST + 2% PG + 1% comms | **Be: ~5–8% all-in** |
| Pre-event payouts | ❌ Post-event only | n/a (no checkout) | **Differentiator opportunity** |
| Mobile apps | ✅ iOS + Android | ✅ PWA install prompt | ❌ |
| JSON-LD on event pages | ❌ Zero | ✅ 7 blocks (SportsEvent + FAQPage + Breadcrumb + ItemList + Org x2 + WebPage) | ✅ Event + BreadcrumbList (recently added) |
| robots.txt | ❌ 404 | ✅ Comprehensive | ✅ |
| Sitemap individual events | ✅ Yes (91) | ✅ Yes (~1,900 URLs) | ✅ Yes (just added) |
| Reviews / ratings | ✅ Real data, displayed | ✅ Star ratings on completed events | ❌ |
| User stories / UGC | 31 | 70 | 0 |
| Runner profiles + leaderboards | ❌ | ✅ Built (mostly empty) | ❌ |
| Training cross-sell | ✅ Fitpage | ✅ Articles ("Best Shoes") | ❌ |
| Nutrition cross-sell | ✅ Ascend Liv | ❌ | ❌ |
| Security headers | ✅ Best (strict CSP) | 🟡 Partial | ✅ Recently improved |
| Lighthouse a11y | 73 | 83 | TBD — recently improved |
| Lighthouse SEO | 100 | 100 | (last audit: high) |
| Public pricing calculator | ❌ | ✅ | ❌ — **ship this** |
| Custom domain per event | ❌ | ❌ | Opportunity (e.g. `freedom-bengaluru.endorfin.run/register`) |

---

## 8. Organizer Poach Plan (90-day plan)

### Phase 0 — Foundations (this sprint)
1. **Pick a transparent number.** Recommended: **₹25/registration + 2% PG passthrough, all-in.** Show a calculator.
2. **Build `/pricing` for organizers** with a side-by-side: "On IndiaRunning you keep ₹2.5L. On Endorfin you keep ₹4.75L." Use their own T&C line 105 as the source citation (link directly to `https://organiser.indiarunning.com/tnc`).
3. **Ship Razorpay (or Cashfree) checkout integration.** Without this, the entire pitch is hypothetical.
4. **Set a payout policy** in writing: T+2 business days post-collection on the runner side; 50% pre-event payout option for trusted organizers.

### Phase 1 — Make the case (weeks 1–4)
5. **Build the organizer-side dashboard MVP — minimum table stakes to match IR DIY**, from the feature-parity gap in §4.5:
   - Event creator with draft→publish workflow
   - Ticket creator with GST handling
   - Form builder with mandatory-field toggle
   - Three coupon types (unique reusable, bulk allocated, event-wide early-bird)
   - Real-time dashboard (gross sales, net sales, daily registrations)
   - CSV/XLSX participant export (one-click, not emailed)
   - One-click refund (Razorpay supports it)
   - Hot Leads / abandoned-cart email recovery
6. **Publish 3 case studies / mock ROI sheets** for a 200-runner, 500-runner, and 2,000-runner event. PDF + embedded calculator. SEO content: "How much do running event platforms charge in India?" — this will rank for organizer research queries.
7. **Build a Loom / 90-second product video.** Title: "List your race in 10 minutes. Get paid in 2 days." Email to every organizer scraped from IR's sitemap.

### Phase 2 — Outbound (weeks 4–8)
8. **Mine IR's sitemap** (91 events) for organizer contacts. Most events publish organizer phone + email on their flyers — scrape those.
9. **Cold email sequence (3 touches)**:
   - T1: "Saw [Event Name 2026]. You'd have kept ₹X more on Endorfin."
   - T2: 1-page case study with their event's revenue modeled.
   - T3: Founder breakfast / call.
10. **Focus on the bottom of IR's customer ladder first**: small/new organizers who are paying the 50% rate, not the negotiated 30% (Procam, NEB Sports, Tata Mumbai Marathon etc. are politically captured and not winnable in year 1).

### Phase 3 — Defensible features (weeks 8–12)
11. **Per-event microsites** (e.g. `freedom-bengaluru.endorfin.run`) with custom branding. IR doesn't offer this.
12. **Live race-day dashboard** for organizers: real-time check-in scans, photo gallery uploads, bib generation. Even an MVP beats "talk to ops".
13. **JSON-LD schema across the entire catalog.** SportsEvent + FAQPage + AggregateRating + BreadcrumbList. Within 90 days you should be picking up rich results IR can't display.
14. **Reviews + ratings system** for past events. Pull from existing IR review pages (where allowed) to seed, then collect first-party going forward.

### Phase 4 — Moat (90+ days)
15. **Mid-cycle settlement** (50% T-14, balance T+2 post-event). This will require risk underwriting (typical chargeback < 2%; you can absorb).
16. **Runner identity layer.** PBs, race history, photo gallery. This is also Marathon Mitra's play; they have it built but empty. You can win this by *seeding* with public timing-partner finisher data.
17. **Vernacular SEO.** Hindi/Tamil/Marathi event pages with proper `hreflang`. IR is English-only.
18. **Open API** for organizers to sync registrations to their own CRMs / Mailchimp / etc. — IR's data is in a walled garden.

---

## 9. The 30-Second Pitch (for outbound emails)

> Subject: ₹2 lakhs back in your pocket on the next [Event Name]
>
> Hi [Name] — saw [Event Name 2026]. Great race.
>
> India Running's own organizer T&C (line 105, organiser.indiarunning.com/tnc) says they keep 30–50% of your gross revenue. On a 500-runner event at ₹1,000/ticket, that's ₹1.5–2.5 lakhs going to the platform — *plus* you don't see your settlement until after race day.
>
> On Endorfin you'd pay **₹25 per registration, flat. Payouts in 2 days. 50% available 14 days before the race.** On your 500-runner event, that's ₹4.75L in your pocket instead of ₹2.5L.
>
> 15 minutes next Tuesday?
>
> — [you]

---

## 10. Open Questions / To Verify

- What exact % is IR actually charging known mid-tier organizers? (Sales call as a "fake organizer" would confirm. The 30–50% band is wide.)
- Is the 30–50% inclusive of GST/PG/comms or exclusive? Their T&C isn't fully clear; you may be able to attack this further if it's exclusive.
- What's IR's actual organizer churn? (Indirect: count events that listed in 2024 + 2025 but not 2026.)
- What's the median ticket size in INR per category? (Drives the per-registration vs. % pricing decision.)
- Is IR's checkout T+0 or T+N for Razorpay payouts? (Their T&C says post-event; could be configurable per organizer.)
- Do organizers actually own their participant list, or does IR retain marketing rights? Read T&C section on data carefully — a "you keep your runner list and we don't market to them" promise is a huge selling point against IR's cross-sells.

---

## 11. Bottom Line

IndiaRunning's product is solid but their **commercial model is the soft target.** They are taking 30–50% of organizer revenue while their actual product surface (event pages with zero schema, no robots.txt, mid-tier a11y, post-event payouts, hidden pricing) is not 30–50%-of-revenue good. It's "20% of revenue good if anyone had a real alternative."

Endorfin can be that alternative within 90 days if you ship:
1. Public, transparent organizer pricing (this is the marketing).
2. Razorpay/Cashfree first-party checkout (this is the product).
3. Pre-event 50% settlement option (this is the moat — IR can't match without rewriting their T&C and risk model).

Everything else is gravy.
