// Shared instant skeleton for the national /clubs and /experiences routes.
// Next renders this (via each route's loading.tsx) as the Suspense fallback
// while the page does its dynamic server work — reads the session cookie,
// resolves edge geo, and fans out the club + events fetches — so the visitor
// sees the page shell immediately instead of a blank tab.
//
// Deliberately a pure, static server component: it reuses the real layout
// classes (.v1-nav, .v1-hero, .v1c-natl, .v1c-exp …) so it's pixel-aligned
// with the real page, and renders the genuinely-static chrome verbatim (nav,
// hero kicker/H1) so those don't flash when the real tree commits. Only the
// data-driven bits — the "N clubs listed" count, the search bar, and the rail
// cards — are shimmer placeholders. Nothing here touches cookies/headers or
// useSearchParams, so the fallback stays statically prerenderable.
//
// `active` controls which nav item is marked current and the rail order, so
// the skeleton matches whichever route mounted it (/clubs leads with the
// by-city clubs rail; /experiences leads with the club-events rails).

// Endorfin logo mark — copied from HeaderClient so the nav shell matches.
const LogoMark = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-7 h-7">
    <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.48 6.48 0 00-4.707 2.017.75.75 0 11-1.086-1.034A7.98 7.98 0 018 0a7.98 7.98 0 015.793 2.483.75.75 0 11-1.086 1.034A6.48 6.48 0 008 1.5zM1.236 5.279a.75.75 0 01.514.927 6.503 6.503 0 004.727 8.115.75.75 0 11-.349 1.459 8.003 8.003 0 01-5.82-9.986.75.75 0 01.928-.515zm13.528 0a.75.75 0 01.928.515 8.003 8.003 0 01-5.82 9.986.75.75 0 01-.35-1.459 6.503 6.503 0 004.728-8.115.75.75 0 01.514-.927z" />
      <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 8a5 5 0 1110 0A5 5 0 013 8z" opacity=".25" />
    </g>
  </svg>
);

// One rail of shimmering card placeholders. `cards` controls how many show.
function SkeletonRail({ cards = 5 }: { cards?: number }) {
  return (
    <section className="v1c-exp-rail">
      <div className="v1c-exp-rail-head">
        <span className="v1c-sk v1c-sk-railtitle" />
      </div>
      <div className="v1c-exp-scroller" aria-hidden="true">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="v1c-exp-card">
            <div className="v1c-sk v1c-sk-media" />
            <div className="v1c-sk v1c-sk-line" style={{ width: '85%', marginTop: 14 }} />
            <div className="v1c-sk v1c-sk-line" style={{ width: '55%', marginTop: 8 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

// The by-city clubs rail placeholder — adds the city chip row above the cards.
function SkeletonClubsRail() {
  return (
    <div className="v1c-exp-rail">
      <div className="v1c-exp-rail-head">
        <span className="v1c-sk v1c-sk-railtitle" />
      </div>
      <div className="v1c-exp-citychips" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="v1c-sk v1c-sk-chip" />
        ))}
      </div>
      <div className="v1c-exp-scroller" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="v1c-exp-card">
            <div className="v1c-sk v1c-sk-media" />
            <div className="v1c-sk v1c-sk-line" style={{ width: '80%', marginTop: 14 }} />
            <div className="v1c-sk v1c-sk-line" style={{ width: '50%', marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV = [
  { label: 'Running Events', key: 'running-events' },
  { label: 'Experiences', key: 'experiences' },
] as const;

export default function ClubsExperiencesSkeleton({
  active,
}: {
  active: 'clubs' | 'experiences';
}) {
  // /clubs leads with the by-city directory; /experiences leads with events.
  const clubsRail = <SkeletonClubsRail key="clubs" />;
  const eventRails = (
    <>
      <SkeletonRail key="around" cards={5} />
      <SkeletonRail key="weekend" cards={5} />
    </>
  );

  return (
    <>
      {/* Static nav shell — same classes as the real header so it's
          pixel-aligned and the fixed bar doesn't vanish during the load. */}
      <nav className="v1-nav" id="site-nav" aria-hidden="true">
        <div className="container v1-nav-inner">
          <span className="flex items-center gap-2.5 font-logo font-semibold text-[22px] tracking-tight text-bone">
            <span className="text-signal inline-flex">
              <LogoMark />
            </span>
            endorfin
          </span>
          <ul className="v1-nav-links">
            {NAV.map((l) => (
              <li key={l.key}>
                <span className={`is-primary${l.key === active ? ' is-current' : ''}`}>
                  {l.label}
                </span>
              </li>
            ))}
            <li className="v1-nav-sub-wrap">
              <span className={`v1-nav-sub-trigger is-primary${active === 'clubs' ? ' is-current' : ''}`}>
                Clubs
                <svg className="v1-nav-sub-chevron" viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
                  <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </li>
          </ul>
          <div className="v1-nav-actions-desktop">
            <span className="v1-nav-auth">Sign in</span>
            <span className="v1-nav-cta">Download</span>
          </div>
          <button type="button" className="v1-nav-toggle" tabIndex={-1} aria-hidden="true">
            <span className="v1-nav-toggle-bars" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div className="v1-clubs-page" aria-busy="true">
        {/* Hero — static text rendered verbatim (no flash on commit); only
            the live "clubs listed" count is a placeholder. */}
        <section className="v1-hero v1c-hero-natl">
          <div className="v1-hero-bg" aria-hidden="true" />
          <div className="container">
            <div className="v1-hero-topline is-compact">
              <span className="v1-hero-kicker">Run clubs &amp; events · India</span>
              <span className="v1c-sk v1c-sk-meta" />
            </div>
            <h1 className="v1c-search-h1">
              Run <span className="accent">Clubs &amp; Experiences</span> in India
            </h1>
          </div>
        </section>

        <div className="v1c-natl">
          {/* Search dock — placeholder for the search bar. */}
          <div className="v1c-searchdock">
            <div className="container">
              <div className="v1c-sk v1c-sk-searchbar" aria-hidden="true" />
            </div>
          </div>

          {/* Discovery rails — order matches the active route. */}
          <section className="v1c-exp">
            <div className="v1c-container">
              {active === 'clubs' ? (
                <>{clubsRail}{eventRails}</>
              ) : (
                <>{eventRails}{clubsRail}</>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
