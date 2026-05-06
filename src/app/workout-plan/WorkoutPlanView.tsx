'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import LoginModal from '@/components/LoginModal';
import {
  joinKipWaitlistAction,
  getKipWaitlistStatsAction,
  getKipWaitlistMeAction,
} from '@/app/actions/kip-waitlist';
import type { WaitlistMe, WaitlistStats } from '@/lib/api';
import { FAQS } from './faqs';

const HOW_STEPS = [
  {
    num: '01',
    title: 'Tell Kip about you',
    desc:
      'Goal, age, how many days you can run, where you live. Three minutes.',
  },
  {
    num: '02',
    title: 'Get your two weeks',
    desc:
      'A real plan — easy days, hard days, a long one. Each run with a warm-up and cool-down written out.',
  },
  {
    num: '03',
    title: 'Run it. Tell Kip how it felt.',
    desc:
      'A number from 1 to 10 after each run. After two weeks, Kip writes a fresh plan based on how it went. Need a change mid-plan? Just ask.',
  },
];

const RIBBON_PHRASES = [
  'A running coach in your pocket',
  'Two weeks at a time',
  'Knows the air in your city',
  'First 5K · half-marathon · full',
  'Easy days, hard days, long days',
  'Launching 16 May 2026',
  'Made for runners in India',
];

const COMPARISON: { label: string; gpt: string; kip: string }[] = [
  {
    label: 'Where the plan comes from',
    gpt: 'Written fresh each time you ask.',
    kip: 'Built on plans coaches have used for decades.',
  },
  {
    label: 'Last week',
    gpt: 'It forgets between chats.',
    kip: 'It remembers every run you’ve logged.',
  },
  {
    label: 'Where you live',
    gpt: "Doesn't know it's Delhi vs Bengaluru.",
    kip: 'Checks the air and heat in your city, every day.',
  },
  {
    label: 'If you skip Tuesday',
    gpt: 'The plan rolls on without you.',
    kip: 'Ask Kip to reshuffle. Or the next plan absorbs it.',
  },
  {
    label: 'The math underneath',
    gpt: 'Looks right. Drifts.',
    kip: 'Same method, written down in our paper.',
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

interface WorkoutPlanViewProps {
  initialStats: WaitlistStats;
  initialMe: WaitlistMe | null;
  isSignedIn: boolean;
}

export default function WorkoutPlanView({
  initialStats,
  initialMe,
  isSignedIn: initialIsSignedIn,
}: WorkoutPlanViewProps) {
  const [openFaq, setOpenFaq] = useState<number>(0);

  const [stats, setStats] = useState<WaitlistStats>(initialStats);
  const [joined, setJoined] = useState<boolean>(initialMe?.joined ?? false);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(initialIsSignedIn);
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingJoin, startJoin] = useTransition();

  // The 100 target has been hit. Joining is still allowed past this — the
  // copy just shifts to "waitlist still open, you can still request".
  const isFull = !stats.isOpen;

  // After a successful sign-in via the modal, immediately attempt to claim
  // the spot — that's the action the user came here for.
  function attemptJoin() {
    setJoinError(null);
    startJoin(async () => {
      const res = await joinKipWaitlistAction();
      if (res.ok) {
        setJoined(true);
        setStats((s) => ({
          ...s,
          total: res.result.total,
          isOpen: res.result.total < res.result.capacity,
        }));
      } else if (res.code === 'UNAUTHENTICATED') {
        setIsSignedIn(false);
        setLoginOpen(true);
      } else {
        setJoinError(res.error);
      }
    });
  }

  function handleClaimClick() {
    if (joined || pendingJoin) return;
    if (!isSignedIn) {
      setJoinError(null);
      setLoginOpen(true);
      return;
    }
    attemptJoin();
  }

  // Modal calls this on successful auth — close, mark signed in, then join.
  function handleAuthSuccess() {
    setLoginOpen(false);
    setIsSignedIn(true);
    // Brief delay so the modal close animation doesn't overlap the toast.
    setTimeout(() => {
      // Re-check `me` first — user may have already joined in a prior session.
      void (async () => {
        const me = await getKipWaitlistMeAction();
        if (me.ok && me.me.joined) {
          setJoined(true);
          return;
        }
        attemptJoin();
      })();
    }, 50);
  }

  // Keep the counter live-ish: refresh once on mount and again every 30s
  // while the page is visible. Cheap GET, public endpoint, no auth.
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const r = await getKipWaitlistStatsAction();
      if (!cancelled && r.ok) setStats(r.stats);
    }
    void refresh();
    const id = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const toggleFaq = (i: number) =>
    setOpenFaq((cur) => (cur === i ? -1 : i));

  return (
    <>
      {/* Hero */}
      <section className="v1w-hero">
        <div className="v1w-hero-bg" aria-hidden />
        <div className="v1w-container v1w-hero-grid">
          <div className="v1w-hero-left">
            <span className="v1w-hero-badge">
              Waitlist open · launching 16 May 2026
            </span>
            <h1 className="v1w-hero-title">
              Kip writes your
              <br />
              <span className="v1w-red">running training plan.</span>
            </h1>
            <p className="v1w-hero-sub">
              A running coach in your pocket. Two weeks at a time, then a fresh plan
              — works with or without a watch.
            </p>
            <div className="v1w-hero-meta">
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Plans for first 5K, half-marathon, getting faster
              </div>
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Knows the air outside your door
              </div>
              <div className="v1w-hero-meta-row">
                <span className="v1w-hero-meta-dot" />
                Backed by proven methodology
              </div>
            </div>
            <div className="v1w-hero-cta">
              <button
                type="button"
                className="v1w-btn v1w-btn-primary"
                onClick={handleClaimClick}
                disabled={joined || pendingJoin}
              >
                {joined ? 'Already waitlisted' : 'Join the waitlist'}
              </button>
            </div>
          </div>

          <div className="v1w-hero-right" aria-hidden="true">
            <div className="v1w-phone-stage">
              <div className="v1w-phone-float v1w-phone-float-tl">
                <span className="v1w-phone-float-dot" />
                Built <b>for you</b>
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
                        <b>Kip · Heads up</b>
                        Air&apos;s cleaner before 6 am in Delhi this week. Try moving today&apos;s tempo to the morning.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                Three minutes to a <b>real plan</b>.
              </h2>
            </div>
          </div>

          <div className="v1w-how-steps">
            {HOW_STEPS.map((s, i) => (
              <div key={s.num} className="v1w-how-step">
                <div className="v1w-how-step-num">{s.num}</div>
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

      {/* ChatGPT vs Kip */}
      <section className="v1w-compare">
        <div className="v1w-container">
          <div className="v1w-section-header">
            <div>
              <div className="v1w-section-kicker">Why Kip</div>
              <h2 className="v1w-section-title v1w-on-dark">
                Why not just ask <b>ChatGPT</b>?
              </h2>
            </div>
          </div>

          <div className="v1w-compare-poster">
            <div className="v1w-compare-banner">
              <div className="v1w-compare-team">
                <div className="v1w-compare-team-tag">In the left corner</div>
                <div className="v1w-compare-team-name">ChatGPT</div>
                <div className="v1w-compare-team-meta">
                  Generalist · trained on the internet
                </div>
              </div>
              <div className="v1w-compare-vs" aria-hidden="true">vs</div>
              <div className="v1w-compare-team v1w-compare-team-right">
                <div className="v1w-compare-team-tag">In the right corner</div>
                <div className="v1w-compare-team-name">Kip</div>
                <div className="v1w-compare-team-meta">
                  Specialist · trained on running coaches
                </div>
              </div>
            </div>

            <div className="v1w-compare-rounds">
              {COMPARISON.map((c) => (
                <div key={c.label} className="v1w-compare-round">
                  <div className="v1w-compare-round-side v1w-compare-round-gpt">
                    {c.gpt}
                  </div>
                  <div className="v1w-compare-round-label">{c.label}</div>
                  <div className="v1w-compare-round-side v1w-compare-round-kip">
                    {c.kip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="v1w-methodology">
        <div className="v1w-container">
          <div className="v1w-methodology-inner">
            <div className="v1w-section-kicker">Methodology</div>
            <h2 className="v1w-methodology-title">
              We&apos;ve written down exactly
              <br />
              how <span className="v1w-red">Kip thinks</span>.
            </h2>
            <p className="v1w-methodology-body">
              Kip doesn&apos;t make plans up. It uses running methods coaches and
              runners have been refining for decades, calibrated for the air,
              the heat, and the body of the runner in front of it. We&apos;ve put
              all of it in a paper — every choice we made, every line of
              evidence behind it. If you want to see how it works under the
              hood, it&apos;s all there.
            </p>
            <div className="v1w-methodology-author">
              Endorfin Working Paper No. 1 · Shivam Singhal · May 2026
            </div>
            <Link href="/whitepaper" className="v1w-btn v1w-btn-primary v1w-methodology-cta">
              <span>Read the paper</span>
              <span className="v1w-btn-arrow" aria-hidden="true">→</span>
            </Link>
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

      {/* Waitlist */}
      <section
        className={`v1w-waitlist ${joined ? 'is-submitted' : ''}`}
        id="waitlist"
      >
        <div className="v1w-container">
          <div className="v1w-waitlist-kicker">Launching 16 May 2026</div>
          <h2 className="v1w-waitlist-title">
            {joined ? (
              <>
                You&apos;re on the{' '}
                <span className="v1w-red">waitlist.</span>
              </>
            ) : isFull ? (
              <>
                Waitlist is{' '}
                <span className="v1w-red">full.</span>
              </>
            ) : (
              <>
                Join the{' '}
                <span className="v1w-red">waitlist.</span>
              </>
            )}
          </h2>

          <div className="v1w-waitlist-counter" aria-live="polite">
            <span className="v1w-waitlist-counter-num">
              <strong>{stats.total}</strong>
              <span className="v1w-waitlist-counter-sep">/</span>
              <span>{stats.capacity}</span>
            </span>
            <span className="v1w-waitlist-counter-label">
              runners on the waitlist
            </span>
            <span
              className="v1w-waitlist-counter-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={stats.capacity}
              aria-valuenow={stats.total}
            >
              <span
                className="v1w-waitlist-counter-bar-fill"
                style={{
                  width: `${Math.min(100, (stats.total / stats.capacity) * 100)}%`,
                }}
              />
            </span>
          </div>

          <p className="v1w-waitlist-sub">
            {joined
              ? "We'll email you on 16 May with your invite link. Until then — keep running."
              : isFull
                ? "First 100 spots are taken — but you can still request a spot. We'll get you in as soon as we can."
                : 'Kip opens to the first 100 runners on 16 May 2026. Sign in to join the waitlist — confirmation lands in your inbox right after.'}
          </p>

          <div className="v1w-waitlist-cta-row">
            <button
              type="button"
              className="v1w-waitlist-submit v1w-waitlist-submit-solo"
              onClick={handleClaimClick}
              disabled={joined || pendingJoin}
            >
              {joined ? 'Already waitlisted' : 'Join the waitlist'}
            </button>
          </div>

          {joined && (
            <div className="v1w-waitlist-success" role="status" aria-live="polite">
              ● Confirmation email sent. We&apos;ll be in touch on 16 May.
            </div>
          )}

          {isFull && !joined && (
            <div className="v1w-waitlist-note">
              First 100 are claimed. You&apos;re still welcome — request a spot
              above, or{' '}
              <a
                href="https://www.instagram.com/hacknflex/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-bone"
              >
                follow @hacknflex on Instagram
              </a>{' '}
              for launch updates.
            </div>
          )}

          {joinError && !pendingJoin && (
            <div className="v1w-waitlist-note" role="alert">
              {joinError}
            </div>
          )}
        </div>
      </section>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleAuthSuccess}
        title={
          <>
            Sign in to join the{' '}
            <span className="v1lm-red">waitlist.</span>
          </>
        }
        subtitle="One spot per account. We'll send a confirmation email right after."
      />
    </>
  );
}
