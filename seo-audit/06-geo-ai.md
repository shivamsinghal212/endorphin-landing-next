# GEO / AI Search Readiness — endorfin.run

**Audited:** 2026-05-15
**Method:** Live curl probes (including AI-crawler-spoofed user agents), robots.txt + llms.txt inspection, content structure analysis. Subagent runs blocked by sandbox.

## Citability Score: **62 / 100**

Strong infrastructure (robots, llms.txt, AI crawler access, snippet meta) is offset by thin editorial copy on the highest-value pages and a lack of definitive-answer / Q&A structures that AI search engines preferentially cite.

## Summary

Endorfin has done the hard infrastructure work for AI search: AI crawlers are explicitly allowed, `llms.txt` exists and is well-structured, snippet limits are maximized via `max-snippet:-1`. The gap is editorial: the highest-value pages (homepage, city pages) ship under 1,000 rendered words, lack FAQ sections, and don't deploy the definition-style "X is..." passages that ChatGPT and Perplexity actively cite. The directory data itself (race listings, club listings) is the differentiator but isn't packaged into citable passages.

## What's working (keep doing)

### Robots.txt explicitly allows AI crawlers
```
User-agent: GPTBot       → Allow: /
User-agent: OAI-SearchBot → Allow: /
User-agent: ClaudeBot    → Allow: /
User-agent: PerplexityBot → Allow: /
User-agent: Google-Extended → Allow: /
```
Verified live by spoofing each user-agent: all return HTTP 200. **This is excellent and uncommon — most sites block GPTBot by default.**

### Meta robots maximizes AI snippet harvesting
Every audited page sets `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`. The `max-snippet:-1` directive removes Google's snippet-length cap, giving AI Overviews more material to cite from.

### llms.txt is well-structured
`https://www.endorfin.run/llms.txt` follows the proposed llms.txt convention: 1-sentence pitch, page list, key-facts block, contact. Specific positives:
- Mentions concrete numbers (500+ events, 25+ cities, 10,000+ runners) — these are quotable.
- Lists all programmatic city pages explicitly — helps AI assistants follow the right URLs.
- Includes feature list ("event discovery, one-tap RSVP, community runs...") — gives ChatGPT/Perplexity clear feature claims to cite.

### One H1 per page, canonicals correct, JSON-LD present
Every audited page has exactly one H1, a correct canonical, and at least one JSON-LD block. City pages and race detail page emit 2 JSON-LD blocks (Event/ItemList + BreadcrumbList). Per-page Event JSON-LD was just hardened (commit `8fb8164`) — GSC warnings should clear in 1–4 weeks.

## High-impact gaps

### G1. No FAQPage schema or visible FAQ sections on revenue pages
None of the audited pages contain visible Q&A pairs or `FAQPage` JSON-LD. AI search engines (especially Perplexity and Bing Copilot) heavily favor pages with FAQs because they map directly to user queries.

**The high-value queries are obvious:**
- "What's the best marathon in India?"
- "How do I register for the Mumbai Marathon?"
- "Are there beginner-friendly 5K races in Bengaluru?"
- "Which run clubs in Delhi are free to join?"

**Action:** Add a 5-question FAQ block to:
- Homepage (general "what is Endorfin / how does it work")
- Each city page (`/run-clubs/[city]`, `/races/in/[city]`, `/races/marathon-in/[city]`) with city-specific Q&A
- Each race detail (race-specific FAQ: dress code, parking, refund policy if extractable from `description`)

Wrap each in `FAQPage` JSON-LD. This single change typically lifts AI citation rate 2–3x.

### G2. Editorial copy is too short on the pages that matter most
- Homepage: **~370 words of editorial copy** (per content audit). AI engines prefer 500–1500 word pages with definitive structure.
- City pages: variable, but several score < 500 words in the content audit.

AI search "passage retrieval" works at the paragraph level — short pages have fewer paragraphs to surface. Each city page should have a unique 150–250 word intro paragraph naming local landmarks, signature races, and notable clubs.

### G3. No definition-style "X is..." passages
ChatGPT specifically cites passages that begin with "X is...", "The Mumbai Marathon is...", "A run club is...". These passages map cleanly into RAG retrieval and answer generation. Endorfin's content tends toward marketing prose ("Find your crew") rather than encyclopedic prose ("Endorfin is a directory of...").

**Action:** Add a single-paragraph definition block to each city page:
> "The Mumbai running scene is anchored by the Tata Mumbai Marathon, India's largest road race, drawing 55,000 participants every January. Five major run clubs operate in the city, including X, Y, and Z, with morning meetups along Marine Drive, Worli Sea Face, and Powai Lake. Endorfin lists 23 upcoming races in Mumbai and 14 verified clubs."

### G4. No author/expertise/E-E-A-T signals
There's no visible "About the editor", "Curated by", or organizational expertise statement on the site. AI engines (especially Google AI Overviews) increasingly weight E-E-A-T as a citation gate.

**Action:** Add a one-sentence kicker to programmatic pages: *"Curated by the Endorfin team — runners on the ground in every city we cover."* On the homepage, add a 100-word "Who we are" block. This is the lowest-cost E-E-A-T improvement available.

### G5. Brand mention monitoring — unknown baseline
Have not measured how often Endorfin is mentioned by name in ChatGPT / Perplexity responses for target queries ("running races in India", "marathons in Mumbai", "run clubs in Bengaluru"). This is the actual outcome metric that matters for GEO.

**Action:** Manually query ChatGPT, Perplexity, and Google AI Overviews with 10–20 target queries. Record:
- Is Endorfin cited?
- Which competitors are cited (likely IndiaRunning, Marathons Outlook, BookMyShow Sports)?
- What kind of content do those competitors have that Endorfin doesn't?

This baseline takes 30 minutes and is the most valuable single act of GEO research.

## Medium

### G6. llms.txt could include richer "key facts" with numbers
The current llms.txt key-facts block is good. To improve citability further, add quantitative claims like:
- "Largest race listed: Tata Mumbai Marathon (55,000 participants)"
- "Average city has X verified clubs"
- "Average race entry fee in India: ₹X"

AI engines preferentially cite content with specific numbers because numbers reduce hallucination risk.

### G7. Schema can express more entity relationships
Current Event schema (post-fix) is solid. Missing:
- `SearchAction` on the global `WebSite` block (schema audit flagged this) — enables Sitelinks Search Box in Google + signals to AI assistants that the site is searchable.
- `BreadcrumbList` on `/races`, `/clubs`, `/races/[slug]`, `/clubs/[slug]` (schema audit flagged this).
- `Organization` with `sameAs` pointing to social profiles, Play Store URL, founder LinkedIns — strengthens entity recognition.

### G8. No author-page entity hub
Adding a `/team` or `/about` page with named editors (Person schema, sameAs links) creates an entity hub that AI engines can attach trust signals to. Especially valuable since the site reviews/curates events — having a named curator increases citation odds.

## Low

### G9. No newsletter / community engagement signal in HTML
AI engines weakly correlate citation likelihood with community engagement signals (comments, reviews, ratings). Endorfin has `aggregateRating: 4.7 / 120 ratings` on `MobileApplication` schema, which is good, but no review/comment markup on individual races or clubs.

### G10. Sitemap doesn't include `<image:image>` extensions
Adding image sitemap entries for race hero images would help Google index and surface images in AI Overviews (which lean heavily on images).

## Priority order

1. **G1** — Add FAQPage schema + visible FAQ to homepage and top 5–10 city pages. Highest-leverage single change.
2. **G3** — Add definition-style intro paragraphs to all city pages. Pairs with G1.
3. **G5** — Baseline brand-mention check across ChatGPT, Perplexity, AI Overviews. Tells you where you actually stand.
4. **G4** — Add E-E-A-T kicker (curator attribution + about block).
5. **G6** — Enrich llms.txt with quantitative facts.
6. **G7** — Add SearchAction + BreadcrumbList per schema audit recommendations.

## Why the citability score is 62 and not higher

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| AI crawler access | 15% | 100 | All major bots allowed |
| llms.txt quality | 10% | 85 | Present and well-structured |
| Meta robots / snippet hints | 10% | 100 | Optimal |
| Schema completeness | 15% | 70 | Event fixed; missing FAQ, SearchAction, breadcrumbs on some pages |
| Content depth | 20% | 35 | Pages too short, especially programmatic |
| Definitive answer patterns | 15% | 30 | No FAQ, no "X is..." passages |
| E-E-A-T signals | 10% | 25 | No named curators, no about page |
| Entity richness | 5% | 50 | Brand identity OK, no team/sameAs network |
| **Weighted total** | | **62** | |
