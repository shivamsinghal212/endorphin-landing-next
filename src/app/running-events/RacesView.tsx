'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import posthog from 'posthog-js';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';
import { useStoreLink } from '@/lib/use-store-link';
import { TOP_CITIES, extractCity } from '@/lib/cities';
import { couponCta, type CouponCta } from '@/lib/coupon-cta';
import CouponTopStrip from '@/components/CouponTopStrip';
import LoginModal from '@/components/LoginModal';
import RaceCouponContext from '@/components/RaceCouponContext';
import type { ApiEvent } from './page';

const SMALL_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'in', 'on', 'to', 'by', 'at', 'with']);
function normalizeTitle(raw?: string) {
  const t = (raw || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const letters = t.replace(/[^A-Za-z]/g, '');
  const upperRatio = letters ? letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length : 0;
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
function labelFor(name?: string) {
  if (!name) return '';
  const up = name.toUpperCase().replace(/\s+/g, '');
  return DISTANCE_LABELS[up] || name;
}
function primaryDistance(r: ApiEvent) {
  const cats = r.distanceCategories || [];
  if (!cats.length) return '';
  const priority = ['Marathon', 'FM', '42', 'Ultra', '65K', '50K', 'Half Marathon', 'HM', '21', '10K', '5K', '3K'];
  for (const p of priority) {
    const hit = cats.find((c) => (c.categoryName || '').toUpperCase().includes(p.toUpperCase()));
    if (hit) return labelFor(hit.categoryName);
  }
  return labelFor(cats[0].categoryName);
}

interface Signal {
  kind: 'going' | 'signal';
  text: string;
}
function popularitySignal(r: ApiEvent): Signal | null {
  if ((r.goingCount || 0) >= 5) return { kind: 'going', text: `${r.goingCount} going` };
  if (r.totalTicketsSold && r.totalTicketsSold >= 20) return { kind: 'signal', text: `${r.totalTicketsSold}+ registered` };
  if (r.organizerName) return { kind: 'signal', text: `By ${r.organizerName}` };
  return null;
}
const isVirtual = (r: ApiEvent) => r.eventType === 'virtual' || (r.locationName || '').toLowerCase() === 'anywhere';
const displayLocation = (r: ApiEvent) => (isVirtual(r) ? 'Virtual · India' : r.locationName || '—');
// City filtering uses the same canonical extractor as chip generation so a
// race shows up under the same chip the user clicked.
const matchesCity = (r: ApiEvent, city: string) =>
  !city || (!isVirtual(r) && extractCity(r.locationName) === city);

// Pin to IST so SSR (UTC server) and the client (any TZ) format dates
// identically — without timeZone, locale formatting and getDate() use the
// runtime's local zone, which causes React #418 hydration mismatches.
const IST = 'Asia/Kolkata';
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', timeZone: IST });
const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { month: 'short', timeZone: IST }).toUpperCase();
const fmtWeekday = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', timeZone: IST }).toUpperCase();
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const daysTo = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000));

function initials(s: string) {
  const w = s.trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

// Flagship selection:
// - Show ALL featured races (isFeatured = true) sorted by start_time, in scope.
// - When zero featured races in scope, fall back to a single earliest-upcoming race.
// - City scope applies first when one is selected.
function pickFeatured(allRaces: ApiEvent[], city: string): ApiEvent[] {
  const pool = city ? allRaces.filter((r) => matchesCity(r, city)) : allRaces;
  if (!pool.length) return [];
  const sortByDate = (a: ApiEvent, b: ApiEvent) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  const featured = pool.filter((r) => r.isFeatured);
  if (featured.length) return [...featured].sort(sortByDate);
  return [[...pool].sort(sortByDate)[0]];
}

function storySnippet(r: ApiEvent) {
  const clean = (r.description || '').replace(/[#*`_]/g, '').trim();
  if (!clean) return 'Join runners from across India for one of this month’s standout start lines.';
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const body = lines.length > 1 ? lines.slice(1).join(' ') : lines[0];
  return body.length > 160 ? body.slice(0, 160).replace(/\s+\S*$/, '') + '…' : body;
}

// ─── Cards ───────────────────────────────────

/** Shared coupon-aware Register button for race + featured cards.
 *  variant: 'race-action' = listing card bottom bar; 'btn' = featured card side panel.
 *  When `isAuthed` is false, plain Register (intent='register') is also routed
 *  through the login modal — the parent receives the registrationUrl so it can
 *  reopen it in a new tab once auth finalizes. */
function CtaButton({
  cta,
  isAuthed,
  onLoginNeeded,
  onRegisterClick,
  shape = 'race-action',
}: {
  cta: CouponCta;
  isAuthed: boolean;
  onLoginNeeded: (pendingUrl?: string) => void;
  onRegisterClick?: () => void;
  shape?: 'race-action' | 'btn';
}) {
  const baseClass = shape === 'race-action' ? 'v1r-race-action' : 'v1r-btn';
  const variantClass =
    cta.variant === 'green'
      ? `${baseClass}-success`
      : cta.variant === 'jet'
        ? `${baseClass}-disabled`
        : `${baseClass}-primary`;
  const cls = `${baseClass} ${variantClass}`;

  if (cta.intent === 'tbd') {
    return <span className={cls}>{cta.label}</span>;
  }
  const needsLogin = cta.intent === 'login' || (cta.intent === 'register' && !isAuthed);
  if (needsLogin) {
    return (
      <button
        type="button"
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRegisterClick?.();
          onLoginNeeded(cta.intent === 'register' ? cta.href : undefined);
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
    <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onRegisterClick}>
      {cta.label}
    </a>
  );
}

function RaceCard({
  r,
  isAuthed,
  onLoginNeeded,
}: {
  r: ApiEvent;
  isAuthed: boolean;
  onLoginNeeded: (r: ApiEvent, pendingUrl?: string) => void;
}) {
  const title = normalizeTitle(r.title);
  const dist = primaryDistance(r);
  const sig = popularitySignal(r);
  const virtual = isVirtual(r);
  const priceStr = r.priceMin != null ? `₹${r.priceMin.toLocaleString('en-IN')}` : null;
  const detailHref = `/running-events/${r.slug || r.id}`;
  const showCoupon = !!r.hasCoupon && r.couponDiscountPercent != null;
  const cta = couponCta(r);
  // Auth-gate plain Register too — when anon, even no-coupon registers route
  // through the login modal before opening the external URL.
  const showActions = cta.intent !== 'tbd' || showCoupon;

  return (
    <div className="v1r-race-card">
      {showCoupon && (
        <CouponTopStrip
          couponCode={r.couponCode ?? null}
          couponDiscountPercent={r.couponDiscountPercent ?? null}
          hasCoupon={true}
          size="sm"
        />
      )}
      <Link href={detailHref} className="v1r-race-card-clickable">
        <div className="v1r-race-card-image">
          <div className="v1r-race-card-image-fallback">{initials(title)}</div>
          {r.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.imageUrl}
              alt={title}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
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
            {sig ? (
              sig.kind === 'going' ? (
                <span className="v1r-race-going">{sig.text}</span>
              ) : (
                <span className="v1r-race-signal">{sig.text}</span>
              )
            ) : (
              <span />
            )}
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
          <CtaButton
            cta={cta}
            isAuthed={isAuthed}
            onLoginNeeded={(pendingUrl) => onLoginNeeded(r, pendingUrl)}
            onRegisterClick={() => posthog.capture('race_register_clicked', {
              race_id: r.id,
              race_slug: r.slug,
              race_title: r.title,
              race_location: r.locationName,
              has_coupon: r.hasCoupon,
              source: 'listing',
            })}
          />
        </div>
      )}
    </div>
  );
}

function FeaturedCard({
  r,
  isAuthed,
  onLoginNeeded,
}: {
  r: ApiEvent;
  isAuthed: boolean;
  onLoginNeeded: (r: ApiEvent, pendingUrl?: string) => void;
}) {
  const dateStr = new Date(r.startTime).toLocaleString('en-GB', { day: 'numeric', month: 'long', timeZone: IST });
  const dist = primaryDistance(r) || 'Run';
  const title = normalizeTitle(r.title);
  const price = r.priceMin != null ? `₹${r.priceMin.toLocaleString('en-IN')}` : 'Free';
  const sig = popularitySignal(r);
  const pillText = sig
    ? sig.kind === 'going'
      ? `${r.goingCount} going from Endorfin`
      : sig.text
    : r.organizerName
      ? `By ${r.organizerName}`
      : 'Endorfin pick of the month';
  const story = storySnippet(r);
  const detailHref = `/running-events/${r.slug || r.id}`;
  const showCoupon = !!r.hasCoupon && r.couponDiscountPercent != null;
  const cta = couponCta(r);

  return (
    <div className="v1r-featured-wrap">
      {showCoupon && (
        <CouponTopStrip
          couponCode={r.couponCode ?? null}
          couponDiscountPercent={r.couponDiscountPercent ?? null}
          hasCoupon={true}
          size="md"
        />
      )}
      <article className="v1r-featured-card">
        <div
          className="v1r-featured-card-bg"
          style={r.imageUrl ? { backgroundImage: `url('${r.imageUrl}')` } : undefined}
          aria-hidden
        />
        <div className="v1r-featured-main">
          <div>
            <div className="v1r-featured-kicker">
              {dateStr} · {displayLocation(r)} · {dist}
            </div>
            <h3 className="v1r-featured-title">{title}</h3>
          </div>
          <div className="v1r-featured-meta">
            <div className="v1r-featured-meta-block">
              <div className="v1r-featured-meta-label">Distance</div>
              <div className="v1r-featured-meta-value">{dist}</div>
            </div>
            <div className="v1r-featured-meta-block">
              <div className="v1r-featured-meta-label">Start time</div>
              <div className="v1r-featured-meta-value">{fmtTime(r.startTime)}</div>
            </div>
            <div className="v1r-featured-meta-block">
              <div className="v1r-featured-meta-label">Venue</div>
              <div className="v1r-featured-meta-value">{r.venueName || r.locationName || '—'}</div>
            </div>
            <div className="v1r-featured-meta-block">
              <div className="v1r-featured-meta-label">Price from</div>
              <div className="v1r-featured-meta-value">{price}</div>
            </div>
          </div>
        </div>
        <div className="v1r-featured-side">
          <div>
            <span className="v1r-going-pill">{pillText}</span>
            <p className="v1r-featured-story">{story}</p>
          </div>
          <div className="v1r-featured-ctas">
            <CtaButton
              cta={cta}
              isAuthed={isAuthed}
              onLoginNeeded={(pendingUrl) => onLoginNeeded(r, pendingUrl)}
              onRegisterClick={() => posthog.capture('race_register_clicked', {
                race_id: r.id,
                race_slug: r.slug,
                race_title: r.title,
                race_location: r.locationName,
                has_coupon: r.hasCoupon,
                source: 'featured',
              })}
              shape="btn"
            />
            <Link href={detailHref} className="v1r-btn v1r-btn-ghost-light">
              Show details →
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── Main view ─────────────────────────────

export default function RacesView({
  races: initialRaces,
  isAuthed,
}: {
  races: ApiEvent[];
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [allRaces, setAllRaces] = useState<ApiEvent[]>(initialRaces);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [loginRace, setLoginRace] = useState<ApiEvent | null>(null);
  // Tracks whether we've passed initial hydration. Time-derived UI
  // (daysTo, etc.) must defer to post-mount so SSR/cached HTML doesn't
  // mismatch the client render → React error #418 in production.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // When a plain (non-coupon) Register click triggers login, stash the URL so
  // we can pop it open in a new tab once the post-login refresh commits.
  const pendingRegistrationUrlRef = useRef<string | null>(null);
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  const postLoginRef = useRef(false);
  // Mobile: send "Get the app" CTAs straight to the right store.
  // Desktop / unknown UA: keep #download anchor → both store buttons inline.
  const downloadHref = useStoreLink('#download');

  const handleLoginNeeded = useCallback((r: ApiEvent, pendingUrl?: string) => {
    pendingRegistrationUrlRef.current = pendingUrl ?? null;
    setLoginRace(r);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    postLoginRef.current = true;
    // Re-render with cookie attached so server fetch returns coupon codes.
    // Wrapped in startTransition so the pending flag stays true until the
    // new server data has rendered — that lets the modal show a loader
    // until the listing actually reflects the signed-in state.
    startLoginRefresh(() => {
      router.refresh();
    });
  }, [router]);

  // Close the login modal once the post-login refresh commits. If the click
  // that opened the modal was a plain Register (we stashed the URL), pop it in
  // a new tab now — this stays close enough to the original user gesture that
  // most browsers allow window.open.
  useEffect(() => {
    if (!isFinalizingLogin && postLoginRef.current) {
      postLoginRef.current = false;
      const pending = pendingRegistrationUrlRef.current;
      pendingRegistrationUrlRef.current = null;
      setLoginRace(null);
      if (pending) window.open(pending, '_blank', 'noopener,noreferrer');
    }
  }, [isFinalizingLogin]);

  // Sync state when the server re-renders with new props (e.g. after
  // router.refresh() following sign-in or sign-out — the cookie state
  // changes server-side and initialRaces comes back with/without coupon
  // codes populated). Without this, useState(initialRaces) seeds once
  // and ignores subsequent prop changes, leaving the listing stale.
  useEffect(() => {
    setAllRaces(initialRaces);
  }, [initialRaces]);

  // Fallback: only fetch client-side when server-side fetch returned empty
  // (e.g. transient DNS during build). Authed users get coupon codes from the
  // server render — refetching client-side would lose them since the JWT
  // lives in an HttpOnly cookie and isn't readable here.
  // API caps limit at 50, so page through (hard cap 20 pages) to grab all.
  useEffect(() => {
    if (initialRaces.length > 0) return;
    let cancelled = false;
    (async () => {
      const PAGE_SIZE = 50;
      const MAX_PAGES = 20;
      const collected: ApiEvent[] = [];
      let page = 1;
      let totalPages = 1;
      try {
        do {
          const r = await fetch(
            `https://api.endorfin.run/api/v1/events?limit=${PAGE_SIZE}&page=${page}`,
            { cache: 'no-store' },
          );
          if (!r.ok) break;
          const data = await r.json();
          if (cancelled || !data) return;
          const items: ApiEvent[] = data.items || [];
          collected.push(...items);
          totalPages = Math.max(1, Number(data.pages) || 1);
          if (items.length < PAGE_SIZE) break;
          page += 1;
        } while (page <= totalPages && page <= MAX_PAGES);
      } catch {
        return;
      }
      if (cancelled) return;
      const cutoff = Date.now() - 86400000;
      const fresh = collected
        .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      if (fresh.length) setAllRaces(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRaces.length]);

  const filtered = useMemo(
    () => (currentCity ? allRaces.filter((r) => matchesCity(r, currentCity)) : allRaces),
    [allRaces, currentCity]
  );
  const featured = useMemo(
    () => pickFeatured(allRaces, currentCity),
    [allRaces, currentCity]
  );
  const grid = filtered;

  // City chips: derive a canonical city for each race via extractCity, then
  // bucket counts. TOP_CITIES present in scope appear first (in their canonical
  // order), the remainder are sorted by race count desc. Races whose
  // locationName resolves to null (long venue addresses we can't safely
  // shorten) are dropped from the chip strip — they remain in the listing.
  const cityChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRaces) {
      if (isVirtual(r)) continue;
      const city = extractCity(r.locationName);
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    const top = TOP_CITIES.filter((c) => (counts.get(c) || 0) > 0).map((c) => ({
      name: c as string,
      count: counts.get(c)!,
    }));
    const topSet = new Set(top.map((x) => x.name));
    const extras = Array.from(counts.entries())
      .filter(([name]) => !topSet.has(name))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
    return [...top, ...extras];
  }, [allRaces]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRaces) {
      if (isVirtual(r)) continue;
      const c = extractCity(r.locationName);
      if (c) set.add(c);
    }
    return set.size;
  }, [allRaces]);

  const ribbonNames = useMemo(
    () => allRaces.slice(0, 10).map((r) => normalizeTitle(r.title).toUpperCase()),
    [allRaces]
  );

  // Carousel refs + control state
  const featuredRef = useRef<HTMLDivElement | null>(null);
  const upRef = useRef<HTMLDivElement | null>(null);

  const [featuredPrev, setFlagPrev] = useState(true);
  const [featuredNext, setFlagNext] = useState(true);
  const [featuredCanScroll, setFlagCanScroll] = useState(false);
  const [featuredActive, setFlagActive] = useState(0);

  const [upPrev, setUpPrev] = useState(true);
  const [upNext, setUpNext] = useState(true);
  const [upCanScroll, setUpCanScroll] = useState(false);
  const [progressLeft, setProgressLeft] = useState(0);
  const [progressWidth, setProgressWidth] = useState(100);

  const featuredStep = useCallback(() => {
    const el = featuredRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1r-featured-wrap, .v1r-featured-card') as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || '18') || 18;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const upStep = useCallback(() => {
    const el = upRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1r-race-card') as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap || '18') || 18;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const updateFeatured = useCallback(() => {
    const el = featuredRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setFlagCanScroll(max > 2);
    setFlagPrev(x <= 2);
    setFlagNext(x >= max - 2 || max <= 0);
    const step = featuredStep();
    setFlagActive(step > 0 ? Math.round(x / step) : 0);
  }, [featuredStep]);

  const updateUp = useCallback(() => {
    const el = upRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setUpCanScroll(max > 2);
    setUpPrev(x <= 2);
    setUpNext(x >= max - 2 || max <= 0);
    if (max > 0) {
      const viewportRatio = Math.min(1, el.clientWidth / el.scrollWidth);
      const scrollRatio = x / max;
      const travel = (1 - viewportRatio) * 100;
      setProgressLeft(scrollRatio * travel);
      setProgressWidth(viewportRatio * 100);
    } else {
      setProgressLeft(0);
      setProgressWidth(100);
    }
  }, []);

  useEffect(() => {
    if (featuredRef.current) featuredRef.current.scrollLeft = 0;
    requestAnimationFrame(updateFeatured);
  }, [featured, updateFeatured]);

  useEffect(() => {
    if (upRef.current) upRef.current.scrollLeft = 0;
    requestAnimationFrame(updateUp);
  }, [grid, updateUp]);

  useEffect(() => {
    const onResize = () => {
      requestAnimationFrame(() => {
        updateFeatured();
        updateUp();
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateFeatured, updateUp]);

  const scrollFeatured = (dir: 1 | -1) => featuredRef.current?.scrollBy({ left: dir * featuredStep(), behavior: 'smooth' });
  const scrollUp = (dir: 1 | -1) => upRef.current?.scrollBy({ left: dir * upStep(), behavior: 'smooth' });

  const scope = currentCity || 'India';
  const singleUp = grid.length === 1;

  const onFeaturedKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollFeatured(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollFeatured(-1);
    }
  };
  const onUpKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollUp(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollUp(-1);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="v1r-hero">
        <div className="v1r-hero-bg" aria-hidden />
        <div className="v1r-container">
          <h1 className="v1r-hero-title">
            Every running event<br />in India. <span className="v1r-red">Listed.</span>
          </h1>

          <div className="v1r-hero-foot">
            <p className="v1r-hero-sub">
              Every start line in the country, in one feed. RSVP in a tap, see who else is going, show up at the
              line with your crew.
            </p>
            <div className="v1r-hero-stats">
              <div>
                <div className="v1r-hero-stat-n">{allRaces.length}</div>
                <div className="v1r-hero-stat-l">Events</div>
              </div>
              <div>
                <div className="v1r-hero-stat-n">{uniqueCities}</div>
                <div className="v1r-hero-stat-l">Indian cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      {ribbonNames.length > 0 && (
        <div className="v1r-ribbon" aria-hidden>
          <div className="v1r-ribbon-track">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ display: 'inline-flex' }}>
                {ribbonNames.map((n, j) => (
                  <span key={`${i}-${j}`}>{n} ·</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <section className="v1r-filter-strip">
        <div className="v1r-container">
          <div className="v1r-filter-row">
            <span className="v1r-filter-label">By City</span>
            <div className="v1r-filter-chips">
              <button
                className={`v1r-chip ${!currentCity ? 'is-active' : ''}`}
                onClick={() => {
                  setCurrentCity('');
                  posthog.capture('city_filter_selected', { city: 'All India' });
                }}
                aria-pressed={!currentCity}
              >
                All India <span className="v1r-count">{allRaces.length}</span>
              </button>
              {cityChips.map(({ name, count }) => (
                <button
                  key={name}
                  className={`v1r-chip ${currentCity === name ? 'is-active' : ''}`}
                  onClick={() => {
                    setCurrentCity(name);
                    posthog.capture('city_filter_selected', { city: name, race_count: count });
                  }}
                  aria-pressed={currentCity === name}
                >
                  {name} <span className="v1r-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="v1r-featured">
          <div className="v1r-container">
            <div className="v1r-section-header">
              <h2 className="v1r-section-title">
                This month&apos;s featured in <b>{scope}</b>.
              </h2>
              <div className="v1r-featured-header-right">
                <span className="v1r-section-count" suppressHydrationWarning>
                  {mounted ? `${daysTo(featured[0].startTime)} days to start line` : ''}
                </span>
                <div className="v1r-carousel-controls" hidden={!featuredCanScroll} role="group">
                  <button
                    className="v1r-carousel-btn"
                    disabled={featuredPrev}
                    onClick={() => scrollFeatured(-1)}
                    aria-label="Previous featured"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="v1r-carousel-btn"
                    disabled={featuredNext}
                    onClick={() => scrollFeatured(1)}
                    aria-label="Next featured"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="v1r-featured-carousel-wrap">
              <div
                className="v1r-featured-carousel"
                ref={featuredRef}
                onScroll={() => requestAnimationFrame(updateFeatured)}
                onKeyDown={onFeaturedKey}
                tabIndex={0}
                role="region"
                aria-label="Featured events"
              >
                {featured.map((r) => (
                  <FeaturedCard
                    key={r.id}
                    r={r}
                    isAuthed={isAuthed}
                    onLoginNeeded={handleLoginNeeded}
                  />
                ))}
              </div>
            </div>

            {featured.length > 1 && (
              <div className="v1r-featured-dots" role="tablist" aria-label="Featured pagination">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    className={`v1r-featured-dot ${i === featuredActive ? 'is-active' : ''}`}
                    aria-label={`Featured ${i + 1} of ${featured.length}`}
                    aria-selected={i === featuredActive}
                    role="tab"
                    onClick={() => featuredRef.current?.scrollTo({ left: i * featuredStep(), behavior: 'smooth' })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upcoming events */}
      <section className="v1r-races-section">
        <div className="v1r-container">
          <div className="v1r-section-header">
            <h2 className="v1r-section-title">
              Upcoming <b>events.</b>
            </h2>
            <div className="v1r-races-header-right">
              <span className="v1r-section-count">
                {grid.length === 0 ? '0 events' : `${grid.length} ${grid.length === 1 ? 'event' : 'events'}`}
              </span>
              <div className="v1r-carousel-controls" hidden={!upCanScroll} role="group">
                <button
                  className="v1r-carousel-btn"
                  disabled={upPrev}
                  onClick={() => scrollUp(-1)}
                  aria-label="Previous events"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="v1r-carousel-btn"
                  disabled={upNext}
                  onClick={() => scrollUp(1)}
                  aria-label="Next events"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className={`v1r-races-carousel-wrap ${singleUp ? 'is-single-wrap' : ''}`}>
            <div
              className={`v1r-races-carousel ${singleUp ? 'is-single' : ''}`}
              ref={upRef}
              onScroll={() => requestAnimationFrame(updateUp)}
              onKeyDown={onUpKey}
              tabIndex={0}
              role="region"
              aria-label="Upcoming events"
            >
              {grid.length === 0 ? (
                <div className="v1r-empty-state">
                  No upcoming events{currentCity ? ` in ${currentCity}` : ''}. Try another city.
                </div>
              ) : (
                grid.map((r) => (
                  <RaceCard
                    key={r.id}
                    r={r}
                    isAuthed={isAuthed}
                    onLoginNeeded={handleLoginNeeded}
                  />
                ))
              )}
            </div>
          </div>

          <div className="v1r-carousel-foot">
            <div className="v1r-carousel-progress" hidden={!upCanScroll} aria-hidden>
              <div
                className="v1r-carousel-progress-bar"
                style={{ left: `${progressLeft}%`, width: `${progressWidth}%` }}
              />
            </div>
            <div className="v1r-races-more">
              <a href={downloadHref} className="v1r-btn v1r-btn-ghost">
                Get the app →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="v1r-cta-footer" id="download">
        <div className="v1r-container v1r-cta-grid">
          <div>
            <h2 className="v1r-cta-heading">
              Your next start<br />line <span className="v1r-red">—</span><br />in your pocket.
            </h2>
            <p className="v1r-cta-sub">
              Install Endorfin. Bookmark a running event, tap &quot;Going,&quot; show up with your crew. Free on Android and
              iOS.
            </p>
          </div>
          <div className="v1r-cta-buttons">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="v1r-btn v1r-btn-ghost-light"
            >
              <svg className="v1r-btn-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"
                />
              </svg>
              App Store
            </Link>
            <Link
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="v1r-btn v1r-btn-primary"
            >
              <svg className="v1r-btn-icon" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"
                />
              </svg>
              Google Play
            </Link>
          </div>
        </div>
      </section>

      {/* Contextual login modal — opened by anon Register CTAs (both coupon
          "Register at X% off" and plain "Register"). On success we
          router.refresh() so the cookie-based fetch returns coupon codes and
          CTAs flip to the unlocked variant; for plain registers we also
          window.open the registrationUrl in a new tab once refresh commits. */}
      <LoginModal
        open={!!loginRace || isFinalizingLogin}
        onClose={() => {
          pendingRegistrationUrlRef.current = null;
          setLoginRace(null);
        }}
        onSuccess={handleLoginSuccess}
        finalizing={isFinalizingLogin}
        context={
          loginRace && loginRace.hasCoupon ? <RaceCouponContext race={loginRace} /> : undefined
        }
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
            ? 'Sign in to unlock the member discount and save races.'
            : 'Quick sign-in, then we’ll send you straight to registration.'
        }
      />
    </>
  );
}
