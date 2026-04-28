/**
 * Single source of truth for the coupon-aware Register button label
 * and intent across all surfaces (race card, featured banner, detail
 * hero, mobile sticky bar). Keeps copy + behavior in lock-step so the
 * three states never drift.
 *
 * Usage:
 *   const cta = couponCta(race);  // race has couponDiscountPercent + couponCode + registrationUrl
 *   if (cta.intent === 'login') openLoginModal(race);
 *   else if (cta.intent === 'detail') router.push(cta.href);
 *   else window.open(cta.href, '_blank');
 */

interface CouponishRace {
  registrationUrl?: string | null;
  hasCoupon?: boolean;
  couponCode?: string | null;
  couponDiscountPercent?: number | null;
  slug?: string | null;
  id: string;
}

export type CouponIntent = 'register' | 'login' | 'detail' | 'tbd';

export interface CouponCta {
  /** Label text to render on the button. */
  label: string;
  /** What clicking should do — caller decides how to wire it up. */
  intent: CouponIntent;
  /** External URL (registrationUrl) or internal path (/races/[slug]).
   * Empty string when intent === 'login' or 'tbd'. */
  href: string;
  /** 'red' for default register, 'green' for unlocked-coupon variant,
   * 'jet' for tbd disabled state. */
  variant: 'red' | 'green' | 'jet';
  /** True when intent === 'detail' — caller should use a Link, not <a target="_blank">. */
  internal: boolean;
}

export function couponCta(race: CouponishRace): CouponCta {
  const hasDiscount = !!race.hasCoupon && race.couponDiscountPercent != null;
  const isAuthed = !!race.couponCode; // authed users see the code server-side
  const detailHref = `/races/${race.slug || race.id}`;

  // Has coupon + authed → green "Coupon unlocked", goes to detail page
  if (hasDiscount && isAuthed) {
    return {
      label: 'Coupon unlocked →',
      intent: 'detail',
      href: detailHref,
      variant: 'green',
      internal: true,
    };
  }

  // Has coupon + anon → "Register at X% off", opens login modal
  if (hasDiscount && !isAuthed) {
    return {
      label: `Register at ${race.couponDiscountPercent}% off`,
      intent: 'login',
      href: '',
      variant: 'red',
      internal: false,
    };
  }

  // No coupon — plain Register
  if (race.registrationUrl) {
    return {
      label: 'Register ↗',
      intent: 'register',
      href: race.registrationUrl,
      variant: 'red',
      internal: false,
    };
  }

  return {
    label: 'Registration TBD',
    intent: 'tbd',
    href: '',
    variant: 'jet',
    internal: false,
  };
}
