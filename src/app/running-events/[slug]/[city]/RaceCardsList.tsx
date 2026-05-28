'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import LoginModal from '@/components/LoginModal';
import RaceCouponContext from '@/components/RaceCouponContext';
import CouponTopStrip from '@/components/CouponTopStrip';
import { couponCta } from '@/lib/coupon-cta';
import type { ApiEvent } from '@/app/running-events/page';

// ─── Formatters (mirrors RacesView so cards render identically) ─────

const SMALL_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'in', 'on', 'to', 'by', 'at', 'with']);
function normalizeTitle(raw?: string) {
  const t = (raw || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const letters = t.replace(/[^A-Za-z]/g, '');
  const upperRatio = letters
    ? letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length
    : 0;
  if (upperRatio < 0.7) return t;
  return t
    .split(' ')
    .map((w, i) => {
      if (/^\d/.test(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const fmtDay = (iso: string) => String(new Date(iso).getDate()).padStart(2, '0');
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { month: 'short' }).toUpperCase();
const fmtWeekday = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short' }).toUpperCase();
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

const isVirtual = (r: ApiEvent) =>
  r.eventType === 'virtual' || (r.locationName || '').toLowerCase() === 'anywhere';
const displayLocation = (r: ApiEvent) =>
  isVirtual(r) ? 'Virtual · India' : r.locationName || '—';

function initials(s: string) {
  const w = s.trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

const DISTANCE_LABELS: Record<string, string> = {
  HM: 'Half Marathon',
  FM: 'Marathon',
  '3K': '3K',
  '5K': '5K',
  '10K': '10K',
  '15K': '15K',
  '21K': 'Half Marathon',
  '42K': 'Marathon',
  '25K': '25K',
  '50K': '50K Ultra',
  '65K': '65K Ultra',
  '89K': 'Ultra',
  '90K': 'Ultra',
};
function primaryDistance(r: ApiEvent) {
  const cats = r.distanceCategories || [];
  if (!cats.length) return '';
  const priority = ['Marathon', 'FM', '42', 'Ultra', '65K', '50K', 'Half Marathon', 'HM', '21', '10K', '5K', '3K'];
  for (const p of priority) {
    const hit = cats.find((c) => (c.categoryName || '').toUpperCase().includes(p.toUpperCase()));
    if (hit) {
      const key = (hit.categoryName || '').toUpperCase().replace(/\s+/g, '');
      return DISTANCE_LABELS[key] || hit.categoryName || '';
    }
  }
  const first = cats[0].categoryName || '';
  return DISTANCE_LABELS[first.toUpperCase().replace(/\s+/g, '')] || first;
}

// ─── Register CTA button — mirrors /running-events CtaButton ─────

function RegisterButton({
  race,
  onLoginNeeded,
}: {
  race: ApiEvent;
  onLoginNeeded: (race: ApiEvent, pendingUrl?: string) => void;
}) {
  const cta = couponCta(race);
  const baseClass = 'v1r-race-action';
  const variantClass =
    cta.variant === 'green'
      ? `${baseClass}-primary is-success`
      : cta.variant === 'jet'
        ? `${baseClass}-primary`
        : `${baseClass}-primary`;
  const cls = `${baseClass} ${variantClass}`;

  if (cta.intent === 'tbd') {
    return <span className={cls} style={{ opacity: 0.55 }}>{cta.label}</span>;
  }
  // Plain Register on external events opens directly; only coupon-unlock
  // still routes through login (the discount is the value exchange).
  const needsLogin = cta.intent === 'login';
  if (needsLogin) {
    return (
      <button
        type="button"
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLoginNeeded(race, cta.intent === 'register' ? cta.href : undefined);
        }}
      >
        {cta.label}
      </button>
    );
  }
  if (cta.intent === 'detail' || cta.internal) {
    return (
      <Link href={cta.href} className={cls}>
        {cta.label}
      </Link>
    );
  }
  return (
    <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {cta.label}
    </a>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

function RaceCard({
  r,
  onLoginNeeded,
}: {
  r: ApiEvent;
  onLoginNeeded: (race: ApiEvent, pendingUrl?: string) => void;
}) {
  const title = normalizeTitle(r.title);
  const dist = primaryDistance(r);
  const virtual = isVirtual(r);
  const priceStr = r.priceMin != null ? `₹${r.priceMin.toLocaleString('en-IN')}` : null;
  const detailHref = `/running-events/${r.slug || r.id}`;
  const showCoupon = !!r.hasCoupon && r.couponDiscountPercent != null;
  const cta = couponCta(r);
  const showActions = cta.intent !== 'tbd' || showCoupon;

  return (
    <div className="v1r-race-card">
      {showCoupon && (
        <CouponTopStrip
          couponCode={r.couponCode ?? null}
          couponDiscountPercent={r.couponDiscountPercent ?? null}
          hasCoupon
          size="sm"
        />
      )}
      <Link href={detailHref} className="v1r-race-card-clickable">
        <div className="v1r-race-card-image">
          <div className="v1r-race-card-image-fallback">{initials(title)}</div>
          {r.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.imageUrl} alt={title} loading="lazy" />
          )}
          <div className="v1r-race-card-badges">
            {virtual && <span className="v1r-race-badge-virtual">Virtual</span>}
          </div>
        </div>
        <div className="v1r-race-card-body">
          <div className="v1r-race-top">
            <div className="v1r-race-date">
              <div className="v1r-race-date-day">{fmtDay(r.startTime)}</div>
              <div className="v1r-race-date-sub">
                {fmtMonth(r.startTime)} · {fmtWeekday(r.startTime)}
              </div>
            </div>
            {dist && <span className="v1r-race-distance">{dist}</span>}
          </div>
          <h3 className="v1r-race-title">{title}</h3>
          <div className="v1r-race-city">
            {displayLocation(r)} · {fmtTime(r.startTime)}
          </div>
          <div className="v1r-race-foot">
            <span />
            <span className="v1r-race-price">
              {priceStr ? (
                <>
                  From <strong>{priceStr}</strong>
                </>
              ) : (
                'Free'
              )}
            </span>
          </div>
        </div>
      </Link>
      {showActions && (
        <div className="v1r-race-actions">
          <Link href={detailHref} className="v1r-race-action v1r-race-action-ghost">
            Show details
          </Link>
          <RegisterButton race={r} onLoginNeeded={onLoginNeeded} />
        </div>
      )}
    </div>
  );
}

// ─── Public component: grid + shared login modal ─────────────────────

export default function RaceCardsList({
  races,
}: {
  races: ApiEvent[];
}) {
  const router = useRouter();
  const [loginRace, setLoginRace] = useState<ApiEvent | null>(null);
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  const pendingUrlRef = useRef<string | null>(null);
  const postLoginRef = useRef(false);

  const handleLoginNeeded = useCallback((race: ApiEvent, pendingUrl?: string) => {
    pendingUrlRef.current = pendingUrl ?? null;
    setLoginRace(race);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    postLoginRef.current = true;
    startLoginRefresh(() => {
      router.refresh();
    });
  }, [router]);

  // Once the post-login refresh commits, close the modal and pop the
  // pending URL in a new tab — still within the original gesture chain
  // so most popup blockers let it through.
  useEffect(() => {
    if (!isFinalizingLogin && postLoginRef.current) {
      postLoginRef.current = false;
      const pending = pendingUrlRef.current;
      pendingUrlRef.current = null;
      setLoginRace(null);
      if (pending) window.open(pending, '_blank', 'noopener,noreferrer');
    }
  }, [isFinalizingLogin]);

  return (
    <>
      <div className="v1r-races-grid">
        {races.map((r) => (
          <RaceCard
            key={r.id}
            r={r}
            onLoginNeeded={handleLoginNeeded}
          />
        ))}
      </div>

      <LoginModal
        open={!!loginRace || isFinalizingLogin}
        onClose={() => {
          pendingUrlRef.current = null;
          setLoginRace(null);
        }}
        onSuccess={handleLoginSuccess}
        finalizing={isFinalizingLogin}
        context={loginRace && loginRace.hasCoupon ? <RaceCouponContext race={loginRace} /> : undefined}
        title={
          loginRace?.hasCoupon ? (
            <>
              One tap to your <span className="v1lm-red">discount.</span>
            </>
          ) : (
            <>
              Sign in to <span className="v1lm-red">register.</span>
            </>
          )
        }
        subtitle={
          loginRace?.hasCoupon
            ? 'Sign in to unlock your member discount.'
            : 'Sign in so we can save your registration and remind you on race day.'
        }
      />
    </>
  );
}
