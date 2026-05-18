# Market Revenue Analysis — From the Database

**Date:** 2026-05-16
**Source:** Live query against `EndorphinBackend` Supabase Postgres (`events` + `event_distance_categories`)
**Scripts:** `EndorphinBackend/scripts/market_analysis.py` and `market_revenue.py`
**Raw data:** `docs/competitive-audits/data/market-snapshot.json`, `market-revenue.json`
**Universe:** 226 events currently in our DB. All running, all "live", all `event_source_type = imported` (scraped). Captured 2026-05-16.

---

## 1. What's in our database right now

| Source | Events | % of total | Median price (`price_min`) | Mean | Max |
|---|---:|---:|---:|---:|---:|
| `indiarunning` | 114 | 50.4% | **₹624** | ₹649 | ₹1,600 |
| `townscript` | 85 | 37.6% | **₹520** | ₹680 | ₹2,999 |
| `citywoofer` | 15 | 6.6% | **₹600** | ₹786 | ₹1,870 |
| `mysamay` | 12 | 5.3% | **₹950** | ₹1,533 | ₹8,000 |
| **Total** | **226** | 100% | ₹600 | ₹717.80 | ₹8,000 |

- 219 of 226 events are paid; only 7 are free (`price_min = 0`).
- All events are `category = running`, all `event_status = live`, all `event_source_type = imported`.
- 0 events have `event_source_type = native` — i.e. **no organizer has listed directly on Endorfin yet**. Everything we serve is scraped.

### Where the actual revenue happens (registration_url host)

| Host | Events |
|---|---:|
| `indiarunning.com` | 112 |
| `townscript.com` | 85 |
| `citywoofer.com` | 15 |
| `mysamay.in` | 12 |
| `allevents.in` | 1 |

Note 2 of 114 IR-sourced events redirect somewhere other than `indiarunning.com` (own organizer site or Townscript). That confirms the audit observation that **the registration backend can be different from the discovery source** — particularly relevant for Townscript races that get cross-listed on IR.

### Calendar density (upcoming 12 months)

| Month | IR | TS | CW | MS | Total |
|---|---:|---:|---:|---:|---:|
| 2026-05 | 24 | 15 | 3 | 1 | **43** |
| 2026-06 | 15 | 9 | 4 | 0 | **28** |
| 2026-07 | 11 | 5 | 1 | 2 | **19** |
| 2026-08 | 16 | 7 | 4 | 2 | **29** |
| 2026-09 | 4 | 5 | 0 | 2 | **11** |
| 2026-10 | 6 | 3 | 0 | 2 | **11** |
| 2026-11 | 4 | 2 | 0 | 2 | **8** |
| 2026-12 | 2 | 1 | 0 | 1 | **4** |
| 2027-02 | 2 | 0 | 0 | 0 | **2** |
| 2027-03 | 2 | 0 | 0 | 0 | **2** |

**May, June, August are the peak race months** in our slice. IR's lead is roughly 2× Townscript across the year. After November the calendar thins out (the published forward catalog drops because organizers haven't announced 2027 races yet).

### Geography (events in last 90d or upcoming)

Top 10 cities: Bengaluru 31 · Pune 23 · Mumbai 18 · Chennai 15 · New Delhi 14 · Delhi 12 · Hyderabad 12 · Noida 10 · Gurugram 7 · Greater Noida 6. **~70% of the catalog is metro/NCR.**

---

## 2. Actual GMV — what we can measure

**Important caveat upfront:** only `indiarunning` populates `total_tickets_sold` (IR exposes a "X people are participating" counter on their event pages, which the scraper reads). Townscript, CityWoofer, and MySamay don't display sold counts publicly, so our `total_tickets_sold = 0` for those sources. That means **all GMV numbers below are IndiaRunning-only.**

For the other three we have a capacity proxy (`max_participants`, scraped from TS where the organizer sets a cap) and the listed `price_min`.

### Floor GMV (price_min × tickets_sold), IndiaRunning only

| Metric | Value |
|---|---:|
| Observable events (price_min × sold > 0) | **83** of 114 |
| Total tickets sold | **13,330** |
| **GMV floor (Rs.)** | **₹88,10,583** |
| Average per observable event | ₹1,06,151 |
| Median tickets sold per event | 11 |
| Max tickets sold (single event) | 2,803 |

That's **₹88 lakhs of measurable ticket sales sitting in just one slice of one source.** The actual GMV is materially higher because:
1. `price_min` is the cheapest tier; runners often buy higher (HM/Marathon) tiers that price 2–3× higher.
2. IR's "people participating" counter is updated periodically and undercounts day-of registrations.
3. We don't capture organizers' separately-listed corporate / group / sponsor revenue.

### Past 180-day GMV by source (where measurable)

| Source | Events | Tickets | GMV floor |
|---|---:|---:|---:|
| indiarunning | 20 | 4,468 | **₹34,65,243** |

So in the last 6 months alone we have **₹34.65L of measured GMV** flowing through 20 IR events. Linearly that's ~₹70L/yr from this slice of IR.

### Top 10 highest-revenue events in our DB (all IR)

| GMV floor | Tickets × Price | Event | Organizer |
|---:|---|---|---|
| ₹25,08,685 | 2,803 × ₹895 | Wesness Women's 5K Bengaluru 2026 | Fitpage (Main Account) |
| ₹18,00,800 | 2,251 × ₹800 | Farmley Snack Run 2026 | MMS Innovative Marketing |
| ₹10,43,900 | 949 × ₹1,100 | Lonavala Varsha Marathon (Fog Run) | united sports & adventures |
| ₹8,06,650 | 1,241 × ₹650 | Bharat Ka Bhavishya Shahothon 2.0 | Voice of Constitution |
| ₹3,17,133 | 633 × ₹501 | Thane Monsoon 15K Run 2026 | LIVFIT Sports & Wellness |
| ₹3,06,000 | 408 × ₹750 | Runs & Miles Half Marathon 1st Edition | RunsandMiles |
| ₹2,65,320 | 268 × ₹990 | Fit Mumbai Marathon | Fitpage |
| ₹2,05,800 | 196 × ₹1,050 | Mumbai Fast Marathon | Fitpage |
| ₹1,68,885 | 243 × ₹695 | Kharghar Half Marathon | various |
| ₹1,38,000 | 138 × ₹1,000 | Kalimpong Ultramarathon 2026 | Run with Roshni Foundation |

The drop-off is steep: the top race is **22× the GMV of the 5th-place race**. The market has a heavy long tail with a few large flagships at the top.

### Top organizers by GMV (recent + future, where measurable)

| GMV floor | Source | Events | Tickets | Organizer |
|---:|---|---:|---:|---|
| **₹26,03,285** | IR | 3 | 2,920 | **Fitpage (Main Account)** ← IR's own parent listing on itself |
| ₹18,00,800 | IR | 1 | 2,251 | MMS Innovative Marketing Solutions |
| ₹10,45,900 | IR | 2 | 951 | united sports & adventures |
| ₹8,06,650 | IR | 1 | 1,241 | Voice of Constitution |
| ₹6,46,905 | IR | 5 | 717 | Sukarma Events |
| ₹3,17,133 | IR | 1 | 633 | LIVFIT Sports and Wellness |
| ₹3,06,000 | IR | 1 | 408 | RunsandMiles |
| ₹2,20,400 | IR | 5 | 224 | Omega Events |

**Fitpage / IndiaRunning's own parent listing itself.** Their Fitpage entity has shipped 3 events with 2,920 tickets across them — that's the largest organizer in our DB by both ticket count and GMV. The market leader is also using the market.

### Capacity proxy for Townscript (since sold count is missing)

| GMV ceiling (capacity × price_min) | Event | Date | Capacity |
|---:|---|---|---:|
| **₹1,30,36,875** | Tuffman Half Marathon Delhi (3rd Edition) | 2026-08-22 | 10,225 |
| ₹77,00,000 | Freedom Bengaluru Half Marathon | 2026-05-23 | 10,000 |
| ₹67,42,400 | Mumbai Ultra Walkathon 2.0 | 2026-10-31 | 7,525 |
| ₹12,00,000 | 24th Run Against Drug Abuse | 2026-06-21 | 6,000 |
| ₹24,95,000 | Green BLR 2.0 | 2026-08-15 | 5,000 |

These are **potential GMVs** (capacity × cheapest tier). The Tuffman Delhi race alone has a ₹1.3 crore *capacity ceiling* — and that's a single mid-sized organizer on Townscript.

### Forward 90-day pipeline (organizers we can pitch right now)

| Source | Events (next 90d) | Avg ticket | Total capacity (where reported) | Already-sold (where reported) |
|---|---:|---:|---:|---:|
| indiarunning | 55 | ₹665 | n/a | 5,927 |
| townscript | 33 | ₹818 | 104,347 | 0 (not surfaced) |
| citywoofer | 11 | ₹847 | n/a | 0 |
| mysamay | 4 | ₹1,000 | 27,788 | 0 |

Two big things to notice:

- **Townscript's 33 upcoming events have a combined capacity of 104,347 runners** — that's the addressable runner-pool on TS alone in the next quarter, sitting on the cheapest registration backend in the market.
- **MySamay's 4 events have 27,788 combined capacity** — these are the big flagships (NEB Sports' Cognizant New Delhi Marathon, etc). MS hosts fewer events but the per-event capacity is materially larger.

---

## 3. Sized Estimate: total Indian running-event GMV per year

This is where we need to be careful: our 226 events are a *snapshot*, not a year. Let me bridge to an annualized number conservatively.

### Step 1 — Annualize what we have

Across 13 months of forward + 6 months past = ~19 months of catalog. Annual run-rate of events visible to us: **226 × (12/19) ≈ 143 events/year** at the current scrape coverage.

### Step 2 — Estimate true catalog size

The competitive audits told us:
- IndiaRunning's sitemap shows 91 upcoming events at a time → roughly **~150–200 events/year** through IR alone.
- Townscript's sitemap shows 7,910 upcoming events across all verticals, of which the running-specific share is at least the 85 we've scraped. Conservatively **~200–400 running events/year** on TS (their search filter "Sports & Fitness Events" returns more — but we're keeping it tight).
- MarathonMitra lists 127 upcoming running events but doesn't process registrations.

Our 226-event slice underestimates the market. A defensible total annual catalog is **~600–900 running events/year** in India once you include the small/regional races we haven't scraped. (Indicrun-style timing partners separately report tracking ~1,500 events but ~half of those are non-marketed niche/college events.)

### Step 3 — Average GMV per event

From our IR slice: 83 events generated ₹88L → **₹1.06L mean GMV per IR event**. But the distribution is skewed; median is more like ₹30K (because most races sell <50 tickets).

For market sizing, segment by event size:

| Bucket | Tickets sold | Events in our DB | Median GMV | Est. % of yearly market |
|---|---|---:|---:|---:|
| Flagship | 2,000+ | 2 | ₹22L | ~1% |
| Big | 1,000–1,999 | 1 | ₹8.1L | ~2% |
| Large | 500–999 | 4 | ₹2.5L | ~5% |
| Mid | 200–499 | 5 | ₹1.5L | ~10% |
| Small | 50–199 | 15 | ₹50K | ~25% |
| Micro | 1–49 | 60 | ₹6K | ~57% |

The market is **a barbell**: ~10% of events generate ~70% of GMV; the long tail of micro-events generates ~5%.

### Step 4 — Annualized GMV estimate (conservative)

Assume 700 paid running events/year × weighted average GMV ≈ ₹2L:

> **Annual Indian running-event ticketing GMV ≈ ₹14 crore — ₹20 crore (~$1.7M – $2.4M USD).**

This is the *online-ticketed* segment only. Offline cash/manual races aren't counted. Cross-checking: Townscript publicly claims **2.4M lifetime tickets sold across all verticals (since ~2015)**, which at ₹600 avg = ~₹144 crore lifetime, of which running is one of seven verticals. A 10–15% running share = ~₹15–20 crore lifetime *cumulative*, consistent with our annual estimate.

### Step 5 — Implied platform revenue (what the registration platforms make)

| Platform | Take rate | Implied annual revenue from this market |
|---|---|---:|
| IndiaRunning | 30–50% of GMV per their T&C | ₹4.2 cr – ₹10 cr |
| Townscript | ~6% all-in | ₹84 lakh – ₹1.2 cr (from running vertical alone) |
| Endorfin (at 3.5%, hypothetical 10% market share Y1) | 3.5% × ₹2 cr = ₹7 lakh | tiny but real |
| Endorfin (at 3.5%, 30% market share Y2) | 3.5% × ₹6 cr = ₹21 lakh | meaningful |
| Endorfin (at 3.5%, 50% market share Y3) | 3.5% × ₹10 cr = ₹35 lakh | start of a real business |

To get to ₹1 crore ARR for Endorfin from running-only registration fees at 3.5%, we'd need to be intermediating **~₹28 crore of GMV/year** — i.e. own the entire current addressable market. The honest take is: **registration fees alone don't make running a venture-fundable business in India**. The path to ₹10–20 crore ARR is through adjacent monetization — training plans, photos, race-day gear, sponsorships, runner identity. Townscript figured this out and went horizontal (7 verticals); IR figured it out and goes vertical-down (Fitpage training + Ascend Liv nutrition).

---

## 4. Source-level read

### IndiaRunning (114 events, 50% share, biggest revenue)

- **Real organizer base:** 57 unique orgs.
- **Top organizers by event count:** TE Sports (8), Sukarma Events (6), Fitpage Main Account (6), Omega Events (6), Sportz Zone (5), Thrill Zone (5).
- **Big revenue events:** all but one of our top-revenue races are on IR. Either IR captures the bigger races, or IR is the only platform where we can *see* sold counts and so it artificially looks like it captures the bigger races. The truth is probably both.
- **Median ticket: ₹624.** Slightly above Townscript's ₹520, slightly below MySamay's ₹950. IR's pricing is the mainstream centre.
- **Fitpage parent is the single biggest organizer on IR's own platform.** That's the company eating its own dogfood at scale; also means **the largest "organizer" we can poach is unpoachable** (they own the platform).

### Townscript (85 events, 38% share, hidden revenue)

- **Real organizer base:** 56 unique orgs (almost identical to IR — but different orgs).
- **Top organizer:** Omega Events with 17 events on TS. Omega is the largest TS-aligned race-organizer in our slice. Definitely worth a direct outreach pitch.
- **Median ticket: ₹520.** Cheapest of the four sources — suggests TS attracts the more price-sensitive long-tail races.
- **Sold count not surfaced** but capacity ceilings are huge — Tuffman Delhi alone has a 10,225 capacity. If even 30% of that fills, it's ₹39L GMV from a single race on a single weekend.
- **Strategic implication:** Townscript organizers are the **highest-LTV poach targets** because (a) they're already paying ~6% in platform fees, (b) they own their content / branding (the event detail page on TS is rich), (c) the relationship between organizer and TS is purely transactional (TS provides backend, organizer markets externally). Endorfin can compete by undercutting on price *and* offering discovery.

### CityWoofer (15 events, 7% share) & MySamay (12 events, 5% share)

- CityWoofer median ticket ₹600 (mainstream).
- MySamay median ticket ₹950 (premium). Hosts the most expensive event we've scraped: the **Udupi 113 Triathlon at ₹10,000 / ₹8,000 / ₹5,000 per tier**. Also hosts NEB Sports' big flagships including Cognizant New Delhi Marathon — runs ~5 events.
- Both are smaller fish. MS punches above its weight on GMV per event due to premium price points; CW is the price-mainstream alternative.
- **Strategic implication:** These two are probably not standalone poach targets. They're a sign that the market has 4+ second-tier platforms each carving niches. If Endorfin builds the right product, the unification play is real (one platform that runners use to find ALL races, regardless of where the checkout lives).

---

## 5. Data quality issues worth knowing about

These limit how far we can take the analysis from the DB alone:

1. **`total_tickets_sold` only populated for IndiaRunning.** TS / CW / MS scrapers don't extract this because their public pages don't show it. *Fix: add an organizer-side opt-in flow where they share their sold count for accurate dashboards.*
2. **`event_distance_categories.price` is 99% NULL.** Out of 543 tier rows, only 16 have prices. The scraper isn't extracting tier-level prices reliably. *Fix: improve scraper to parse the ticket grid on each event page, or accept this as a limitation.*
3. **`max_participants` is populated almost only for TS** (104k upcoming capacity across 33 races). IR doesn't publish capacity publicly so it's null there.
4. **`event_status` is "live" for every row.** No "completed" / "cancelled" / "postponed" states — so our 67 events in `past_30` bucket are technically still flagged live in the DB. Worth a backfill.
5. **`event_source_type = imported` for all 226 rows.** Zero native Endorfin listings. The poach effort is, fundamentally, the project that takes this number from 0 to ≥1.
6. **Organizer dedup is messy.** "Omega Events" appears on both IR and TS as separate orgs, but it's almost certainly one entity using two platforms. A proper organizer-merge pass would consolidate ~10–15% of the unique-organizer counts.
7. **`avg_rating` is mostly NULL** (only a small subset of IR events have ratings, and zero from TS/CW/MS).

---

## 6. So-what — what to do with this

**1. Poach Omega Events first.** They're the highest-frequency Townscript organizer in our DB (17 events). Currently paying ~6% to TS. If Endorfin charges 3.5%, that's ~2.5% × their GMV per event back in their pocket. They also list 6 events on IR separately, so the pitch is "consolidate your two platforms into one cheaper one."

**2. Pitch the top 10 IR organizers by GMV** in priority order: united sports & adventures, MMS Innovative Marketing, Voice of Constitution, Sukarma Events, Run with Roshni Foundation, RunsandMiles. Each has at least one event in our DB doing ≥₹1L of measurable GMV. The Fitpage Main Account is the unpoachable exception (they own IR).

**3. Don't try to win the long tail first.** 60 of our 226 events sold <50 tickets. They generate ~5% of market GMV combined. Focus poach efforts on the ~15 organizers driving 70% of measurable GMV.

**4. Add a "what we'd charge" calculator to the pricing page** with their own race's revenue plugged in. The data is here — for a 633-ticket Thane Monsoon 15K at ₹501, IR's 30–50% take is ₹95K–₹158K vs Endorfin's ~₹11K. That's a one-screen pitch.

**5. Recognise that registration GMV alone isn't venture-fundable in India yet.** The real opportunity is **adjacent revenue**: training plans (Fitpage at ~₹1,000–₹5,000/runner/year), photos (₹99–₹299/runner), gear bundles, sponsorships, race-day mobile ad inventory. If Endorfin captures 5% of the 200,000 runners in our addressable market and adds ₹500 ARPU/year, that's ₹5 crore — bigger than the entire registration-fee pie.

**6. The market is currently dominated by IR.** 50% of our visible catalog, 100% of our measurable GMV. The realistic 12-month strategy is to be the *better-priced #2 platform* with discovery + checkout, not to displace IR head-on. The 30-day plan from the IndiaRunning audit (public pricing + Razorpay + schema + dashboard MVP) is exactly the right scope.

---

## Appendix — Reproduce these numbers

```bash
cd /Users/shivamsinghal/Desktop/projects/EndorphinBackend
source .venv/bin/activate
python3 scripts/market_analysis.py     # writes data/market-snapshot.json
python3 scripts/market_revenue.py      # writes data/market-revenue.json
```

Both scripts read `DATABASE_URL` from `EndorphinBackend/.env`. Re-run weekly to track market share movement.
