/**
 * SEO copy helpers for race / event detail pages.
 *
 * The same event data feeds four places that all want slightly different
 * shapes of the same facts: the <title>, the meta description, the JSON-LD
 * `description`, and the visible "About this event" body. Centralising the
 * logic here keeps them consistent and gives thin scraped events (no prose
 * description, but real structured data — distances, date, price, location)
 * crawlable body text and a useful meta description instead of an empty one
 * that Google fills with junk.
 *
 * Hard rule: synthesis only ever restates data already on the event. No
 * fabricated routes, elevation, weather, or claims — only title, distances,
 * date, location, price, and organiser.
 */

import type { Event } from '@/lib/api';

/** Distance labels like ["Half Marathon", "10K"] from the category list. */
function distanceLabels(event: Event): string[] {
  return event.distanceCategories
    .map((d) => d.fullTitle?.split('·')[0]?.trim() || d.categoryName)
    .filter((s): s is string => !!s);
}

/** "Half Marathon, 10K and 5K" — Oxford-free human list. */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "entry from ₹999" | "free entry" | null when price is unknown. */
function priceClause(event: Event): string | null {
  if (event.priceMin == null) return null;
  if (event.priceMin === 0) return 'free entry';
  const cur = event.currency || 'INR';
  const prefix = cur === 'INR' ? '₹' : `${cur} `;
  return `entry from ${prefix}${event.priceMin}`;
}

/** "8 August 2026", rendered in IST so the date never drifts a day. */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The richest real prose we have, or '' when the event is thin. */
function realProse(event: Event): string {
  return (
    event.description ||
    event.fullDescription ||
    event.descriptionMd ||
    ''
  ).trim();
}

/**
 * Plain-text body for the event. Prefers the real description (preserving the
 * organiser's voice); otherwise synthesises a factual paragraph from the
 * structured fields. Always returns non-empty text, so every event page has a
 * crawlable "About" section. Safe to render through ReactMarkdown.
 */
export function buildEventNarrative(event: Event): string {
  const real = realProse(event);
  if (real) return real;

  const date = event.startTime ? fmtDate(event.startTime) : null;
  const loc = event.locationName || event.venueName || null;
  const organizer = event.organizerName?.trim() || null;
  const distances = distanceLabels(event);
  const price = priceClause(event);

  const sentences: string[] = [];

  let lead = `${event.title.trim()} is a ${event.category || 'running'} event`;
  if (date) lead += ` taking place on ${date}`;
  if (loc) lead += ` in ${loc}`;
  lead += organizer ? `, organised by ${organizer}.` : '.';
  sentences.push(lead);

  if (distances.length) {
    sentences.push(`Distance categories on offer: ${joinList(distances)}.`);
  }
  if (price) sentences.push(`${capitalize(price)}.`);

  sentences.push(
    'View the full schedule, register, and set a start-line reminder on Endorfin.',
  );

  return sentences.join(' ');
}

/**
 * Meta description (~targets 160 chars; longer is harmless, Google truncates
 * the display). Reuses a real description when there's enough of it to be
 * useful; otherwise builds a fact-first line with a register CTA so a
 * bottom-of-page-1 listing has a reason to be clicked.
 */
export function buildEventMetaDescription(event: Event): string {
  const real = realProse(event);
  if (real.length >= 120) return real.slice(0, 200);

  const date = event.startTime ? fmtDate(event.startTime) : null;
  const loc = event.locationName || event.venueName || null;
  const distances = distanceLabels(event);
  const price = priceClause(event);

  let s1 = event.title.trim();
  if (date) s1 += ` is on ${date}`;
  if (loc) s1 += ` in ${loc}`;
  s1 += '.';

  const facts: string[] = [];
  if (distances.length) facts.push(joinList(distances));
  if (price) facts.push(price);

  const parts = [s1];
  if (facts.length) parts.push(`${capitalize(facts.join(' · '))}.`);
  parts.push('Register and set a reminder on Endorfin.');

  return parts.join(' ');
}

/**
 * Title tag. Keeps the event name front-loaded for the exact-match query and
 * appends the brand — the bare title shipped no brand or action signal, which
 * leaves clicks on the table for page-1 listings.
 */
export function buildEventTitle(event: Event): string {
  const base = event.title.trim();
  return /endorfin/i.test(base) ? base : `${base} | Endorfin`;
}
