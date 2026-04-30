'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';
import { useStoreLink } from '@/lib/use-store-link';

// ─── Mock runners (shape loosely mirrors /api/v1/users/{id}) ────────
interface RunnerStats {
  weeklyKm: number;
  longestKm: number;
  avgPace: string;
  pb: string;
}
interface Runner {
  slug: string;
  name: string;
  handle: string;
  city: string;
  paceGroup: string;
  paceBucket: 'elite' | 'competitive' | 'casual';
  bio: string;
  portraitUrl: string;
  isVerified: boolean;
  stats: RunnerStats;
  tags: string[];
  bib: string;
}

const MOCK_RUNNERS: Runner[] = [
  {
    slug: 'aarav-kapoor',
    name: 'Aarav Kapoor',
    handle: '@aaravruns',
    city: 'Delhi',
    paceGroup: '4:10',
    paceBucket: 'elite',
    bio: 'Sub-3 marathoner. India Gate mornings, track Tuesdays, long runs through Lodhi.',
    portraitUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 118, longestKm: 42, avgPace: '4:10', pb: '2:58:40' },
    tags: ['Sub-3 Marathoner', 'Track', 'Club Captain'],
    bib: '04',
  },
  {
    slug: 'priya-menon',
    name: 'Priya Menon',
    handle: '@priyaruns.mum',
    city: 'Mumbai',
    paceGroup: '5:20',
    paceBucket: 'competitive',
    bio: 'Marine Drive regular. HM specialist, chasing sub-1:45. Coffee after every run.',
    portraitUrl: 'https://images.unsplash.com/photo-1605405748313-a416a1b84491?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 68, longestKm: 25, avgPace: '5:20', pb: '1:46:12 (HM)' },
    tags: ['PB Chaser', 'Coastal', 'Pacing'],
    bib: '12',
  },
  {
    slug: 'rohit-deshmukh',
    name: 'Rohit Deshmukh',
    handle: '@rohitultra',
    city: 'Pune',
    paceGroup: '5:45',
    paceBucket: 'competitive',
    bio: 'Trail & ultra. Sinhagad weekends, Western Ghats in the monsoon. 100K finisher.',
    portraitUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 95, longestKm: 100, avgPace: '5:45', pb: '13:44 (100K)' },
    tags: ['Ultra', 'Trail', 'Monsoon runs'],
    bib: '27',
  },
  {
    slug: 'ananya-iyer',
    name: 'Ananya Iyer',
    handle: '@ananya.runs',
    city: 'Bengaluru',
    paceGroup: '5:05',
    paceBucket: 'competitive',
    bio: 'Cubbon Park loops at dawn. Targeting BLR Marathon sub-3:30 this season.',
    portraitUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 82, longestKm: 32, avgPace: '5:05', pb: '3:34:55' },
    tags: ['Marathoner', 'PB Chaser', 'Tempo'],
    bib: '09',
  },
  {
    slug: 'vikram-reddy',
    name: 'Vikram Reddy',
    handle: '@vikram.hyd',
    city: 'Hyderabad',
    paceGroup: '4:45',
    paceBucket: 'elite',
    bio: 'Hussain Sagar speed sessions. Age-group podium at Hyderabad Marathon 2025.',
    portraitUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 104, longestKm: 36, avgPace: '4:45', pb: '3:06:18' },
    tags: ['Speed Work', 'Podium Finisher', 'Track'],
    bib: '03',
  },
  {
    slug: 'nisha-rajan',
    name: 'Nisha Rajan',
    handle: '@nisharuns',
    city: 'Chennai',
    paceGroup: '6:10',
    paceBucket: 'casual',
    bio: 'Beach runs at Besant Nagar. 5K to 10K, slowly, deliberately, every single week.',
    portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80&auto=format&fit=crop',
    isVerified: false,
    stats: { weeklyKm: 34, longestKm: 15, avgPace: '6:10', pb: '55:22 (10K)' },
    tags: ['Returning Runner', 'Coastal', 'Morning'],
    bib: '41',
  },
  {
    slug: 'arjun-shah',
    name: 'Arjun Shah',
    handle: '@arjun.shah',
    city: 'Mumbai',
    paceGroup: '4:30',
    paceBucket: 'elite',
    bio: 'Bandra Bandstand tempo runs. 2:52 marathon. Strava-verified. Always pacing someone.',
    portraitUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80&auto=format&fit=crop',
    isVerified: true,
    stats: { weeklyKm: 125, longestKm: 42, avgPace: '4:30', pb: '2:52:04' },
    tags: ['Sub-3 Marathoner', 'Pacer', 'Tempo'],
    bib: '01',
  },
  {
    slug: 'simran-dhillon',
    name: 'Simran Dhillon',
    handle: '@simran.runs',
    city: 'Delhi',
    paceGroup: '6:20',
    paceBucket: 'casual',
    bio: 'First 10K last spring. Now chasing a half. Aravalli trails on the weekend.',
    portraitUrl: 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=900&q=80&auto=format&fit=crop',
    isVerified: false,
    stats: { weeklyKm: 42, longestKm: 18, avgPace: '6:20', pb: '58:40 (10K)' },
    tags: ['Returning Runner', 'Trail', 'HM Prep'],
    bib: '58',
  },
];

function scoreRunner(r: Runner) {
  const [m, s] = r.paceGroup.split(':').map(Number);
  const paceSec = (m || 0) * 60 + (s || 0);
  const paceScore = Math.max(0, 600 - paceSec) * 2;
  return (r.isVerified ? 3000 : 0) + r.stats.weeklyKm * 10 + paceScore;
}

function pickFlagships(all: Runner[]): Runner[] {
  return [...all].sort((a, b) => scoreRunner(b) - scoreRunner(a)).slice(0, 5);
}

// ─── Small inline icon (verified check) ────────────────────────
function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.3l-5.8 5.8a1 1 0 01-1.4 0L7 12.6a1 1 0 011.4-1.4l1.8 1.8 5.1-5.1a1 1 0 011.4 1.4z"
      />
    </svg>
  );
}

// ─── Flagship runner card ──────────────────────────────────────
function FlagshipCard({ r }: { r: Runner }) {
  const downloadHref = useStoreLink('/#download');
  return (
    <article className="v1ru-flagship-card">
      <div className="v1ru-flagship-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={r.portraitUrl}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="v1ru-flagship-portrait-badge">Featured · {r.city}</span>
        <div className="v1ru-flagship-bib">
          <div className="v1ru-flagship-bib-num">{r.bib}</div>
          <div className="v1ru-flagship-bib-label">
            Endorfin
            <br />
            Runner
          </div>
        </div>
      </div>
      <div className="v1ru-flagship-body">
        <div>
          <div className="v1ru-flagship-kicker">
            {r.city} <span className="v1ru-sep">·</span> {r.paceGroup} pace
            {r.isVerified && (
              <span className="v1ru-flagship-verified" aria-label="Verified">
                <CheckIcon size={15} />
              </span>
            )}
          </div>
          <h3 className="v1ru-flagship-name">{r.name}</h3>
          <div className="v1ru-flagship-handle">{r.handle}</div>
          <p className="v1ru-flagship-bio">&ldquo;{r.bio}&rdquo;</p>
          <div className="v1ru-flagship-stats">
            <div className="v1ru-flagship-stat">
              <div className="v1ru-flagship-stat-label">Weekly</div>
              <div className="v1ru-flagship-stat-value">
                {r.stats.weeklyKm}
                <span className="v1ru-unit">km</span>
              </div>
            </div>
            <div className="v1ru-flagship-stat">
              <div className="v1ru-flagship-stat-label">Avg pace</div>
              <div className="v1ru-flagship-stat-value">
                {r.stats.avgPace}
                <span className="v1ru-unit">/km</span>
              </div>
            </div>
            <div className="v1ru-flagship-stat">
              <div className="v1ru-flagship-stat-label">Longest</div>
              <div className="v1ru-flagship-stat-value">
                {r.stats.longestKm}
                <span className="v1ru-unit">km</span>
              </div>
            </div>
            <div className="v1ru-flagship-stat">
              <div className="v1ru-flagship-stat-label">Personal best</div>
              <div className="v1ru-flagship-stat-value" style={{ fontSize: '20px' }}>
                {r.stats.pb}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="v1ru-flagship-tags">
            {r.tags.map((t, i) => (
              <span key={t} className={`v1ru-flagship-tag${i === 0 ? ' hot' : ''}`}>
                {t}
              </span>
            ))}
          </div>
          <div className="v1ru-flagship-ctas">
            <a className="v1ru-btn v1ru-btn-primary" href={downloadHref}>
              Get the app
            </a>
            <a className="v1ru-btn v1ru-btn-ghost-light" href={downloadHref}>
              Get the app to follow →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Feature tabs ─────────────────────────────────────────────
type TabName = 'search' | 'follow' | 'realtime' | 'privacy';
const TAB_ORDER: { key: TabName; label: string }[] = [
  { key: 'search', label: '01 · Search' },
  { key: 'follow', label: '02 · Follow' },
  { key: 'realtime', label: '03 · Real-time' },
  { key: 'privacy', label: '04 · Privacy' },
];

function SearchPanel() {
  return (
    <div className="v1ru-rf-panel" role="tabpanel">
      <div>
        <div className="v1ru-rf-panel-num">01</div>
        <h3>Find runners by name or pace.</h3>
        <p>
          Look up the runners you already know. Or search by average pace — your 5:30 crew is already in the app.
          Filter by city, race count, or club affiliation.
        </p>
        <div className="v1ru-rf-panel-list">
          <div className="v1ru-rf-panel-list-item">Name + phone contacts</div>
          <div className="v1ru-rf-panel-list-item">Filter by avg pace</div>
          <div className="v1ru-rf-panel-list-item">City &amp; club discovery</div>
        </div>
      </div>
      <div className="v1ru-rf-mock">
        <div className="v1ru-rf-search-bar">5:30 pace · Mumbai</div>
        <div className="v1ru-rf-pace-chips">
          <span className="v1ru-rf-pace-chip on">5:30 /km</span>
          <span className="v1ru-rf-pace-chip">5:45</span>
          <span className="v1ru-rf-pace-chip">6:00</span>
          <span className="v1ru-rf-pace-chip">Sub-5</span>
        </div>
        <div className="v1ru-rf-mock-head" style={{ marginTop: 16 }}>
          <span>
            <strong>12 runners</strong> · matching
          </span>
          <span>Mumbai</span>
        </div>
        <div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">PM</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Priya Menon</div>
              <div className="v1ru-rf-meta">5:28 avg · 14 races · Bandra</div>
            </div>
            <span className="v1ru-rf-action muted">View</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">RD</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Rohit Deshmukh</div>
              <div className="v1ru-rf-meta">5:30 avg · 22 races · Powai</div>
            </div>
            <span className="v1ru-rf-action muted">View</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">AN</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Anika Nair</div>
              <div className="v1ru-rf-meta">5:32 avg · 9 races · Worli</div>
            </div>
            <span className="v1ru-rf-action muted">View</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowPanel() {
  return (
    <div className="v1ru-rf-panel" role="tabpanel">
      <div>
        <div className="v1ru-rf-panel-num">02</div>
        <h3>Follow the runners who push you.</h3>
        <p>
          Follow your crew. Follow the runners you chase at every race. They can follow you back. Your feed fills with
          their runs, PBs, and next start lines.
        </p>
        <div className="v1ru-rf-panel-list">
          <div className="v1ru-rf-panel-list-item">Follow &amp; mutual follows</div>
          <div className="v1ru-rf-panel-list-item">Feed of runs &amp; PBs</div>
          <div className="v1ru-rf-panel-list-item">Race plans from people you follow</div>
        </div>
      </div>
      <div className="v1ru-rf-mock">
        <div className="v1ru-rf-mock-head">
          <span>
            <strong>Suggested</strong> · runs your pace
          </span>
          <span>4 · mutuals</span>
        </div>
        <div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">AK</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Aarav Kapoor</div>
              <div className="v1ru-rf-meta">5:30 avg · 3 mutuals · Delhi</div>
            </div>
            <span className="v1ru-rf-action yes">Follow</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">RJ</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Rhea Joshi</div>
              <div className="v1ru-rf-meta">5:20 avg · Follows you</div>
            </div>
            <span className="v1ru-rf-action yes">Follow back</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">DK</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Dev Khurana</div>
              <div className="v1ru-rf-meta">4:58 avg · 2 mutuals · Gurugram</div>
            </div>
            <span className="v1ru-rf-action muted">Following</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">SM</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Simran Mehta</div>
              <div className="v1ru-rf-meta">6:10 avg · Sub-2 Half</div>
            </div>
            <span className="v1ru-rf-action yes">Follow</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RealtimePanel() {
  return (
    <div className="v1ru-rf-panel" role="tabpanel">
      <div>
        <div className="v1ru-rf-panel-num">03</div>
        <h3>Know when your people are racing.</h3>
        <p>
          The moment a runner you follow RSVPs to a race or a club run, you get a push. Show up together. Cheer from the
          course. Nothing goes missed.
        </p>
        <div className="v1ru-rf-panel-list">
          <div className="v1ru-rf-panel-list-item">RSVP &amp; check-in alerts</div>
          <div className="v1ru-rf-panel-list-item">Starting-soon pings</div>
          <div className="v1ru-rf-panel-list-item">Live race-day presence</div>
        </div>
      </div>
      <div className="v1ru-rf-mock">
        <div className="v1ru-rf-mock-head">
          <span>
            <strong>Activity</strong> · people you follow
          </span>
          <span className="v1ru-rf-ping">Live</span>
        </div>
        <div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">RJ</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Rhea Joshi is going</div>
              <div className="v1ru-rf-meta">Sunday Long Run · 25K · 26 Apr</div>
            </div>
            <span className="v1ru-rf-action green">2 min ago</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">DK</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Dev Khurana RSVP&rsquo;d</div>
              <div className="v1ru-rf-meta">Tata Mumbai Marathon · 19 Jan</div>
            </div>
            <span className="v1ru-rf-action green">14 min ago</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">AP</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Anu Prasad is at the start</div>
              <div className="v1ru-rf-meta">Bengaluru 10K · Cubbon Park</div>
            </div>
            <span className="v1ru-rf-action gold">Now</span>
          </div>
          <div className="v1ru-rf-row">
            <div className="v1ru-rf-av">VI</div>
            <div className="v1ru-rf-main">
              <div className="v1ru-rf-name">Vikram Iyer logged 32K</div>
              <div className="v1ru-rf-meta">4:58 pace · PB attempt</div>
            </div>
            <span className="v1ru-rf-action muted">1h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div className="v1ru-rf-panel" role="tabpanel">
      <div>
        <div className="v1ru-rf-panel-num">04</div>
        <h3>You decide who follows you.</h3>
        <p>
          Public profile, approval-required, or invite-only — you pick. Hide your pace, hide your races, hide your
          location. Block with a tap. Endorfin&rsquo;s built privacy-first.
        </p>
        <div className="v1ru-rf-panel-list">
          <div className="v1ru-rf-panel-list-item">Approval-required follows</div>
          <div className="v1ru-rf-panel-list-item">Hide pace, race, or location</div>
          <div className="v1ru-rf-panel-list-item">Block &amp; mute in one tap</div>
        </div>
      </div>
      <div className="v1ru-rf-mock">
        <div className="v1ru-rf-mock-head">
          <span>
            <strong>Privacy</strong> · who sees you
          </span>
          <span>Saved</span>
        </div>
        <div>
          <div className="v1ru-rf-toggle-row">
            <div>
              <div className="v1ru-rf-toggle-label">Approve every new follower</div>
              <div className="v1ru-rf-toggle-sub">Nobody follows you without your OK</div>
            </div>
            <div className="v1ru-rf-switch on" />
          </div>
          <div className="v1ru-rf-toggle-row">
            <div>
              <div className="v1ru-rf-toggle-label">Show my average pace</div>
              <div className="v1ru-rf-toggle-sub">Visible on your profile to followers</div>
            </div>
            <div className="v1ru-rf-switch on" />
          </div>
          <div className="v1ru-rf-toggle-row">
            <div>
              <div className="v1ru-rf-toggle-label">Show my upcoming races</div>
              <div className="v1ru-rf-toggle-sub">Followers see where you&rsquo;re racing next</div>
            </div>
            <div className="v1ru-rf-switch" />
          </div>
          <div className="v1ru-rf-toggle-row">
            <div>
              <div className="v1ru-rf-toggle-label">Appear in city discovery</div>
              <div className="v1ru-rf-toggle-sub">People in your city can find you</div>
            </div>
            <div className="v1ru-rf-switch on" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────
export default function RunnersView() {
  const allRunners = useMemo(() => MOCK_RUNNERS, []);
  const flagships = useMemo(() => pickFlagships(allRunners), [allRunners]);
  const ribbonNames = useMemo(() => allRunners.map((r) => r.name.toUpperCase()), [allRunners]);
  const downloadHref = useStoreLink('/#download');

  const uniqueCities = useMemo(
    () => new Set(allRunners.map((r) => r.city).filter(Boolean)).size,
    [allRunners],
  );

  // Flagship carousel state
  const flagRef = useRef<HTMLDivElement | null>(null);
  const [flagPrev, setFlagPrev] = useState(true);
  const [flagNext, setFlagNext] = useState(true);
  const [flagCanScroll, setFlagCanScroll] = useState(false);
  const [flagActive, setFlagActive] = useState(0);

  const flagStep = useCallback(() => {
    const el = flagRef.current;
    if (!el) return 0;
    const first = el.querySelector('.v1ru-flagship-card') as HTMLElement | null;
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

  useEffect(() => {
    if (flagRef.current) flagRef.current.scrollLeft = 0;
    requestAnimationFrame(updateFlag);
  }, [flagships, updateFlag]);

  useEffect(() => {
    const onResize = () => requestAnimationFrame(updateFlag);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateFlag]);

  const scrollFlag = (dir: 1 | -1) =>
    flagRef.current?.scrollBy({ left: dir * flagStep(), behavior: 'smooth' });

  const onFlagKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollFlag(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollFlag(-1);
    }
  };

  // Feature tabs state
  const [activeTab, setActiveTab] = useState<TabName>('search');

  return (
    <>
      {/* Hero */}
      <section className="v1ru-hero">
        <div className="v1ru-hero-bg" aria-hidden />
        <div className="v1ru-container">
          <h1 className="v1ru-hero-title">
            Find your
            <br />
            running <span className="v1ru-red">partner.</span>
          </h1>
          <div className="v1ru-hero-foot">
            <p className="v1ru-hero-sub">
              Search by name or pace. Follow the runners you know — and the ones you want to chase. Get pinged the
              moment they&rsquo;re heading to a start line. You decide who follows you.
            </p>
            <div className="v1ru-hero-stats">
              <div>
                <div className="v1ru-hero-stat-n">10K+</div>
                <div className="v1ru-hero-stat-l">Runners</div>
              </div>
              <div>
                <div className="v1ru-hero-stat-n">{uniqueCities}+</div>
                <div className="v1ru-hero-stat-l">Cities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      {ribbonNames.length > 0 && (
        <div className="v1ru-ribbon" aria-hidden>
          <div className="v1ru-ribbon-track">
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

      {/* Flagship */}
      {flagships.length > 0 && (
        <section className="v1ru-featured">
          <div className="v1ru-container">
            <div className="v1ru-section-header">
              <h2 className="v1ru-section-title">
                Featured runners in <b className="v1ru-red">India</b>.
              </h2>
              <div className="v1ru-flagship-header-right">
                <span className="v1ru-section-count">
                  {flagships.length === 1 ? '1 featured' : `${flagships.length} featured`}
                </span>
                <div className="v1ru-carousel-controls" hidden={!flagCanScroll} role="group">
                  <button
                    className="v1ru-carousel-btn"
                    disabled={flagPrev}
                    onClick={() => scrollFlag(-1)}
                    aria-label="Previous flagship runner"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="v1ru-carousel-btn"
                    disabled={flagNext}
                    onClick={() => scrollFlag(1)}
                    aria-label="Next flagship runner"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="v1ru-flagship-carousel-wrap">
              <div
                className="v1ru-flagship-carousel"
                ref={flagRef}
                onScroll={() => requestAnimationFrame(updateFlag)}
                onKeyDown={onFlagKey}
                tabIndex={0}
                role="region"
                aria-label="Flagship runners"
              >
                {flagships.map((r) => (
                  <FlagshipCard key={r.slug} r={r} />
                ))}
              </div>
            </div>

            {flagships.length > 1 && (
              <div className="v1ru-flagship-dots" role="tablist" aria-label="Flagship pagination">
                {flagships.map((_, i) => (
                  <button
                    key={i}
                    className={`v1ru-flagship-dot ${i === flagActive ? 'is-active' : ''}`}
                    aria-label={`Flagship ${i + 1} of ${flagships.length}`}
                    aria-selected={i === flagActive}
                    role="tab"
                    onClick={() =>
                      flagRef.current?.scrollTo({ left: i * flagStep(), behavior: 'smooth' })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Feature tabs */}
      <section className="v1ru-rf-section">
        <div className="v1ru-container">
          <div className="v1ru-rf-head">
            <div className="v1ru-rf-kicker">How Runners works</div>
            <h2>
              Your running
              <br />
              partner, <b className="v1ru-red">one tap away.</b>
            </h2>
          </div>

          <div className="v1ru-rf-tabs" role="tablist">
            {TAB_ORDER.map((t) => (
              <button
                key={t.key}
                className={`v1ru-rf-tab ${activeTab === t.key ? 'is-active' : ''}`}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'search' && <SearchPanel />}
          {activeTab === 'follow' && <FollowPanel />}
          {activeTab === 'realtime' && <RealtimePanel />}
          {activeTab === 'privacy' && <PrivacyPanel />}
        </div>
      </section>

      {/* CTA */}
      <section className="v1ru-cta-footer" id="download">
        <div className="v1ru-container v1ru-cta-grid">
          <div>
            <h2 className="v1ru-cta-heading">
              Run with people
              <br />
              who <span className="v1ru-red">get</span>
              <br />
              it.
            </h2>
            <p className="v1ru-cta-sub">
              Install Endorfin. Build your profile, connect with runners your pace, show up at the start line together.
              Free on Android and iOS.
            </p>
          </div>
          <div className="v1ru-cta-buttons">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="v1ru-btn v1ru-btn-ghost-light"
            >
              <svg className="v1ru-btn-icon" viewBox="0 0 24 24" aria-hidden>
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
              rel="noopener noreferrer"
              className="v1ru-btn v1ru-btn-primary"
            >
              <svg className="v1ru-btn-icon" viewBox="0 0 24 24" aria-hidden>
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
