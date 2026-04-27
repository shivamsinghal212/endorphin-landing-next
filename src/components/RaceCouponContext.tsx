'use client';

interface RaceLike {
  title?: string;
  couponDiscountPercent?: number | null;
}

/**
 * Race-aware context strip for use as the `context` slot on <LoginModal>.
 * Renders a percent badge + race title + a small subline.
 */
export default function RaceCouponContext({ race }: { race: RaceLike }) {
  const pct = race.couponDiscountPercent ?? null;
  if (pct == null) return null;
  return (
    <div className="v1rcc-strip">
      <div className="v1rcc-pct">
        <span className="v1rcc-pct-num">{pct}%</span>
        <span className="v1rcc-pct-lbl">OFF</span>
      </div>
      <div className="v1rcc-text">
        <div className="v1rcc-title">{race.title || 'This race'}</div>
        <div className="v1rcc-sub">Log in to unlock your member discount</div>
      </div>
    </div>
  );
}
