'use client';

import { useState } from 'react';

type Size = 'sm' | 'md';

interface CouponTopStripProps {
  couponCode: string | null;
  couponDiscountPercent: number | null;
  hasCoupon: boolean;
  size?: Size;
  className?: string;
}

export default function CouponTopStrip({
  couponCode,
  couponDiscountPercent,
  hasCoupon,
  size = 'sm',
  className = '',
}: CouponTopStripProps) {
  const [copied, setCopied] = useState(false);

  if (!hasCoupon || couponDiscountPercent == null) return null;

  const unlocked = couponCode != null;
  const sizeClass = size === 'md' ? 'v1r-coupon-strip-md' : 'v1r-coupon-strip-sm';

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div
      className={`v1r-coupon-strip ${sizeClass} ${unlocked ? 'is-unlocked' : ''} ${className}`}
      data-testid="coupon-top-strip"
    >
      <span className="v1r-coupon-pct">{couponDiscountPercent}% OFF</span>
      <span className="v1r-coupon-label">
        {unlocked ? (
          <>
            <CheckIcon />
            <span>
              Use code{' '}
              <span className="v1r-coupon-code-chip">{couponCode}</span> at checkout
            </span>
          </>
        ) : (
          <>
            <LockIcon />
            <span>Member discount · Log in to unlock</span>
          </>
        )}
      </span>
      {unlocked && (
        <button
          type="button"
          onClick={handleCopy}
          className="v1r-coupon-copy"
          aria-label={`Copy code ${couponCode}`}
        >
          {copied ? (
            <>
              <CheckIcon />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
