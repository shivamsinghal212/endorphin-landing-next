/**
 * Copy and vocabulary the event editors start from.
 *
 * Lifted out of the retired 7-step wizard's draft model so the surviving
 * editors don't depend on it. Pure data — no React, no wizard concepts.
 */

/** Default refund policy offered when the field is blank.
 *
 *  No refunds is the house default: organisers commit costs (bibs, tees,
 *  medals, permits) on headcount well before race day, and the tiered
 *  sliding scale this replaced was quietly creating obligations nobody had
 *  agreed to.
 *
 *  This template commits the organiser to nothing — no cancellation refund,
 *  no timelines. It is a starting draft: organisers who want to promise
 *  more write it themselves. Platform-level obligations, if any, live in
 *  /terms rather than here. */
export const DEFAULT_REFUND_TEMPLATE = `## Refunds

**Entries are non-refundable.** Once you register, the entry fee cannot be refunded.

Entries are **non-transferable** to another person or another event unless we say otherwise in writing.

Contact us if you have a question about your entry.`;

/** Standard terms. Deliberately generic — the old draft assumed a virtual
 *  run (Strava screenshots, medal shipping), which was wrong for most of
 *  what gets listed. Organisers add event-specific rules on top. */
export const DEFAULT_TERMS_TEMPLATE = `## Terms and conditions

By registering you agree to the following.

1. **You take part at your own risk.** You confirm you are medically fit for the distance or activity you have registered for.
2. **Follow instructions on the day** — those of the organiser, the venue, marshals, and any medical or security staff.
3. **Bring a valid registration.** Digital is fine. Entries are personal and may not be passed to anyone else unless the organiser agrees.
4. **The plan can change.** Route, timings, and schedule may be adjusted, and the event may be shortened or called off at any time.
5. **Photography.** Photos and video taken at the event may be used to promote it and future editions.
6. **Your details** are shared with the organiser so they can run the event and contact you about it.`;

/** Fixed inclusion vocabulary surfaced by the Step 2 chip picker. */
export const INCLUSION_OPTIONS = [
  'T-shirt',
  'Medal',
  'Bib',
  'Tech tee',
  'Goody bag',
  'Race-day breakfast',
] as const;

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
