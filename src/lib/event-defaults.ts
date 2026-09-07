/**
 * Copy and vocabulary the event editors start from.
 *
 * Lifted out of the retired 7-step wizard's draft model so the surviving
 * editors don't depend on it. Pure data — no React, no wizard concepts.
 */

/** Default templates offered when the policy fields are blank.
 *
 *  Placeholders are parenthesised, not braced: the rich-text editor parses
 *  MDX-flavoured markdown, where `{` opens an expression — a braced
 *  placeholder risks being eaten on load. Parentheses read the same and are
 *  inert everywhere. */
/** Default refund policy offered when the field is blank.
 *
 *  No refunds is the house default: organisers commit costs (bibs, tees,
 *  medals, permits) on headcount well before race day, and the tiered
 *  sliding scale this replaced was quietly creating obligations nobody had
 *  agreed to. Organisers who do want to refund can still write their own —
 *  this is only the starting draft.
 *
 *  The organiser-cancellation clause stays. That is not a refund the runner
 *  asks for; it is money owed when the event does not happen, and dropping
 *  it would be indefensible. */
export const DEFAULT_REFUND_TEMPLATE = `## Refunds

**Entries are non-refundable.** Once you register, the entry fee cannot be refunded.

Entries are **non-transferable** to another person or another event unless we say otherwise in writing.

If **we** cancel the event, you get a **100% refund**, automatically, within 7 working days.

Contact us if you have a question about your entry.`;

/** Standard terms. Deliberately generic — the old draft assumed a virtual
 *  run (Strava screenshots, medal shipping), which was wrong for most of
 *  what gets listed. Organisers add event-specific rules on top. */
export const DEFAULT_TERMS_TEMPLATE = `## Terms and conditions

By registering you agree to the following.

1. **You take part at your own risk.** You confirm you are medically fit for the distance or activity you have registered for.
2. **Follow instructions on the day** — those of the organiser, the venue, marshals, and any medical or security staff.
3. **Bring a valid registration.** Digital is fine. Entries are personal and may not be passed to anyone else unless the organiser agrees.
4. **The plan can change.** Route, timings, and schedule may be adjusted, and the event may be shortened or called off for safety, weather, or anything outside the organiser's control.
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
