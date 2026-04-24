'use client';

import { useState, FormEvent } from 'react';

const HOW_STEPS = [
  {
    num: '01',
    label: 'Connect',
    title: 'Link Health Connect',
    desc:
      'One tap to sync your last 90 days of runs, sleep, and heart-rate data. Works with Samsung Health, Fitbit, Garmin, Google Fit.',
  },
  {
    num: '02',
    label: 'Analyse',
    title: 'Kip reads your data',
    desc:
      'Pace trends, weekly volume, recovery patterns, HR zones. Kip figures out your current fitness — no guesswork, no self-reporting.',
  },
  {
    num: '03',
    label: 'Plan',
    title: 'Get your week',
    desc:
      'A personal 7-day plan — pace targets, distance, recovery days. Built for your goal, tuned to your current body.',
  },
  {
    num: '04',
    label: 'Adapt',
    title: 'Re-plan every Sunday',
    desc:
      'Missed a long run? Tempo felt too hard? Every Sunday night Kip rewrites next week based on what actually happened.',
  },
];

const RIBBON_PHRASES = [
  'Training that adapts',
  'AI run coach · Kip',
  'Weekly re-plan every Sunday',
  'Built on Health Connect',
  'Pace · tempo · long · recovery',
  'Race-prep for 10K · half · full',
  'Beta · July 2026',
  'Made for runners in India',
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is Kip a human coach?',
    a:
      "No. Kip is an AI coach trained on established running methodologies and tuned every week against your real training data. If you want a human coach in the loop, we're adding that in our Coaches product (also coming soon).",
  },
  {
    q: 'What devices does it work with?',
    a:
      'Anything that writes to Health Connect on Android — Garmin, Samsung Health, Fitbit, Google Fit, Mi Fit, Amazfit, and more. iOS support with Apple Health lands in the second beta wave.',
  },
  {
    q: 'What if I skip a run?',
    a:
      'Kip sees it. The next Sunday re-plan absorbs it — distance gets redistributed, no guilt-trip notifications. Skipping a run is data, not a failure.',
  },
  {
    q: 'Will this replace my coach?',
    a:
      'No. Kip is built for the 95% of runners in India who have never had a coach. If you already work with one, keep doing that — a good coach will always read your training better than an AI can.',
  },
  {
    q: 'How much will it cost?',
    a:
      "Free during beta. After that, we're aiming for a price that's meaningfully less than a month of coaching but still lets us keep the lights on — waitlist members get founding pricing, locked in forever.",
  },
];

// SVG icons reused in features + step arrow
const IconArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12h14M13 6l6 6-6 6"
    />
  </svg>
);

const IconPace = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm.7-7.3l3.6-3.6a1 1 0 111.4 1.4l-3.6 3.6a2 2 0 11-1.4-1.4z"
    />
  </svg>
);

const IconSplit = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h8M4 12h12M4 18h6M16 6l4 3-4 3M14 18l4-3"
    />
  </svg>
);

const IconFlag = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 21V4M5 4h13l-2 4 2 4H5"
    />
  </svg>
);

const IconRecovery = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 12.5a8 8 0 11-3.2-6.4M20 4v5h-5"
    />
  </svg>
);

const FEATURES = [
  {
    Icon: IconPace,
    title: 'Dynamic pace targets',
    desc:
      'Targets that shift as you get fitter — not fixed numbers from a calculator you filled in six weeks ago.',
  },
  {
    Icon: IconSplit,
    title: 'Pace-group splits',
    desc:
      "Easy, tempo, long, and recovery — each with its own zone, pace, and purpose. Kip tells you which one today is.",
  },
  {
    Icon: IconFlag,
    title: 'Race-prep blocks',
    desc:
      'Name a race — 10K, half, full — and Kip reverse-engineers the build, taper, and race-week from there.',
  },
  {
    Icon: IconRecovery,
    title: 'Recovery built in',
    desc:
      "Rest days aren't an afterthought. Kip watches HRV, sleep, and load — and forces a day off when you need it.",
  },
];

export default function WorkoutPlanView() {
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [shake, setShake] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setShake(true);
      setTimeout(() => setShake(false), 1800);
      return;
    }
    setSubmittedEmail(v);
    setSubmitted(true);
  };

  const toggleFaq = (i: number) =>
    setOpenFaq((cur) => (cur === i ? -1 : i));

  const successName = submittedEmail.split('@')[0];

  return (
    <>
      {/* Hero */}
      <section className="v1w-hero">
        <div className="v1w-hero-bg" aria-hidden />
        <div className="v1w-container">
          <span className="v1w-hero-badge">Coming soon · Beta in July</span>
          <h1 className="v1w-hero-title">
            Training that
            <br />
            <span className="v1w-red">adapts</span> every week.
          </h1>
          <div className="v1w-hero-foot">
            <p className="v1w-hero-sub">
              Meet <b>Kip</b> — an AI run coach that reads your Health Connect data and rewrites
              your plan every Sunday night. Pace targets, pace-group splits, recovery — built around
              the runs you actually ran.
            </p>
            <div className="v1w-hero-meta">
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Reads Health Connect
              </div>
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Weekly re-planning
              </div>
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Free during beta
              </div>
            </div>
            <div className="v1w-hero-cta">
              <a href="#waitlist" className="v1w-btn v1w-btn-primary">
                Join waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      <div className="v1w-ribbon" aria-hidden>
        <div className="v1w-ribbon-track">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ display: 'inline-flex' }}>
              {RIBBON_PHRASES.map((p, j) => (
                <span key={`${i}-${j}`}>{p} ·</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="v1w-how">
        <div className="v1w-container">
          <div className="v1w-section-header">
            <div>
              <div className="v1w-section-kicker">How it works</div>
              <h2 className="v1w-section-title">
                A plan that <b>learns</b> from the runs you actually do.
              </h2>
            </div>
            <div className="v1w-section-count">4 steps · ~3 min to set up</div>
          </div>

          <div className="v1w-how-steps">
            {HOW_STEPS.map((s, i) => (
              <div key={s.num} className="v1w-how-step">
                <div className="v1w-how-step-num">{s.num}</div>
                <div className="v1w-how-step-label">{s.label}</div>
                <div className="v1w-how-step-title">{s.title}</div>
                <div className="v1w-how-step-desc">{s.desc}</div>
                {i < HOW_STEPS.length - 1 && (
                  <IconArrowRight className="v1w-how-step-arrow" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="v1w-preview">
        <div className="v1w-container v1w-preview-grid">
          <div className="v1w-preview-copy">
            <div className="v1w-section-kicker">A week with Kip</div>
            <h2 className="v1w-section-title v1w-on-dark">Your whole week, on one screen.</h2>
            <p>
              Easy runs, tempo targets, a long run, and recovery — laid out like the training plans
              serious runners already draw up by hand. Except this one updates itself.
            </p>
            <ul className="v1w-preview-bullets">
              <li>Pace targets keyed to your recent runs</li>
              <li>Pace-group splits: easy / tempo / long / recovery</li>
              <li>Race-prep blocks: 10K, half, full</li>
              <li>Recovery days built in — not bolted on</li>
            </ul>
          </div>

          <div className="v1w-phone-stage">
            <div className="v1w-phone-float v1w-phone-float-tl">
              <span className="v1w-phone-float-dot" />
              Adaptive <b>re-plan</b>
            </div>
            <div className="v1w-phone-float v1w-phone-float-br">
              <span className="v1w-phone-float-dot" />
              Pace <b>zones</b>
            </div>

            <div className="v1w-phone">
              <div className="v1w-phone-notch" />
              <div className="v1w-phone-screen">
                <div className="v1w-phone-status">
                  <span>6:42</span>
                  <span>●●● ▮</span>
                </div>
                <div className="v1w-phone-header">
                  <div className="v1w-phone-header-kicker">
                    Week 4 · Half marathon build
                  </div>
                  <div className="v1w-phone-header-title">This week</div>
                  <div className="v1w-phone-header-sub">
                    42 km target · 4 runs · 2 recovery
                  </div>
                </div>

                <div className="v1w-phone-week">
                  <div className="v1w-phone-day has-run">
                    <div className="v1w-phone-day-name">Mon</div>
                    <div className="v1w-phone-day-dist">6K</div>
                  </div>
                  <div className="v1w-phone-day">
                    <div className="v1w-phone-day-name">Tue</div>
                    <div className="v1w-phone-day-dist">—</div>
                  </div>
                  <div className="v1w-phone-day has-run is-today">
                    <div className="v1w-phone-day-name">Wed</div>
                    <div className="v1w-phone-day-dist">8K</div>
                  </div>
                  <div className="v1w-phone-day">
                    <div className="v1w-phone-day-name">Thu</div>
                    <div className="v1w-phone-day-dist">—</div>
                  </div>
                  <div className="v1w-phone-day has-run">
                    <div className="v1w-phone-day-name">Fri</div>
                    <div className="v1w-phone-day-dist">5K</div>
                  </div>
                  <div className="v1w-phone-day">
                    <div className="v1w-phone-day-name">Sat</div>
                    <div className="v1w-phone-day-dist">—</div>
                  </div>
                  <div className="v1w-phone-day has-run">
                    <div className="v1w-phone-day-name">Sun</div>
                    <div className="v1w-phone-day-dist">18K</div>
                  </div>
                </div>

                <div className="v1w-phone-plan">
                  <div className="v1w-phone-run easy">
                    <div className="v1w-phone-run-type">Easy</div>
                    <div className="v1w-phone-run-title">Zone 2 shakeout</div>
                    <div className="v1w-phone-run-meta">
                      <div className="v1w-phone-run-dist">6.0 km</div>
                      <div className="v1w-phone-run-pace">6:10 /km</div>
                    </div>
                  </div>
                  <div className="v1w-phone-run tempo">
                    <div className="v1w-phone-run-type">Tempo · Today</div>
                    <div className="v1w-phone-run-title">4 × 1K @ threshold</div>
                    <div className="v1w-phone-run-meta">
                      <div className="v1w-phone-run-dist">8.0 km</div>
                      <div className="v1w-phone-run-pace">4:45 /km</div>
                    </div>
                  </div>
                  <div className="v1w-phone-run long">
                    <div className="v1w-phone-run-type">Long</div>
                    <div className="v1w-phone-run-title">Progressive long run</div>
                    <div className="v1w-phone-run-meta">
                      <div className="v1w-phone-run-dist">18.0 km</div>
                      <div className="v1w-phone-run-pace">5:40 /km</div>
                    </div>
                  </div>

                  <div className="v1w-phone-adaptive">
                    <div className="v1w-phone-adaptive-icon">K</div>
                    <div className="v1w-phone-adaptive-text">
                      <b>Kip · Based on last week</b>
                      Volume up 5% — your easy pace is coming down. Tempo target sharpened by 0:15
                      /km.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kip highlight */}
      <section className="v1w-kip">
        <div className="v1w-container v1w-kip-grid">
          <div className="v1w-kip-portrait">
            <div className="v1w-kip-avatar">
              <div className="v1w-kip-avatar-ring">
                <div className="v1w-kip-avatar-letter">K</div>
              </div>
            </div>
            <div className="v1w-kip-portrait-label">Live · model v0.4</div>
            <div className="v1w-kip-portrait-corner">
              HR · 148 bpm<br />
              Pace · 5:12 /km<br />
              Stride · 178 spm
            </div>
          </div>
          <div>
            <div className="v1w-kip-intro-kicker">Meet your AI run coach</div>
            <h2 className="v1w-kip-name">Kip.</h2>
            <p className="v1w-kip-bio">
              <b>Kip reads data, not vibes.</b> Every Sunday night, Kip looks at your actual week —
              the runs you hit, the ones you skipped, how you slept — and rewrites the next seven
              days. Honest, patient, a little obsessed with zone 2.
            </p>
            <p className="v1w-kip-bio">
              Built on the same training principles serious coaches use — Daniels, Jack &amp; Jill,
              polarized blocks — but tuned weekly to you, not a generic plan template.
            </p>

            <div className="v1w-kip-chat">
              <div className="v1w-kip-bubble v1w-kip-bubble-you">
                <div className="v1w-kip-bubble-meta">You · Sunday 9:14 pm</div>
                Skipped Saturday&apos;s long run. Legs were toast.
              </div>
              <div className="v1w-kip-bubble v1w-kip-bubble-kip">
                <div className="v1w-kip-bubble-meta">Kip · Sunday 9:14 pm</div>
                Saw that in your HRV. I&apos;ve moved Sunday&apos;s long to Monday and cut tempo to
                a strides session. You&apos;re still on track for 1:48.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="v1w-features">
        <div className="v1w-container">
          <div className="v1w-section-header">
            <div>
              <div className="v1w-section-kicker">What you get</div>
              <h2 className="v1w-section-title">
                Everything a coach would give you. <b>Weekly.</b>
              </h2>
            </div>
            <div className="v1w-section-count">Included in every plan</div>
          </div>

          <div className="v1w-feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="v1w-feature-cell">
                <div className="v1w-feature-icon">
                  <f.Icon />
                </div>
                <div className="v1w-feature-title">{f.title}</div>
                <div className="v1w-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section
        className={`v1w-waitlist ${submitted ? 'is-submitted' : ''}`}
        id="waitlist"
      >
        <div className="v1w-container">
          <div className="v1w-waitlist-kicker">Beta · July 2026</div>
          <h2 className="v1w-waitlist-title">
            Get early
            <br />
            <span className="v1w-red">access.</span>
          </h2>
          <p className="v1w-waitlist-sub">
            Kip is training in closed beta. Drop your email — we&apos;ll send you an invite the
            moment your city is live.
          </p>

          <form
            className={`v1w-waitlist-form ${shake ? 'is-shake' : ''}`}
            onSubmit={onSubmit}
            noValidate
          >
            <input
              className="v1w-waitlist-input"
              type="email"
              placeholder="you@running.in"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="v1w-waitlist-submit" type="submit">
              Join waitlist
            </button>
          </form>
          <div className="v1w-waitlist-success" role="status" aria-live="polite">
            {submitted
              ? `● You're in, ${successName}. We'll email ${submittedEmail} when Kip is ready.`
              : null}
          </div>
          <div className="v1w-waitlist-note">
            We&apos;ll only email you when Kip is ready. No spam.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="v1w-faq">
        <div className="v1w-container">
          <div className="v1w-faq-grid">
            <div>
              <div className="v1w-section-kicker">FAQ</div>
              <h2 className="v1w-section-title">
                Questions, <b>answered</b>.
              </h2>
            </div>
            <div className="v1w-faq-list">
              {FAQS.map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={f.q}
                    className={`v1w-faq-item ${isOpen ? 'is-open' : ''}`}
                  >
                    <button
                      className="v1w-faq-q"
                      type="button"
                      onClick={() => toggleFaq(i)}
                      aria-expanded={isOpen}
                    >
                      {f.q}
                      <span className="v1w-faq-q-toggle" aria-hidden />
                    </button>
                    <div className="v1w-faq-a">
                      <div className="v1w-faq-a-inner">{f.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
