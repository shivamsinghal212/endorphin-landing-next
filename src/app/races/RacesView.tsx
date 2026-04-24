'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';
import type { ApiEvent } from './page';

const TOP_CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai'] as const;

const CITY_ALIASES: Record<string, string[]> = {
  Delhi: ['delhi', 'new delhi', 'ncr'],
  Mumbai: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
  Bengaluru: ['bengaluru', 'bangalore'],
  Hyderabad: ['hyderabad', 'secunderabad'],
  Chennai: ['chennai', 'madras'],
};

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
function matchesCity(r: ApiEvent, city: string) {
  if (!city) return true;
  const loc = (r.locationName || '').toLowerCase();
  const aliases = CITY_ALIASES[city] || [city.toLowerCase()];
  return aliases.some((a) => loc === a);
}

const fmtDay = (iso: string) => String(new Date(iso).getDate()).padStart(2, '0');
const fmtMonth = (iso: string) => new Date(iso).toLocaleString('en-GB', { month: 'short' }).toUpperCase();
const fmtWeekday = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short' }).toUpperCase();
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const daysTo = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86400000));

function initials(s: string) {
  const w = s.trim().split(/\s+/);
  return ((w[0] || '')[0] || '').toUpperCase() + ((w[1] || '')[0] || '').toUpperCase();
}

function scoreRace(r: ApiEvent) {
  return (
    (r.isFeatured ? 10000 : 0) +
    (r.goingCount || 0) * 10 +
    (r.totalTicketsSold || 0) +
    (isVirtual(r) ? -50 : 0)
  );
}
function topOne(pool: ApiEvent[]) {
  if (!pool.length) return null;
  return [...pool].sort(
    (a, b) => scoreRace(b) - scoreRace(a) || new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )[0];
}

// Flagship selection:
// - When a city is picked: top 1 race from that city.
// - When "All India": top 1 race per top-5 city, clubbed together.
function pickFlagships(allRaces: ApiEvent[], city: string, cities: readonly string[]): ApiEvent[] {
  if (city) {
    const pool = allRaces.filter((r) => matchesCity(r, city));
    const top = topOne(pool);
    return top ? [top] : [];
  }
  return cities
    .map((c) => topOne(allRaces.filter((r) => matchesCity(r, c))))
    .filter((r): r is ApiEvent => r !== null);
}

function storySnippet(r: ApiEvent) {
  const clean = (r.description || '').replace(/[#*`_]/g, '').trim();
  if (!clean) return 'Join runners from across India for one of this month’s standout start lines.';
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const body = lines.length > 1 ? lines.slice(1).join(' ') : lines[0];
  return body.length > 160 ? body.slice(0, 160).replace(/\s+\S*$/, '') + '…' : body;
}

// ─── Cards ───────────────────────────────────

function RaceCard({ r }: { r: ApiEvent }) {
  const title = normalizeTitle(r.title);
  const dist = primaryDistance(r);
  const sig = popularitySignal(r);
  const virtual = isVirtual(r);
  const priceStr = r.priceMin != null ? `₹${r.priceMin.toLocaleString('en-IN')}` : null;
  const href = `https://endorfin.run/e/${r.slug || r.id}`;

  return (
    <Link href={href} className="v1r-race-card" target="_blank" rel="noopener noreferrer">
      <div className="v1r-race-card-image">
        <div className="v1r-race-card-image-fallback">{initials(title)}</div>
        {r.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt=""
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
  );
}

function FlagshipCard({ r }: { r: ApiEvent }) {
  const dateStr = new Date(r.startTime).toLocaleString('en-GB', { day: 'numeric', month: 'long' });
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
  const href = `https://endorfin.run/e/${r.slug || r.id}`;

  return (
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
          <Link href={href} target="_blank" rel="noopener noreferrer" className="v1r-btn v1r-btn-primary">
            RSVP on Endorfin
          </Link>
          <Link href={href} target="_blank" rel="noopener noreferrer" className="v1r-btn v1r-btn-ghost-light">
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Main view ─────────────────────────────

export default function RacesView({ races: initialRaces }: { races: ApiEvent[] }) {
  const [allRaces, setAllRaces] = useState<ApiEvent[]>(initialRaces);
  const [currentCity, setCurrentCity] = useState<string>('');

  // Client-side fetch — refresh on mount, also acts as fallback when
  // server-side fetch failed during build/ISR (e.g. transient DNS).
  useEffect(() => {
    let cancelled = false;
    fetch('https://api.endorfin.run/api/v1/events?limit=30', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const items: ApiEvent[] = data.items || [];
        const cutoff = Date.now() - 86400000;
        const fresh = items
          .filter((e) => e.startTime && new Date(e.startTime).getTime() >= cutoff)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        if (fresh.length) setAllRaces(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (currentCity ? allRaces.filter((r) => matchesCity(r, currentCity)) : allRaces),
    [allRaces, currentCity]
  );
  const flagships = useMemo(
    () => pickFlagships(allRaces, currentCity, TOP_CITIES),
    [allRaces, currentCity]
  );
  const grid = useMemo(() => filtered.slice(0, 12), [filtered]);

  const cityCounts = useMemo(() => {
    const o: Record<string, number> = {};
    TOP_CITIES.forEach((c) => {
      o[c] = allRaces.filter((r) => matchesCity(r, c)).length;
    });
    return o;
  }, [allRaces]);

  const uniqueCities = useMemo(() => {
    const set = new Set(
      allRaces
        .map((r) => r.locationName)
        .filter((l): l is string => !!l && l.toLowerCase() !== 'anywhere')
    );
    return set.size;
  }, [allRaces]);

  const ribbonNames = useMemo(
    () => allRaces.slice(0, 10).map((r) => normalizeTitle(r.title).toUpperCase()),
    [allRaces]
  );

  // Carousel refs + control state
  const flagRef = useRef<HTMLDivElement | null>(null);
  const upRef = useRef<HTMLDivElement | null>(null);

  const [flagPrev, setFlagPrev] = useState(true);
  const [flagNext, setFlagNext] = useState(true);
  const [flagCanScroll, setFlagCanScroll] = useState(false);
  const [flagActive, setFlagActive] = useState(0);

  const [upPrev, setUpPrev] = useState(true);
  const [upNext, setUpNext] = useState(true);
  const [upCanScroll, setUpCanScroll] = useState(false);
  const [progressLeft, setProgressLeft] = useState(0);
  const [progressWidth, setProgressWidth] = useState(100);

  const flagStep = useCallback(() => {
    const el = flagRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1r-featured-card') as HTMLElement | null;
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

  const updateFlag = useCallback(() => {
    const el = flagRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setFlagCanScroll(max > 2);
    setFlagPrev(x <= 2);
    setFlagNext(x >= max - 2 || max <= 0);
    const step = flagStep();
    setFlagActive(step > 0 ? Math.round(x / step) : 0);
  }, [flagStep]);

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
    if (flagRef.current) flagRef.current.scrollLeft = 0;
    requestAnimationFrame(updateFlag);
  }, [flagships, updateFlag]);

  useEffect(() => {
    if (upRef.current) upRef.current.scrollLeft = 0;
    requestAnimationFrame(updateUp);
  }, [grid, updateUp]);

  useEffect(() => {
    const onResize = () => {
      requestAnimationFrame(() => {
        updateFlag();
        updateUp();
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateFlag, updateUp]);

  const scrollFlag = (dir: 1 | -1) => flagRef.current?.scrollBy({ left: dir * flagStep(), behavior: 'smooth' });
  const scrollUp = (dir: 1 | -1) => upRef.current?.scrollBy({ left: dir * upStep(), behavior: 'smooth' });

  const scope = currentCity || 'India';
  const singleUp = grid.length === 1;

  const onFlagKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollFlag(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollFlag(-1);
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
            Every race<br />in India. <span className="v1r-red">Listed.</span>
          </h1>

          <div className="v1r-hero-foot">
            <p className="v1r-hero-sub">
              Every start line in the country, in one feed. RSVP in a tap, see who else is going, show up at the
              line with your crew.
            </p>
            <div className="v1r-hero-stats">
              <div>
                <div className="v1r-hero-stat-n">{allRaces.length}+</div>
                <div className="v1r-hero-stat-l">Races</div>
              </div>
              <div>
                <div className="v1r-hero-stat-n">{uniqueCities}+</div>
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
                onClick={() => setCurrentCity('')}
                aria-pressed={!currentCity}
              >
                All India <span className="v1r-count">{allRaces.length}</span>
              </button>
              {TOP_CITIES.map((c) => (
                <button
                  key={c}
                  className={`v1r-chip ${currentCity === c ? 'is-active' : ''}`}
                  onClick={() => setCurrentCity(c)}
                  aria-pressed={currentCity === c}
                >
                  {c} <span className="v1r-count">{cityCounts[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flagship */}
      {flagships.length > 0 && (
        <section className="v1r-featured">
          <div className="v1r-container">
            <div className="v1r-section-header">
              <h2 className="v1r-section-title">
                This month&apos;s flagship in <b>{scope}</b>.
              </h2>
              <div className="v1r-flagship-header-right">
                <span className="v1r-section-count">
                  {daysTo(flagships[0].startTime)} days to start line
                </span>
                <div className="v1r-carousel-controls" hidden={!flagCanScroll} role="group">
                  <button
                    className="v1r-carousel-btn"
                    disabled={flagPrev}
                    onClick={() => scrollFlag(-1)}
                    aria-label="Previous flagship"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="v1r-carousel-btn"
                    disabled={flagNext}
                    onClick={() => scrollFlag(1)}
                    aria-label="Next flagship"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="v1r-flagship-carousel-wrap">
              <div
                className="v1r-flagship-carousel"
                ref={flagRef}
                onScroll={() => requestAnimationFrame(updateFlag)}
                onKeyDown={onFlagKey}
                tabIndex={0}
                role="region"
                aria-label="Flagship races"
              >
                {flagships.map((r) => (
                  <FlagshipCard key={r.id} r={r} />
                ))}
              </div>
            </div>

            {flagships.length > 1 && (
              <div className="v1r-flagship-dots" role="tablist" aria-label="Flagship pagination">
                {flagships.map((_, i) => (
                  <button
                    key={i}
                    className={`v1r-flagship-dot ${i === flagActive ? 'is-active' : ''}`}
                    aria-label={`Flagship ${i + 1} of ${flagships.length}`}
                    aria-selected={i === flagActive}
                    role="tab"
                    onClick={() => flagRef.current?.scrollTo({ left: i * flagStep(), behavior: 'smooth' })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upcoming races */}
      <section className="v1r-races-section">
        <div className="v1r-container">
          <div className="v1r-section-header">
            <h2 className="v1r-section-title">
              Upcoming <b>races.</b>
            </h2>
            <div className="v1r-races-header-right">
              <span className="v1r-section-count">
                {grid.length === 0 ? '0 races' : `Showing ${grid.length} of ${filtered.length}`}
              </span>
              <div className="v1r-carousel-controls" hidden={!upCanScroll} role="group">
                <button
                  className="v1r-carousel-btn"
                  disabled={upPrev}
                  onClick={() => scrollUp(-1)}
                  aria-label="Previous races"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className="v1r-carousel-btn"
                  disabled={upNext}
                  onClick={() => scrollUp(1)}
                  aria-label="Next races"
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
              aria-label="Upcoming races"
            >
              {grid.length === 0 ? (
                <div className="v1r-empty-state">
                  No upcoming races{currentCity ? ` in ${currentCity}` : ''}. Try another city.
                </div>
              ) : (
                grid.map((r) => <RaceCard key={r.id} r={r} />)
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
            {filtered.length > 12 && (
              <div className="v1r-races-more">
                <a href="#download" className="v1r-btn v1r-btn-ghost">
                  Get the app for all races →
                </a>
              </div>
            )}
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
              Install Endorfin. Bookmark a race, tap &quot;Going,&quot; show up with your crew. Free on Android and
              iOS.
            </p>
          </div>
          <div className="v1r-cta-buttons">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener"
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
              rel="noopener"
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
    </>
  );
}
