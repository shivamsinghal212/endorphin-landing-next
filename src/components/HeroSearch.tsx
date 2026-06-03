'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';
import HeroSearchPanel from './HeroSearchPanel';

const RIBBON_ITEMS = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail', 'Run', 'Connect', 'Train', 'Repeat'];

interface HeroStats {
  clubs: number;
  races: number;
  clubEvents: number;
  cities: number;
}

interface HeroSearchProps {
  stats?: HeroStats;
}

// Round down to a clean "X+" floor so 47 reads as "40+" — feels honest
// without putting an exact moving number in the marquee.
function formatStat(n: number): string {
  if (n >= 1000) {
    const k = Math.floor(n / 100) / 10; // e.g. 12345 → 12.3
    return `${k}K+`;
  }
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 10) * 10}+`;
  return `${n}`;
}

/**
 * Homepage hero. Wraps the reusable <HeroSearchPanel/> with a trigger pill
 * (collapsed-by-default state), stats bar, app-store CTA row, and ribbon.
 *
 * The trigger pill collapses to a compact "Search 870+ …" affordance to
 * keep the above-fold real estate light. Click or press `/` to expand
 * into the full panel.
 */
const HeroSearch = ({ stats }: HeroSearchProps) => {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Focus the input inside the panel once expanded. The panel handles its
  // own focus via the `autoFocus` prop on the input.
  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  // `/` keyboard shortcut expands the panel from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === '/' && !expanded) {
        e.preventDefault();
        expand();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, expand]);

  return (
    <>
      <section className="v1-hero">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline">
            <span className="v1-hero-kicker">Powering India&apos;s running landscape</span>
            <span className="v1-hero-meta">Est. 2026 · Made in India</span>
          </div>

          <h1 className="v1-hero-title">
            Find Running events, clubs and more<span className="accent">..</span>
          </h1>

          {/* Search: collapsed pill OR expanded panel.
              Renders the trigger pill until clicked; then mounts the
              full <HeroSearchPanel/>. The pill itself isn't animated
              into the panel — it cross-fades via the .is-expanded class
              on the wrapper (panel max-height + opacity transitions). */}
          <div className={`v1-hero-search ${expanded ? 'is-expanded' : ''}`} ref={panelRef}>
            <button
              type="button"
              className="v1-hero-search-trigger"
              onClick={expand}
              aria-label="Search clubs, races and events"
              aria-hidden={expanded}
              tabIndex={expanded ? -1 : 0}
            >
              <SearchIcon />
              <span className="v1-hero-search-trigger-text">
                Search 870+ clubs, races and community runs
              </span>
              <span className="v1-hero-search-kbd" aria-hidden="true">/</span>
            </button>
            {expanded && (
              <HeroSearchPanel
                autoFocus
                onClose={collapse}
              />
            )}
          </div>

          <div className="v1-hero-stats-bar">
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.clubs) : '110+'}</span>
              <span className="v1-hero-stat-l">Run Clubs</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.races) : '500+'}</span>
              <span className="v1-hero-stat-l">Races</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.clubEvents) : '200+'}</span>
              <span className="v1-hero-stat-l">Club Events</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.cities) : '30+'}</span>
              <span className="v1-hero-stat-l">Cities Covered</span>
            </span>
          </div>

          <div className="v1-hero-cta-row" id="download">
            <Link href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-primary">
              <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"/></svg>
              Google Play
            </Link>
            <Link href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-ghost">
              <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"/></svg>
              App Store
            </Link>
          </div>
        </div>
      </section>

      <div className="v1-ribbon" aria-hidden="true">
        <div className="v1-ribbon-track">
          {[...Array(4)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex' }}>
              {RIBBON_ITEMS.map((item, j) => (
                <span key={`${i}-${j}`}>{item} ·</span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

function SearchIcon() {
  return (
    <svg className="v1-hero-search-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default HeroSearch;
