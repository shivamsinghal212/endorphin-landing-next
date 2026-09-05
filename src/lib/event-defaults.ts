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
export const DEFAULT_REFUND_TEMPLATE = `## Refunds

- **Full refund** if you cancel before (10 days before the run window opens).
- **50% refund** until (5 days before the run window opens).
- **No refund** after that — your medal still ships if you submit a valid run.

If we cancel the event for any reason, we refund **100%** automatically within 7 working days.

Contact us to request a cancellation.`;

export const DEFAULT_TERMS_TEMPLATE = `## Terms

By registering you agree to:

1. Run the full distance you registered for within the run window.
2. Submit a single valid screenshot from Strava, Garmin, Apple Health, or Google Fit.
3. We may **reject** submissions that look edited, look like indoor treadmill runs, or that don't match your registered distance within ±2%.
4. Medals are shipped only to verified finishers, to the address you entered at checkout.`;

/** Experience variants — no run window, no medals, plain ticketed-event language. */
export const DEFAULT_REFUND_TEMPLATE_EXPERIENCE = `## Refunds

- **Full refund** if you cancel up to (7 days before the event).
- **50% refund** until (2 days before the event).
- **No refund** after that.

If we cancel the event for any reason, we refund **100%** automatically within 7 working days.

Contact us to request a cancellation.`;

export const DEFAULT_TERMS_TEMPLATE_EXPERIENCE = `## Terms

By booking you agree to:

1. Arrive at the venue on time with a valid ticket (digital is fine).
2. Each ticket admits one guest unless stated otherwise.
3. Follow the organiser's and venue's instructions on the day.
4. Tickets are non-transferable unless the organiser allows it.`;

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
