# Backlinks Profile — endorfin.run

**Audited:** 2026-05-15
**Method:** Intended via Common Crawl skill scripts (`commoncrawl_graph.py`). Subagent runs and direct script execution were both blocked by the local sandbox configuration. This report captures recommendations and the data-gathering plan; full backlink data requires either fixing sandbox access or running the scripts manually.

## Status: data-gathering blocked

The plugin's Common Crawl script (`scripts/commoncrawl_graph.py`) needs to be executed against:
- `endorfin.run`
- `indiarunning.com` (primary competitor)
- `worldsmarathons.com`
- `hyrox.com/in` (or hyrox.com)
- `bookmyshow.com/sports` (if you consider them a competitor)

To unblock, run the following commands locally and re-share the JSON output:

```bash
python /Users/shivamsinghal/.claude/plugins/cache/agricidaniel-seo/claude-seo/1.8.2/scripts/commoncrawl_graph.py endorfin.run --json > cc-endorfin.json
python /Users/shivamsinghal/.claude/plugins/cache/agricidaniel-seo/claude-seo/1.8.2/scripts/commoncrawl_graph.py indiarunning.com --json > cc-indiarunning.json
python /Users/shivamsinghal/.claude/plugins/cache/agricidaniel-seo/claude-seo/1.8.2/scripts/commoncrawl_graph.py worldsmarathons.com --json > cc-worldsmarathons.json
```

## What Common Crawl can and can't tell you

**Will tell you:**
- Domain-level in-degree (number of referring domains found in the crawl)
- PageRank / Harmonic Centrality (domain-level authority signals)
- Top referring domains by frequency

**Won't tell you:**
- Backlinks acquired in the last ~3 months (Common Crawl lag)
- Anchor-text quality at scale (need full HTML parse)
- Whether links are dofollow/nofollow
- Spam scores (need Moz Spam Score, which requires API access)

For a complete profile, configure Moz Free API (300 requests/month free) or Bing Webmaster Tools API. Both are free and would give you toxic-link detection and anchor-text distributions.

## Reasonable expectations for a young site

Endorfin appears to be a relatively new directory (sitemap lastmod values clustered around late April 2026). For a site this young in the Indian running niche, a reasonable Common Crawl referring-domain count would be **5–25 domains**. Established competitors like indiarunning.com likely show **80–200+ referring domains**.

The audit can't confirm without running the script, but this is the order-of-magnitude expectation.

## Link-building recommendations (independent of measured baseline)

Because we don't have measured data, the recommendations below are general best-practice for an early-stage directory in a niche vertical. They apply whether you have 5 or 50 referring domains today.

### High-leverage targets

1. **Race organizer outreach.** Every event in your database has an organizer (`event.organizerName`, `event.website`). Reach out to organizers and ask them to link to their event's Endorfin page (`/races/[slug]`) as an "RSVP / community" supplement. Conversion rate is high because (a) you're driving registrations to them, (b) you're not asking for a sales link. Even a 10% conversion rate from 500 events = 50 contextual, niche-relevant referring domains.

2. **Run club listings.** Same play with clubs. Each club has a website / Instagram / WhatsApp link. Ask listed clubs to add Endorfin to their "where to find more runs" page. India-specific running blogs and city Facebook groups are similar.

3. **Strava clubs / Reddit / city subreddits.** Indian city subreddits (r/mumbai, r/bangalore, r/delhi) routinely have "where can I find runs near me" threads. Endorfin is a useful answer to those questions. **Not** as drive-by self-promotion — as an answer to a real question. r/IndiaRunning is the most direct.

4. **Race calendar aggregator submissions.** Submit to:
   - `runnersworld.com/in` (if it lists race calendars)
   - `indianroadrace.com`
   - `wmadirectory.com` (World Masters Athletics)
   - Local newspaper city-event sections (Times of India city pages, Mumbai Mirror events column)

5. **Press / PR for the launch moment.** The "first comprehensive India-wide running directory" angle is genuinely newsworthy in Indian fitness press (Mid-Day fitness column, YourStory, The Better India).

### What to deprioritize

- **Generic startup directories** (Product Hunt, BetaList). Bring volume but low topical relevance. Worth doing once, not multiple times.
- **Paid link schemes / private blog networks.** Catastrophic if detected; not worth it.
- **Reciprocal-link exchanges with unrelated sites.** Devalued by Google for years.

## What to measure when you have data

When you do get Common Crawl + ideally Moz numbers, track:

| Metric | What good looks like | What to worry about |
|---|---|---|
| Referring domains | 50+ within 6 months | <10 after 6 months = no link velocity |
| Domain Authority (Moz) | 20+ within 12 months | DA stuck at 1–10 |
| Anchor text distribution | Mostly branded ("Endorfin"), some exact-match ("running events India") | High % of exact-match commercial anchors = manipulation signal |
| Toxic links (Moz Spam Score >50%) | <5% of profile | >15% = consider disavow |

## What I recommend

1. **Run the Common Crawl scripts manually** and paste results back, or grant Bash access to subagents so the seo-backlinks agent can complete.
2. **Configure Moz Free API** (https://moz.com/products/api) — free tier covers basic Domain Authority + Spam Score for small batches.
3. **Configure Bing Webmaster Tools** (free) — exposes a referrers report similar to GSC but actually populated for younger sites.
4. **Re-run this audit** once the data sources are wired.

In the meantime, the link-building recommendations above are the right strategy regardless of your current baseline.
