import Link from 'next/link';

const CHIPS = ['Pace analysis', 'Fitness scores', 'ACWR injury risk', 'Weekly plan adjusts', 'Free'];

const ChevronLeft = () => (
  <svg className="v1-kip-phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const Kebab = () => (
  <svg className="v1-kip-phone-icon" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MeetKip = () => (
  <section className="v1-kip">
    <div className="v1-kip-grid">
      <div>
        <div className="v1-kip-kicker">Meet Kip · Your AI run coach</div>
        <h2 className="v1-kip-title">
          The coach who<br />remembers every<br />
          <span className="accent">split you ever ran.</span>
        </h2>
        <p className="v1-kip-body">
          Kip reads your Health Connect data — every pace, every heart rate zone, every drift in a long run — and turns it into a plan that actually fits your body and your target race. Ask anything, anytime. Kip doesn&apos;t forget and doesn&apos;t sleep.
        </p>
        <div className="v1-kip-features">
          {CHIPS.map((c) => (
            <span key={c} className="v1-kip-chip">{c}</span>
          ))}
        </div>
        <Link href="/workout-plan" className="v1-btn v1-btn-primary">
          Get early access
        </Link>
      </div>

      <div className="v1-kip-phone-stage">
        <div className="v1-kip-phone">
          <div className="v1-kip-phone-screen">
            <div className="v1-kip-phone-notch" />
            <div className="v1-kip-phone-status">
              <span>9:41</span>
              <span className="v1-kip-phone-status-right">5G · 100%</span>
            </div>
            <div className="v1-kip-phone-appbar">
              <ChevronLeft />
              <div className="v1-kip-avatar has-dot" style={{ width: 32, height: 32, fontSize: 16 }}>K</div>
              <div className="v1-kip-phone-appbar-info">
                <div className="v1-kip-chat-name">Kip</div>
                <div className="v1-kip-chat-sub">Active now</div>
              </div>
              <Kebab />
            </div>
            <div className="v1-kip-phone-messages">
              <div className="v1-kip-chat-body">
                <div className="v1-msg user">Feeling gassed at KM 14 of my long runs. What&apos;s up?</div>
                <div className="v1-msg-meta right">12:34 · Seen</div>
                <div className="v1-msg kip typing"><span /><span /><span /></div>
                <div className="v1-msg kip">Pulling your last 4 long runs…</div>
                <div className="v1-msg kip">HR drifts <em>~12 bpm</em> past KM 10 while pace holds — classic cardiac drift.</div>
                <div className="v1-msg kip">Try <em>30g carbs</em> at KM 6 and KM 12 Sunday.</div>
                <div className="v1-msg kip typing"><span /><span /><span /></div>
                <div className="v1-msg kip">Adjust this week&apos;s LR intensity too?</div>
              </div>
            </div>
            <div className="v1-kip-phone-composer">
              <div className="v1-kip-phone-input">Message Kip…</div>
              <div className="v1-kip-phone-send"><SendIcon /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default MeetKip;
