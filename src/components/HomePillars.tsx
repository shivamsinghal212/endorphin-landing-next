import Link from 'next/link';
import './home-pillars.css';

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export interface FeaturedEvent {
  title: string;
  day: string;
  month: string;
  meta: string;
}
export interface FeaturedClub {
  name: string;
  initials: string;
  meta: string;
}

// Fallbacks shown when the API is unavailable (e.g. SSR can't reach the
// backend) so the preview cards never render empty.
const FALLBACK_EVENT: FeaturedEvent = { title: 'Sunrise City 10K', day: '14', month: 'Jun', meta: 'Sector 56 · 6:00 AM · from ₹299' };
const FALLBACK_CLUB: FeaturedClub = { name: 'UpRun Club', initials: 'UR', meta: 'Noida · 42 members · Sunday crew' };

/**
 * Homepage "two ways in" section — Running Events + Clubs. Color-blocked
 * tiles in the /for-clubs design language; each whole tile links out. The
 * two preview cards show a real upcoming event and a real club pulled from
 * the API (passed in from the server page), with static fallbacks.
 */
const HomePillars = ({ event, club }: { event?: FeaturedEvent | null; club?: FeaturedClub | null }) => {
  const ev = event ?? FALLBACK_EVENT;
  const cl = club ?? FALLBACK_CLUB;
  return (
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
                <span className="hp-date"><b>{ev.day}</b><small>{ev.month}</small></span>
                <div style={{ flex: 1 }}><span className="hp-t">{ev.title}</span><span className="hp-s">{ev.meta}</span></div>
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
                <span className="hp-av" style={{ background: 'linear-gradient(140deg,#e6232a,#7a1216)' }}>{cl.initials}</span>
                <div style={{ flex: 1 }}><span className="hp-t">{cl.name}</span><span className="hp-s">{cl.meta}</span></div>
                <span className="hp-pill hp-pill-on">Join</span>
              </div>
            </div></div>
            <span className="hp-cta">Find a club <Arrow /></span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomePillars;
