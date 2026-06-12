import Link from 'next/link';
import KipOnboardForm from './KipOnboardForm';
import './home-refresh.css';

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

/**
 * Compact "Run a club?" band on the homepage. The full pitch lives on
 * /for-clubs now, so this is just a teaser + the Instagram-handle onboard
 * form (lead capture preserved from the old ManageClubSection).
 */
const ForClubsBand = () => (
  <section className="fcb" aria-labelledby="fcb-title">
    <div className="container">
      <div className="fcb-panel">
        <div className="fcb-grid">
          <div>
            <span className="fcb-eyebrow">Run a club?</span>
            <h2 className="fcb-title" id="fcb-title">
              List your club. <em>It&apos;s free.</em>
            </h2>
            <p className="fcb-sub">
              Get found by runners in your city, host your runs and events at no cost, and
              manage members in one place — no spreadsheets, no 400-person WhatsApp group.
            </p>
            <div className="fcb-form-wrap">
              <KipOnboardForm />
            </div>
          </div>

          <div className="fcb-perks">
            <div className="fcb-perk"><span className="ic"><Check /></span>Get discovered on Google &amp; in-app</div>
            <div className="fcb-perk"><span className="ic"><Check /></span>Host events &amp; runs, free</div>
            <div className="fcb-perk"><span className="ic"><Check /></span>Approvals, RSVPs &amp; chat in one place</div>
            <div className="fcb-perk"><span className="ic"><Check /></span>Auto-import events from Instagram</div>
          </div>
        </div>

        <div className="fcb-foot">
          <Link href="/for-clubs" className="fcb-btn">
            Know more <Arrow />
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default ForClubsBand;
