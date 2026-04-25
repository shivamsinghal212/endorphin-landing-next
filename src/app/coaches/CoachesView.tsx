'use client';

import { useState } from 'react';

// ─── Mock elite profiles (preview cards) ────────────────────────
interface Elite {
  slug: string;
  name: string;
  city: string;
  competingSince: string;
  ratePill: string;
  specs: string[];
  creds: string;
  rateLine: string;
  portraitUrl: string;
  imgAlt: string;
}

const MOCK_ELITES: Elite[] = [
  {
    slug: 'arjun-bhatia',
    name: 'Arjun Bhatia',
    city: 'Delhi',
    competingSince: '2011',
    ratePill: 'From ₹2,500/session',
    specs: ['Sub-2:45', 'Marathon', 'National podium'],
    creds:
      '2:43 marathon PB. Former national 10K representative (2014). Podium at TCS Mumbai 2022 & 2023. 3× Delhi Half podium finisher.',
    rateLine: '1-on-1 · in-person',
    portraitUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80',
    imgAlt: 'Portrait of Arjun Bhatia',
  },
  {
    slug: 'meera-krishnan',
    name: 'Meera Krishnan',
    city: 'Bengaluru',
    competingSince: '2015',
    ratePill: 'From ₹8,000/mo',
    specs: ['Sub-3:20', 'Half marathon', 'Return-to-run'],
    creds:
      '3:17 marathon PB. Two-time Bengaluru Marathon podium. Satara Hill Half finisher 2023. Specialises in post-injury comeback and threshold work.',
    rateLine: 'Hybrid · monthly plans',
    portraitUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=900&q=80',
    imgAlt: 'Portrait of Meera Krishnan',
  },
  {
    slug: 'karan-shetty',
    name: 'Karan Shetty',
    city: 'Mumbai',
    competingSince: '2012',
    ratePill: 'From ₹12,000/mo',
    specs: ['Ultra', 'Trail', 'UTMB'],
    creds:
      'UTMB CCC finisher. Himalayan Crossing 100K (3rd OA 2023). La Ultra 222K finisher. Active Sahyadri trail competitor. Still racing.',
    rateLine: 'Video · full-programme',
    portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80',
    imgAlt: 'Portrait of Karan Shetty',
  },
];

// ─── Ribbon copy (doubled for seamless loop) ────────────────────
const RIBBON_ITEMS = [
  '· Sub-3 training',
  '· Podium mentors',
  '· Race-tested plans',
  '· Interval sessions',
  '· Ultra mentorship',
  '· Altitude camp prep',
  '· Track sessions',
  '· Race day tactics',
  '· Post-injury comeback',
  '· Serious runners only',
];

// ─── Verified tick (small inline) ───────────────────────────────
function VerifiedTick() {
  return (
    <span className="v1co-verified-tick" aria-label="Verified elite">
      <svg viewBox="0 0 10 10" fill="none" aria-hidden>
        <path
          d="M2 5l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// ─── Elite card ─────────────────────────────────────────────────
function EliteCard({ e }: { e: Elite }) {
  return (
    <article className="v1co-coach-card">
      <div className="v1co-coach-photo">
        <span className="v1co-coach-rate-pill">
          From <b>{e.ratePill.replace('From ', '')}</b>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.portraitUrl} alt={e.imgAlt} loading="lazy" />
      </div>
      <div className="v1co-coach-body">
        <div className="v1co-coach-name-row">
          <h3 className="v1co-coach-name">{e.name}</h3>
          <VerifiedTick />
        </div>
        <div className="v1co-coach-meta">
          {e.city} <span className="v1co-dot">·</span> Competing since {e.competingSince}
        </div>
        <div className="v1co-coach-specs">
          {e.specs.map((s) => (
            <span key={s} className="v1co-coach-spec">
              {s}
            </span>
          ))}
        </div>
        <p className="v1co-coach-creds">{e.creds}</p>
        <div className="v1co-coach-foot">
          <span className="v1co-coach-rate-line">{e.rateLine}</span>
          <a href="#" className="v1co-coach-view">
            View profile
          </a>
        </div>
      </div>
    </article>
  );
}

// ─── Main view ──────────────────────────────────────────────────
export default function CoachesView() {
  const [submitted, setSubmitted] = useState<{ runner: boolean; elite: boolean }>({
    runner: false,
    elite: false,
  });

  const handleSubmit = (kind: 'runner' | 'elite') => (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const input = form.querySelector('.v1co-waitlist-input') as HTMLInputElement | null;
    if (!input || !input.value || !input.checkValidity()) {
      input?.focus();
      return;
    }
    setSubmitted((prev) => ({ ...prev, [kind]: true }));
  };

  return (
    <>
      {/* Hero */}
      <section className="v1co-hero">
        <div className="v1co-hero-bg" aria-hidden />
        <div className="v1co-container">
          <div className="v1co-hero-badge">
            <span aria-hidden />
            Coming soon · Summer 2026
          </div>
          <h1 className="v1co-hero-title">
            Train with
            <br />
            <span className="v1co-red">elites.</span>
          </h1>

          <div className="v1co-hero-foot">
            <p className="v1co-hero-sub">
              India&rsquo;s fastest runners. <strong>Real race-tested training</strong> from
              athletes who&rsquo;ve podium&rsquo;d at TCS Mumbai, Satara, and beyond — not textbook
              coaches. For serious runners only.
            </p>
            <div className="v1co-hero-ctas">
              <a href="#waitlist" className="v1co-btn v1co-btn-primary">
                Join the waitlist
              </a>
              <a href="#apply" className="v1co-hero-secondary">
                Apply as an elite →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      <div className="v1co-ribbon" aria-hidden>
        <div className="v1co-ribbon-track">
          {[0, 1].map((g) => (
            <span key={g} style={{ display: 'inline-flex' }}>
              {RIBBON_ITEMS.map((item, i) => (
                <span key={`${g}-${i}`}>{item}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Why train with an elite */}
      <section className="v1co-why-section">
        <div className="v1co-container">
          <div className="v1co-section-header">
            <div>
              <div className="v1co-section-kicker">Why train with an elite</div>
              <h2 className="v1co-section-title">
                Apps plan.
                <br />
                <b>Elites transform.</b>
              </h2>
            </div>
            <p className="v1co-section-intro">
              A training plan from an app is built on averages. An elite who has broken 2:45,
              podium&rsquo;d at Mumbai and Satara, and survived monsoon long runs — they know what
              your body needs next. You can&rsquo;t download that.
            </p>
          </div>

          <div className="v1co-why-grid">
            <div className="v1co-why-card">
              <div className="v1co-why-num">
                <b>01</b>Race-tested
              </div>
              <h3 className="v1co-why-title">
                The plan comes from <i>lived</i> racing.
              </h3>
              <p className="v1co-why-body">
                Your elite has run the race you&rsquo;re targeting — same heat, same hills, same
                field. Their training isn&rsquo;t theory. It&rsquo;s what actually worked on race
                day.
              </p>
            </div>
            <div className="v1co-why-card">
              <div className="v1co-why-num">
                <b>02</b>Indian conditions
              </div>
              <h3 className="v1co-why-title">Race prep that actually works in Indian heat.</h3>
              <p className="v1co-why-body">
                Hydration, AQI, monsoon long runs, March-to-May heat adaptation. Elites who&rsquo;ve
                podium&rsquo;d at TCS Mumbai, Satara, Bengaluru — not Boston.
              </p>
            </div>
            <div className="v1co-why-card">
              <div className="v1co-why-num">
                <b>03</b>Exclusive access
              </div>
              <h3 className="v1co-why-title">Training usually reserved for top athletes.</h3>
              <p className="v1co-why-body">
                Elite runners rarely take on athletes. When they do, you train the way they train —
                intervals, form sessions, race-pace runs. Not how they think you should train. The
                real thing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="v1co-how-section">
        <div className="v1co-container">
          <div className="v1co-section-header">
            <div>
              <div className="v1co-section-kicker">How it works</div>
              <h2 className="v1co-section-title">
                From <b>goal</b> to <b>elite training</b>
                <br />
                in four steps.
              </h2>
            </div>
            <p className="v1co-section-intro">
              This should be simple. Tell us where you&rsquo;re trying to get, match with an elite
              who has been there, and get to work.
            </p>
          </div>

          <div className="v1co-how-steps">
            <div className="v1co-how-step">
              <div className="v1co-how-step-num">01</div>
              <h3 className="v1co-how-step-title">Tell us your goal.</h3>
              <p className="v1co-how-step-body">
                Sub-4 marathon, sub-3 attempt, first ultra, UTMB qualifier — we hear you out. This
                is for runners with a real target, not a vague wish.
              </p>
            </div>
            <div className="v1co-how-step">
              <div className="v1co-how-step-num">02</div>
              <h3 className="v1co-how-step-title">Match with elite runners.</h3>
              <p className="v1co-how-step-body">
                We show you 2-3 elites in your city whose race pedigree fits your goal — with full
                profiles, results, and availability.
              </p>
            </div>
            <div className="v1co-how-step">
              <div className="v1co-how-step-num">03</div>
              <h3 className="v1co-how-step-title">Book a free intro session.</h3>
              <p className="v1co-how-step-body">
                A 30-minute session to align on goals, training load, and schedule. If it&rsquo;s
                not a fit, we&rsquo;ll match you with another — no charge.
              </p>
            </div>
            <div className="v1co-how-step">
              <div className="v1co-how-step-num">04</div>
              <h3 className="v1co-how-step-title">Train hard.</h3>
              <p className="v1co-how-step-body">
                Weekly plans, 1-on-1 sessions, race-day strategy — all inside Endorfin. Train the
                way India&rsquo;s fastest train.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample elites */}
      <section className="v1co-coaches-section">
        <div className="v1co-container">
          <div className="v1co-section-header">
            <div>
              <div className="v1co-section-kicker">Meet the elites</div>
              <h2 className="v1co-section-title">
                A preview of <b>who you&rsquo;ll train with.</b>
              </h2>
            </div>
            <div className="v1co-preview-tag">
              <b>Preview</b> · Sample profiles
            </div>
          </div>

          <div className="v1co-coaches-grid">
            {MOCK_ELITES.map((e) => (
              <EliteCard key={e.slug} e={e} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust / verification */}
      <section className="v1co-trust-section">
        <div className="v1co-container">
          <div className="v1co-trust-intro">
            <div className="v1co-section-kicker">Verification</div>
            <h2 className="v1co-trust-headline">
              Every elite
              <br />
              is <b>verified.</b>
            </h2>
            <p className="v1co-trust-sub">
              Training with an elite is a high-trust commitment. Before an elite appears on
              Endorfin, they pass three checks — manually, by our team. Real results. Real people.
            </p>
          </div>

          <div className="v1co-trust-grid">
            <div className="v1co-trust-item">
              <div className="v1co-trust-step">01 · Identity</div>
              <svg className="v1co-trust-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
                <rect x="4" y="7" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M18 13h6M18 17h6M9 21h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <h3 className="v1co-trust-title">Government ID verified.</h3>
              <p className="v1co-trust-body">
                Aadhaar + PAN matched against name and face. The person on the profile is the
                person who will train you.
              </p>
            </div>
            <div className="v1co-trust-item">
              <div className="v1co-trust-step">02 · Race history</div>
              <svg className="v1co-trust-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
                <path
                  d="M16 3l3 7h7l-5.5 4.5L22 22l-6-4-6 4 1.5-7.5L6 10h7l3-7z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 26l2 3M21 26l-2 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <h3 className="v1co-trust-title">Race results verified.</h3>
              <p className="v1co-trust-body">
                Finish times, positions, and race history cross-checked against official results
                from race organisers. No inflated PRs, no fabricated podiums.
              </p>
            </div>
            <div className="v1co-trust-item">
              <div className="v1co-trust-step">03 · References</div>
              <svg className="v1co-trust-icon" viewBox="0 0 32 32" fill="none" aria-hidden>
                <path
                  d="M6 20c0-3 3-5 5-5 3 0 4 2 5 2s2-2 5-2c2 0 5 2 5 5 0 5-5 8-10 8S6 25 6 20z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 11a3 3 0 116 0 3 3 0 01-6 0zM16 11a3 3 0 116 0 3 3 0 01-6 0z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <h3 className="v1co-trust-title">Reference calls with runners they&rsquo;ve trained.</h3>
              <p className="v1co-trust-body">
                We speak to three past runners for every elite — unscripted. If the feedback is
                shaky, they don&rsquo;t list. Simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dual waitlist CTA */}
      <section className="v1co-dual-cta" id="waitlist">
        <div className="v1co-container">
          <div className="v1co-dual-cta-header">
            <div className="v1co-dual-cta-kicker">Waitlist · Launching Summer 2026</div>
            <h2 className="v1co-dual-cta-title">
              Be first
              <br />
              in <span className="v1co-red">line.</span>
            </h2>
          </div>

          <div className="v1co-dual-grid">
            {/* Runner side */}
            <div className="v1co-dual-col">
              <div className="v1co-dual-col-tag">
                <b>For serious runners</b>Train with an elite
              </div>
              <h3 className="v1co-dual-col-title">Ready to push your limits?</h3>
              <p className="v1co-dual-col-sub">
                Join the waitlist — we&rsquo;ll match you with elite runners in your city when
                training opens, with early-access pricing for the first 200 serious runners.
              </p>
              {submitted.runner ? (
                <div className="v1co-dual-success is-shown">
                  You&rsquo;re on the list. We&rsquo;ll be in touch.
                </div>
              ) : (
                <form className="v1co-waitlist-form" onSubmit={handleSubmit('runner')}>
                  <input
                    type="email"
                    className="v1co-waitlist-input"
                    placeholder="your@email.com"
                    required
                    aria-label="Email address"
                  />
                  <button type="submit" className="v1co-waitlist-btn v1co-waitlist-btn-primary">
                    Join waitlist
                  </button>
                </form>
              )}
              <div className="v1co-dual-micro">
                Waitlist isn&rsquo;t live yet —{' '}
                <a href="https://www.instagram.com/hacknflex/" target="_blank" rel="noopener noreferrer">
                  follow @hacknflex on Instagram
                </a>{' '}
                for launch updates.
              </div>
            </div>

            {/* Elite side */}
            <div className="v1co-dual-col" id="apply">
              <div className="v1co-dual-col-tag">
                <b>For elite runners</b>Apply to train others
              </div>
              <h3 className="v1co-dual-col-title">Ready to give back?</h3>
              <p className="v1co-dual-col-sub">
                We&rsquo;re onboarding founding elites in 6 cities — Delhi, Mumbai, Bengaluru,
                Hyderabad, Chennai, Pune. Drop your email and we&rsquo;ll review your race profile.
              </p>
              {submitted.elite ? (
                <div className="v1co-dual-success is-shown">
                  Application received. We&rsquo;ll review your profile and reach out.
                </div>
              ) : (
                <form className="v1co-waitlist-form" onSubmit={handleSubmit('elite')}>
                  <input
                    type="email"
                    className="v1co-waitlist-input"
                    placeholder="your@email.com"
                    required
                    aria-label="Email address"
                  />
                  <button type="submit" className="v1co-waitlist-btn v1co-waitlist-btn-ghost">
                    Apply →
                  </button>
                </form>
              )}
              <div className="v1co-dual-micro">
                Applications aren&rsquo;t open yet —{' '}
                <a href="https://www.instagram.com/hacknflex/" target="_blank" rel="noopener noreferrer">
                  DM @hacknflex on Instagram
                </a>{' '}
                if you&rsquo;d like to be a founding elite.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
