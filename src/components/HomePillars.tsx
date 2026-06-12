import Link from 'next/link';
import './home-pillars.css';

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

/**
 * Homepage "two ways in" section — Running Events + Clubs.
 * Replaces the old PillarsAccordion, which was built for five panels and
 * collapsed lopsided once trimmed to two. Color-blocked tiles in the
 * /for-clubs design language; each whole tile is a link.
 */
const HomePillars = () => (
  <section className="hp" aria-labelledby="hp-title">
    <span className="hp-ghost" aria-hidden="true">RUN</span>
    <div className="container">
      <div className="hp-head">
        <span className="hp-eyebrow">Two ways in</span>
        <h2 className="hp-title" id="hp-title">
          Running events and clubs. <em>One app.</em>
        </h2>
      </div>

      <div className="hp-grid">
        {/* Running Events */}
        <Link href="/running-events" className="hp-tile hp-events">
          <span className="idx" aria-hidden="true">01</span>
          <h3>Find your<br />next start line.</h3>
          <p>Discover 500+ running events across 30+ Indian cities — marathons, half marathons, 10Ks, 5Ks and trail runs. Dates, fees, one-tap RSVP.</p>
          <div className="hp-chips"><span>Marathons</span><span>10K &amp; 5K</span><span>Trail</span></div>
          <div className="hp-prev"><div className="hp-card">
            <div className="hp-row">
              <span className="hp-date"><b>14</b><small>Jun</small></span>
              <div style={{ flex: 1 }}><span className="hp-t">Sunrise City 10K</span><span className="hp-s">Sector 56 · 6:00 AM · from ₹299</span></div>
              <span className="hp-pill hp-pill-out">RSVP</span>
            </div>
          </div></div>
          <span className="hp-cta">Browse events <Arrow /></span>
        </Link>

        {/* Clubs */}
        <Link href="/clubs" className="hp-tile hp-clubs">
          <span className="idx" aria-hidden="true">02</span>
          <h3>Join a run club<br />built for your pace.</h3>
          <p>Find verified clubs near you — training groups, weekend long-run crews, beginner-friendly pods and women-only clubs. Your crew is out there.</p>
          <div className="hp-chips"><span>Verified</span><span>All paces</span><span>110+ clubs</span></div>
          <div className="hp-prev"><div className="hp-card">
            <div className="hp-row">
              <span className="hp-av" style={{ background: 'linear-gradient(140deg,#e6232a,#7a1216)' }}>UR</span>
              <div style={{ flex: 1 }}><span className="hp-t">UpRun Club</span><span className="hp-s">Noida · 42 members · Sunday crew</span></div>
              <span className="hp-pill hp-pill-on">Join</span>
            </div>
          </div></div>
          <span className="hp-cta">Find a club <Arrow /></span>
        </Link>
      </div>
    </div>
  </section>
);

export default HomePillars;
