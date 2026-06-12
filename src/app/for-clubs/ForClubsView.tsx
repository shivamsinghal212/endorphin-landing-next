'use client';
/* eslint-disable react/no-unescaped-entities */

import Link from 'next/link';
import { useEffect, useRef } from 'react';

// Star glyph used in the marquee strips.
const Star = () => (
  <svg viewBox="0 0 24 24"><path d="M12 2l2.5 7.5H22l-6 4.5 2.3 7.5L12 17l-6.3 4.5L8 14 2 9.5h7.5z" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
);

export default function ForClubsView() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    // ── scroll reveals ──
    const rv = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    if (reduce) {
      rv.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }),
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      rv.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // ── discovery scrollytelling ──
    const disc = root.querySelector('#discScroller');
    if (disc) {
      const steps = Array.from(disc.querySelectorAll<HTMLElement>('.dstep'));
      const pvs = Array.from(disc.querySelectorAll<HTMLElement>('.dpv'));
      const dots = Array.from(disc.querySelectorAll<HTMLElement>('.dprog i'));
      const act = (i: string) => {
        steps.forEach((s) => s.classList.toggle('active', s.dataset.step === i));
        pvs.forEach((p) => p.classList.toggle('active', p.dataset.pv === i));
        dots.forEach((d, x) => d.classList.toggle('on', String(x + 1) === i));
      };
      const dio = new IntersectionObserver(
        (es) => es.forEach((e) => {
          if (e.isIntersecting) act((e.target as HTMLElement).dataset.step ?? '1');
        }),
        { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
      );
      steps.forEach((s) => dio.observe(s));
      cleanups.push(() => dio.disconnect());
    }

    // ── parallax (transform-only, rAF-throttled) ──
    if (!reduce) {
      const plx = Array.from(root.querySelectorAll<HTMLElement>('[data-plx]'));
      let ticking = false;
      const update = () => {
        ticking = false;
        const vh = window.innerHeight;
        plx.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const sp = parseFloat(el.dataset.plx || '0') || 0;
          const off = (r.top + r.height / 2 - vh / 2) * sp;
          el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
        });
      };
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    }

    // ── glowing scroll streak (drawn by scroll, colour-ramps down the page) ──
    const streakWrap = root.querySelector<HTMLElement>('#streakWrap');
    if (streakWrap) {
      const NS = 'http://www.w3.org/2000/svg';
      let core: SVGPathElement | null = null;
      let glow: SVGPathElement | null = null;
      let built = false;
      let samples: Array<[number, number]> = [];

      const build = () => {
        const localH = root.scrollHeight;
        const w = root.clientWidth;
        streakWrap.style.height = `${localH}px`;
        streakWrap.innerHTML = '';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${w} ${localH}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.height = `${localH}px`;

        // weave through the page — one bend per section band, with a minimum
        // vertical gap so the curve stays smooth (no hairpins).
        const anchors = Array.from(root.querySelectorAll<HTMLElement>('header.hero, section'));
        const lo = w < 720 ? 0.2 : 0.12;
        const hi = 1 - lo;
        const MIN_GAP = Math.max(520, window.innerHeight * 0.7);
        const pts: Array<[number, number]> = [[w * hi, 72]];
        let flip = 0;
        const addPt = (y: number) => {
          if (y - pts[pts.length - 1][1] < MIN_GAP) return;
          pts.push([flip++ % 2 === 0 ? w * lo : w * hi, y]);
        };
        anchors.forEach((s) => {
          const top = s.offsetTop;
          const h = s.offsetHeight;
          addPt(top + h * 0.45);
          if (h > 1600) addPt(top + h * 0.85);
        });
        if (localH - 120 - pts[pts.length - 1][1] > 420) pts.push([w * 0.5, localH - 120]);

        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const dy = (p1[1] - p0[1]) * 0.55;
          d += ` C${p0[0]},${p0[1] + dy} ${p1[0]},${p1[1] - dy} ${p1[0]},${p1[1]}`;
        }

        const defs = document.createElementNS(NS, 'defs');
        const grad = document.createElementNS(NS, 'linearGradient');
        grad.setAttribute('id', 'fcSgrad');
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('x1', '0');
        grad.setAttribute('y1', '0');
        grad.setAttribute('x2', '0');
        grad.setAttribute('y2', String(localH));
        const stops: Array<[string, string]> = [
          ['0', '#E6232A'], ['.22', '#FF6B35'], ['.45', '#FF2E88'],
          ['.68', '#8B5CF6'], ['.86', '#FF2E88'], ['1', '#B6FF3C'],
        ];
        stops.forEach(([o, c]) => {
          const st = document.createElementNS(NS, 'stop');
          st.setAttribute('offset', o);
          st.setAttribute('stop-color', c);
          grad.appendChild(st);
        });
        defs.appendChild(grad);
        svg.appendChild(defs);

        glow = document.createElementNS(NS, 'path');
        glow.setAttribute('class', 'streak-glow');
        glow.setAttribute('d', d);
        core = document.createElementNS(NS, 'path');
        core.setAttribute('class', 'streak-core');
        core.setAttribute('d', d);
        [glow, core].forEach((p) => {
          p.setAttribute('pathLength', '1');
          p.style.strokeDasharray = '1 1';
          p.style.strokeDashoffset = reduce ? '0' : '1';
          svg.appendChild(p);
        });
        streakWrap.appendChild(svg);

        // y → arc-length-fraction lookup so the tip tracks the viewport
        // exactly (otherwise it races ahead on the horizontal swings).
        samples = [];
        const total = core.getTotalLength();
        const N = 240;
        for (let k = 0; k <= N; k++) {
          const pt = core.getPointAtLength((total * k) / N);
          samples.push([pt.y, k / N]);
        }
        built = true;
        draw();
      };

      const fracAtY = (y: number) => {
        if (!samples.length) return 0;
        if (y <= samples[0][0]) return 0;
        if (y >= samples[samples.length - 1][0]) return 1;
        for (let i = 1; i < samples.length; i++) {
          if (samples[i][0] >= y) {
            const a = samples[i - 1];
            const b = samples[i];
            const t = (y - a[0]) / Math.max(1, b[0] - a[0]);
            return a[1] + (b[1] - a[1]) * t;
          }
        }
        return 1;
      };

      const draw = () => {
        if (!built || reduce || !core || !glow) return;
        const mainTop = root.getBoundingClientRect().top + window.scrollY;
        const localTipY = window.scrollY + window.innerHeight * 0.58 - mainTop;
        const p = Math.min(1, Math.max(0, fracAtY(localTipY)));
        const off = String(1 - p);
        core.style.strokeDashoffset = off;
        glow.style.strokeDashoffset = off;
      };

      let sTick = false;
      const onScrollS = () => {
        if (!sTick) { sTick = true; requestAnimationFrame(() => { sTick = false; draw(); }); }
      };
      let rT: number | undefined;
      const onResizeS = () => { window.clearTimeout(rT); rT = window.setTimeout(build, 200); };
      window.addEventListener('scroll', onScrollS, { passive: true });
      window.addEventListener('resize', onResizeS, { passive: true });
      const raf = requestAnimationFrame(build);
      const onLoad = () => build();
      window.addEventListener('load', onLoad);
      cleanups.push(() => {
        window.removeEventListener('scroll', onScrollS);
        window.removeEventListener('resize', onResizeS);
        window.removeEventListener('load', onLoad);
        window.clearTimeout(rT);
        cancelAnimationFrame(raf);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <main className="fcx" ref={rootRef}>
      <div className="grain" aria-hidden="true" />
      <div id="streakWrap" aria-hidden="true" />

      {/* ═══ HERO ═══ */}
      <header className="hero">
        <div className="hero-photo" aria-hidden="true" />
        <span className="ghost" data-plx="0.10" aria-hidden="true">RUN CLUB</span>
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow rv">For run club organisers</span>
            <h1 className="h-display rv" style={{ transitionDelay: '.06s', marginTop: 22 }}>
              A home for your<br /><span className="chroma-i">run club.</span>
            </h1>
            <p className="lead rv" style={{ transitionDelay: '.12s' }}>
              List your club, host your runs, and get found by runners in your city. Free.
            </p>
            <div className="hero-ctas rv" style={{ transitionDelay: '.18s' }}>
              <Link href="/clubs" className="btn btn-red">Add your club</Link>
              <a href="#community" className="btn btn-ghost">See how it works</a>
            </div>
            <div className="hero-callouts rv" style={{ transitionDelay: '.24s' }}>
              <div><Check />Get discovered</div>
              <div><Check />Host events free</div>
              <div><Check />One place to manage</div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ MARQUEE ═══ */}
      <div className="marq marq-red" aria-hidden="true"><div className="marq-in">
        <div><span>Get discovered</span><Star /><span>Host events free</span><Star /><span>Build your crew</span><Star /><span>No more Google Forms</span><Star /></div>
        <div><span>Get discovered</span><Star /><span>Host events free</span><Star /><span>Build your crew</span><Star /><span>No more Google Forms</span><Star /></div>
      </div></div>

      {/* ═══ ② BENTO ═══ */}
      <section id="community" style={{ overflow: 'visible' }}>
        <span className="ghost" data-plx="0.07" style={{ top: 20, left: '-3%' }} aria-hidden="true">CREW</span>
        <div className="wrap">
          <span className="eyebrow rv">Build community that sticks</span>
          <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>Everything your club needs to<br />keep members <em className="chroma-i">coming back.</em></h2>
          <p className="lead rv" style={{ transitionDelay: '.1s' }}>A real home for your community — not a chat thread and a spreadsheet.</p>

          <div className="bento">
            <div className="tile t1 w7 rv">
              <span className="idx">01</span>
              <h3>Social Connection</h3>
              <p>Give members a reason to stay. A shared feed, group chat, and profiles that make the club feel like an actual club.</p>
              <div className="chips"><span>Member feed</span><span>Group chat</span><span>Profiles</span></div>
              <div className="tile-prev"><div className="mkbox">
                <div className="mk-row"><span className="av av-1">AK</span><div style={{ flex: 1 }}><span className="rt">Aarav Kapoor</span><span className="rs">Long run done — 21K before brunch ☕</span></div></div>
                <div className="mk-row"><span className="av av-4">SM</span><div style={{ flex: 1 }}><span className="rt">Simran Mehta</span><span className="rs">Anyone carpooling from Andheri?</span></div><span className="mini">2 replies</span></div>
              </div></div>
            </div>
            <div className="tile t2 w5 rv" style={{ transitionDelay: '.08s' }}>
              <span className="idx">02</span>
              <h3>Members &amp; Approval</h3>
              <p>Requests, member details, and approvals all in one place. No more Google Forms, no more spreadsheets.</p>
              <div className="tile-prev"><div className="mkbox">
                <div className="mk-row"><span className="av av-2">VI</span><div style={{ flex: 1 }}><span className="rt">Vikram Iyer</span><span className="rs">4:50/km · sub-90 half goal</span></div><span className="mini mini-red">Approve</span></div>
                <div className="mk-row"><span className="av av-3">NP</span><div style={{ flex: 1 }}><span className="rt">Neel Patil</span><span className="rs">New to running · friend of Aarav</span></div><span className="mini">Pending</span></div>
              </div></div>
            </div>
            <div className="tile t3 w5 rv">
              <span className="idx">03</span>
              <h3>Events &amp; Classes</h3>
              <p>Host paid events and recurring classes. Give members something to commit to, week after week.</p>
              <div className="tile-prev"><div className="mkbox">
                <div className="mk-row"><span className="date-blk"><b>14</b><small>Jun</small></span><div style={{ flex: 1 }}><span className="rt">Sunrise Loop 10K</span><span className="rs">6:00 AM · Sector 56 · ₹299</span></div><span className="mini mini-white">RSVP</span></div>
              </div></div>
            </div>
            <div className="tile t4 w7 rv" style={{ transitionDelay: '.08s' }}>
              <span className="idx">04</span>
              <h3>Gamification</h3>
              <p>Run weekly and daily challenges that keep members motivated — streaks, leaderboards, and badges that turn up the consistency.</p>
              <div className="chips"><span>Weekly challenges</span><span>Streaks</span><span>Leaderboard</span></div>
              <div className="tile-prev"><div className="mkbox">
                <div className="mk-row"><div style={{ flex: 1 }}><span className="rt" style={{ marginBottom: 7 }}>June streak challenge · 64%</span><div className="bar"><i /></div></div><div className="medals"><span className="medal gold">1</span><span className="medal">2</span><span className="medal">3</span></div></div>
              </div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ③ DISCOVERY ═══ */}
      <section className="disc">
        <span className="ghost" data-plx="-0.06" aria-hidden="true">FOUND</span>
        <div className="blob blob-magenta" data-plx="0.1" style={{ width: '40vw', height: '40vw', maxWidth: 560, maxHeight: 560, left: '-14%', top: '24%' }} aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow rv">Discovery</span>
          <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>Runners are already looking.<br />We help them <em className="chroma-i">find you.</em></h2>
          <p className="lead rv" style={{ transitionDelay: '.1s' }}>We don't just host your club — we put it in front of people.</p>

          <div className="scroller" id="discScroller">
            <div className="sticky-col rv">
              <div className="dstage">
                <div className="dstage-mask" />
                <div className="dpv active" data-pv="1">
                  <div className="mkbox-dark">
                    <div className="mk-row"><span className="av av-1">UR</span><div style={{ flex: 1 }}><span className="rt">UpRun Club</span><span className="rs">Noida · 42 members · Sunday crew</span></div><span className="mini">Run club</span></div>
                    <div className="mk-row"><span className="av av-2">TT</span><div style={{ flex: 1 }}><span className="rt">Track Tuesdays</span><span className="rs">Intervals · 6:00 AM · ₹300</span></div><span className="mini mini-red">Event</span></div>
                    <div className="mk-row"><span className="av av-3">GG</span><div style={{ flex: 1 }}><span className="rt">Girl Gang Runs</span><span className="rs">Mumbai · women-only · 60 members</span></div><span className="mini">Run club</span></div>
                  </div>
                </div>
                <div className="dpv" data-pv="2">
                  <div className="serp">
                    <div className="serp-bar"><i /><i /><i />{' '}google.com/search?q=run+clubs+in+noida</div>
                    <div className="serp-hit"><div className="u">endorfin.run › clubs › uprun</div><div className="t">UpRun Club — Noida · 42 members · Endorfin</div><span className="rs" style={{ color: 'var(--bone-55)' }}>Sunday crew in Noida since 2022. 8 runs a month, 312 km logged. See the next run, RSVP, and request to join.</span></div>
                  </div>
                  <span className="pill pill-lime" style={{ alignSelf: 'flex-start' }}><span className="dot" />Ranks #1</span>
                </div>
                <div className="dpv" data-pv="3">
                  <div className="city-card"><span className="city-ic" style={{ background: 'rgba(230,35,42,.18)' }}><svg viewBox="0 0 24 24" style={{ stroke: '#ff7a7e' }}><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1118 0z" /><circle cx="12" cy="10" r="3" /></svg></span><div style={{ flex: 1 }}><span className="rt">Run clubs in Delhi</span><span className="rs">28 verified clubs · updated weekly</span></div><span className="mini">Delhi</span></div>
                  <div className="city-card"><span className="city-ic" style={{ background: 'rgba(255,46,136,.16)' }}><svg viewBox="0 0 24 24" style={{ stroke: '#ff5fa2' }}><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1118 0z" /><circle cx="12" cy="10" r="3" /></svg></span><div style={{ flex: 1 }}><span className="rt">Run clubs in Mumbai</span><span className="rs">31 verified clubs · sea-link crews</span></div><span className="mini">Mumbai</span></div>
                  <div className="city-card"><span className="city-ic" style={{ background: 'rgba(139,92,246,.18)' }}><svg viewBox="0 0 24 24" style={{ stroke: '#c4b0fa' }}><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1118 0z" /><circle cx="12" cy="10" r="3" /></svg></span><div style={{ flex: 1 }}><span className="rt">Run clubs in Pune</span><span className="rs">14 verified clubs · hill repeats</span></div><span className="mini">Pune</span></div>
                </div>
                <div className="dpv" data-pv="4">
                  <div className="notif"><span className="src wa">WA</span><div style={{ flex: 1 }}>Sunrise loop tomorrow, 6:00 AM — see you there ☀️</div></div>
                  <div className="notif"><span className="src">PUSH</span><div style={{ flex: 1 }}>3 spots left for Saturday's 10K</div></div>
                </div>
                <div className="dpv" data-pv="5">
                  <div className="ad">
                    <div className="ad-top"><span className="av av-1" style={{ width: 24, height: 24, fontSize: 9 }}>UR</span><div style={{ flex: 1 }}><span className="rt" style={{ fontSize: 11.5 }}>uprun.club</span></div><span className="mini">Sponsored</span></div>
                    <div className="ad-img"><span>Sunrise 10K — Jun 14</span></div>
                    <div className="ad-cta"><div><span className="rt" style={{ fontSize: 12 }}>From ₹299 · 38 going</span></div><span className="mini mini-red">Get tickets</span></div>
                  </div>
                </div>
                <div className="dprog" aria-hidden="true"><i className="on" /><i /><i /><i /><i /></div>
              </div>
            </div>
            <div className="dsteps">
              <div className="dstep active" data-step="1"><span className="n">01</span><h3>Discovery feed</h3><p>Your club and its runs surface in the in-app discover search, in front of runners browsing for a crew.</p></div>
              <div className="dstep" data-step="2"><span className="n">02</span><h3>Found on Google</h3><p>An SEO-ready club page that ranks for "run clubs in [city]" — working for you 24/7.</p></div>
              <div className="dstep" data-step="3"><span className="n">03</span><h3>Curated city pages</h3><p>We feature your club in the city and event roundups we maintain and promote.</p></div>
              <div className="dstep" data-step="4"><span className="n">04</span><h3>Push &amp; reminders</h3><p>Members get a nudge on WhatsApp and push before every run, so more of them actually show up.</p></div>
              <div className="dstep" data-step="5"><span className="n">05</span><h3>Free ads for paid events</h3><p>Hosting a ticketed run? We run Instagram &amp; Google ads to fill it — on us, no ad spend from you.</p><span className="pill pill-purple">Paid events</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ④ PLATFORM ═══ */}
      <section className="plat">
        <span className="ghost" data-plx="0.05" aria-hidden="true">TOOLS</span>
        <div className="blob blob-orange" data-plx="-0.08" style={{ width: '36vw', height: '36vw', maxWidth: 520, maxHeight: 520, right: '-10%', top: '6%' }} aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow rv">Platform</span>
          <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>The tools to run it <em className="chroma-i">day to day.</em></h2>
          <p className="lead rv" style={{ transitionDelay: '.1s' }}>Tap a tool to preview it.</p>

          <div className="pf rv" style={{ transitionDelay: '.12s' }}>
            <input type="radio" name="pf" id="k1" defaultChecked />
            <input type="radio" name="pf" id="k7" />
            <input type="radio" name="pf" id="k2" />
            <input type="radio" name="pf" id="k3" />
            <input type="radio" name="pf" id="k4" />
            <input type="radio" name="pf" id="k5" />
            <input type="radio" name="pf" id="k6" />
            <div className="pf-rail">
              <label htmlFor="k1"><span className="ric" style={{ background: 'rgba(230,35,42,.3)' }}><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 10h18M10 10v11" /></svg></span><span className="rname">Your club page</span><span className="pill pill-lime"><span className="dot" />Live</span></label>
              <label htmlFor="k7"><span className="ric brand-ig"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="#fff" /></svg></span><span className="rname">Auto-import from Instagram</span><span className="pill pill-purple">Auto</span></label>
              <label htmlFor="k2"><span className="ric" style={{ background: 'rgba(255,107,53,.3)' }}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></span><span className="rname">Event hosting &amp; RSVPs</span><span className="pill pill-lime">Free</span></label>
              <label htmlFor="k3"><span className="ric" style={{ background: 'rgba(182,255,60,.22)' }}><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM21 21h-4" /></svg></span><span className="rname">QR check-in</span></label>
              <label htmlFor="k4"><span className="ric" style={{ background: 'rgba(139,92,246,.32)' }}><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 20l1.1-5.3A8.5 8.5 0 1121 11.5z" /></svg></span><span className="rname">In-app chat</span></label>
              <label htmlFor="k5"><span className="ric" style={{ background: 'rgba(37,211,102,.28)' }}><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg></span><span className="rname">SMS / WhatsApp notifications</span></label>
              <label htmlFor="k6"><span className="ric" style={{ background: 'rgba(255,46,136,.28)' }}><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></span><span className="rname">Member directory &amp; roles</span></label>
            </div>
            <div className="pf-panels">
              <div className="pf-panel q1">
                <h4>Your club page</h4>
                <p>A public, SEO-ready home for your club — stats, next run, and a clear join button.</p>
                <div className="pf-stage"><div className="mkbox">
                  <div className="mk-row"><span className="av av-1">UR</span><div style={{ flex: 1 }}><span className="rt">UpRun Club</span><span className="rs">Noida · Sunday crew · since 2022</span></div><span className="mini mini-red">Join</span></div>
                  <div className="mk-row" style={{ gap: 16 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}><b style={{ fontFamily: 'var(--f-ui)', fontSize: 17, color: '#fff' }}>42</b><span className="rs" style={{ textAlign: 'center' }}>members</span></div>
                    <div style={{ flex: 1, textAlign: 'center' }}><b style={{ fontFamily: 'var(--f-ui)', fontSize: 17, color: '#fff' }}>312</b><span className="rs" style={{ textAlign: 'center' }}>km / month</span></div>
                    <div style={{ flex: 1, textAlign: 'center' }}><b style={{ fontFamily: 'var(--f-ui)', fontSize: 17, color: '#fff' }}>8</b><span className="rs" style={{ textAlign: 'center' }}>runs / month</span></div>
                  </div>
                </div></div>
              </div>
              <div className="pf-panel q7">
                <h4>Auto-import from Instagram</h4>
                <p>Connect your handle and we read your next event right off your latest post — date, time, place — and build the event card for you.</p>
                <div className="pf-stage"><div className="mkbox">
                  <div className="mk-row"><span className="brand brand-ig" style={{ width: 28, height: 28 }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="#fff" /></svg></span><div style={{ flex: 1 }}><span className="rt">@uprun.club</span><span className="rs">"Sunday 6 AM · Sector 56 · 10K. Chai after 🍵"</span></div><span className="mini">IG post</span></div>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '.12em', color: 'rgba(255,255,255,.5)' }}>↓ AUTO-DETECTED</div>
                  <div className="mk-row" style={{ border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: 11 }}><span className="date-blk"><b>14</b><small>Jun</small></span><div style={{ flex: 1 }}><span className="rt">Sunrise Loop 10K</span><span className="rs">Sun · 6:00 AM · Sector 56</span></div><span className="mini mini-lime">Event ✓</span></div>
                </div></div>
              </div>
              <div className="pf-panel q2">
                <h4>Event hosting &amp; RSVPs</h4>
                <p>Free to host. Set a run or a ticketed event, members RSVP, headcount tracks itself.</p>
                <div className="pf-stage"><div className="mkbox">
                  <div className="mk-row"><span className="date-blk"><b>14</b><small>Jun</small></span><div style={{ flex: 1 }}><span className="rt">Sunrise Loop 10K</span><span className="rs">6:00 AM · Sector 56 · free</span></div><span className="mini mini-red">RSVP</span></div>
                  <div className="mk-row"><span className="av av-1">AK</span><span className="av av-2" style={{ marginLeft: -16 }}>SM</span><span className="av av-3" style={{ marginLeft: -16 }}>VI</span><span className="mini" style={{ marginLeft: 8 }}>+11 going</span></div>
                </div></div>
              </div>
              <div className="pf-panel q3">
                <h4>QR check-in</h4>
                <p>Scan members in at the start line. Live attendance, no clipboard.</p>
                <div className="pf-stage"><div className="mkbox mk-row" style={{ gap: 18, display: 'flex' }}>
                  <div className="qr" />
                  <div style={{ flex: 1, display: 'grid', gap: 10 }}>
                    <div className="mk-row"><span className="av av-1">AK</span><div style={{ flex: 1 }}><span className="rt">Aarav Kapoor</span><span className="rs">checked in · 6:02 AM</span></div><span className="mini mini-lime">In</span></div>
                    <div className="mk-row"><span className="av av-2">SM</span><div style={{ flex: 1 }}><span className="rt">Simran Mehta</span><span className="rs">checked in · 6:04 AM</span></div><span className="mini mini-lime">In</span></div>
                  </div>
                </div></div>
              </div>
              <div className="pf-panel q4">
                <h4>In-app chat</h4>
                <p>Talk to your club without handing out your number. Members-only threads.</p>
                <div className="pf-stage"><div className="mkbox" style={{ display: 'grid', gap: 10 }}>
                  <div className="bub">Sunday's run moves to 6:30 AM ☀️</div>
                  <div className="bub bub-me">Counted in! 5K or 10K?</div>
                  <div className="bub">Both — RSVP in the event card</div>
                </div></div>
              </div>
              <div className="pf-panel q5">
                <h4>SMS / WhatsApp notifications</h4>
                <p>Reach members where they actually read — automated reminders before every run and event.</p>
                <div className="pf-stage"><div style={{ width: '100%', maxWidth: 450, display: 'grid', gap: 11 }}>
                  <div className="notif"><span className="src wa">WA</span><div style={{ flex: 1 }}>Reminder: Sunrise loop tomorrow, 6:00 AM</div></div>
                  <div className="notif"><span className="src">SMS</span><div style={{ flex: 1 }}>Your spot for Sat 10K is confirmed ✓</div></div>
                </div></div>
              </div>
              <div className="pf-panel q6">
                <h4>Member directory &amp; roles</h4>
                <p>See every member, promote co-admins, manage who can post and approve.</p>
                <div className="pf-stage"><div className="mkbox">
                  <div className="mk-row"><span className="av av-1">AK</span><div style={{ flex: 1 }}><span className="rt">Aarav Kapoor</span><span className="rs">founder · joined 2022</span></div><span className="mini mini-red">Admin</span></div>
                  <div className="mk-row"><span className="av av-2">SM</span><div style={{ flex: 1 }}><span className="rt">Simran Mehta</span><span className="rs">joined Mar 2026</span></div><span className="mini">Member</span></div>
                  <div className="mk-row"><span className="av av-3">VI</span><div style={{ flex: 1 }}><span className="rt">Vikram Iyer</span><span className="rs">joined May 2026</span></div><span className="mini">Member</span></div>
                </div></div>
              </div>
            </div>
          </div>

          <h3 className="rv" style={{ fontSize: 21, marginTop: 60, position: 'relative', zIndex: 1 }}>Works with the tools you already use</h3>
          <div className="intg rv" style={{ transitionDelay: '.08s' }}>
            <div className="chip" title="Import existing responses"><span className="brand brand-forms"><svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg></span><span className="cname">Google Forms</span></div>
            <div className="chip" title="Invite your group, share your page"><span className="brand brand-wa"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 01-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1121 11.5z" /></svg></span><span className="cname">WhatsApp</span></div>
            <div className="chip" title="Auto-import your events"><span className="brand brand-ig"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="#fff" /></svg></span><span className="cname">Instagram</span></div>
            <div className="chip" title="Sync runs"><span className="brand brand-strava"><svg viewBox="0 0 24 24"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg></span><span className="cname">Strava</span></div>
          </div>
        </div>
      </section>

      {/* ═══ ⑤ COMPARISON ═══ */}
      <section style={{ paddingTop: 50 }}><div className="wrap">
        <span className="eyebrow rv">Comparison</span>
        <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>Why clubs move to <em className="chroma-i">Endorfin.</em></h2>
        <p className="lead rv" style={{ transitionDelay: '.1s' }}>Built for run clubs in India — not a generic ticketing marketplace or a chat thread.</p>

        <div className="cmpwrap rv" style={{ transitionDelay: '.12s' }}>
          <div className="cmp">
            <div className="cmp-spot" aria-hidden="true" />
            <div className="cmp-row cmp-head">
              <div className="feat">&nbsp;</div><div className="us-h">Endorfin</div><div>District</div><div>Luma</div><div>AroundU</div><div>WA + IG</div>
            </div>
            {([
              ['Membership & member management', 'us', 'no', 'dim', 'par', 'no'],
              ['Events & ticketing', 'us', 'dim', 'dim', 'dim', 'no'],
              ['QR code check-in', 'us', 'dim', 'dim', 'dim', 'no'],
              ['Chat, SMS & email built-in', 'us', 'no', 'par', 'par', 'par'],
              ['Social features (feed, profiles)', 'us', 'no', 'no', 'par', 'dim'],
              ['Free paid advertising (IG / Google)', 'us', 'par', 'no', 'no', 'no'],
              ['WhatsApp / Google Forms integration', 'us', 'no', 'no', 'no', 'nat'],
              ['Auto-imports events from Instagram', 'us', 'no', 'no', 'no', 'no'],
            ] as Array<[string, ...string[]]>).map(([feat, ...cells]) => (
              <div className="cmp-row" key={feat}>
                <div className="feat">{feat}</div>
                {cells.map((c, i) => (
                  <div key={i}>
                    {c === 'us' && <span className="ck ck-us"><Check /></span>}
                    {c === 'dim' && <span className="ck ck-dim"><Check /></span>}
                    {c === 'par' && <span className="par">partial</span>}
                    {c === 'nat' && <span className="nat">native</span>}
                    {c === 'no' && <span className="non">—</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="legend"><span style={{ color: 'var(--lime)' }}>●</span><span>full</span><span style={{ color: '#e0aa45' }}>●</span><span>partial / limited</span><span>—&nbsp;none</span></div>
      </div></section>

      {/* ═══ ⑥ MIGRATION ═══ */}
      <section className="mig" style={{ paddingTop: 50 }}>
        <span className="ghost" data-plx="0.06" aria-hidden="true">MOVE</span>
        <div className="wrap">
          <span className="eyebrow rv">Migration</span>
          <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>Already running a club?<br />Moving in takes <em className="chroma-i">minutes.</em></h2>
          <div className="steps">
            <div className="step rv"><span className="n">1</span><h3>Send your details</h3><p>Club name, city, schedule — we may already have them.</p></div>
            <div className="step rv" style={{ transitionDelay: '.08s' }}><span className="n">2</span><h3>We set up your page</h3><p>Page built and your next event auto-pulled from your Instagram — no re-typing.</p></div>
            <div className="step rv" style={{ transitionDelay: '.16s' }}><span className="n">3</span><h3>Invite your members</h3><p>Share the link on WhatsApp / Instagram — done.</p></div>
          </div>
        </div>
      </section>

      {/* ═══ ⑦ PRICING ═══ */}
      <section><div className="wrap">
        <div className="price-panel rv">
          <div className="price-kick">Pricing</div>
          <h2 className="price-mega">It's <em>free.</em></h2>
          <p className="price-sub">For clubs, forever. No monthly fee. No per-run fee. No fee to host events.</p>
          <div className="price-cols">
            <div><h3>Why free</h3><p>Clubs are the heartbeat of running in India. Charging founders to organise their own community would be backwards.</p></div>
            <div><h3>How we earn</h3><p>Through event ticketing and brand partners — not by taxing communities.</p></div>
            <div><h3>What you commit</h3><p>Just keep the page alive and show up to the run. No contract, no exclusivity.</p></div>
          </div>
          <Link href="/clubs" className="btn btn-ghost">Add your club</Link>
        </div>
      </div></section>

      {/* ═══ ⑧ FAQ ═══ */}
      <section style={{ paddingTop: 30 }}><div className="wrap">
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <span className="eyebrow rv" style={{ justifyContent: 'center' }}>FAQ</span>
          <h2 className="h-sect rv" style={{ transitionDelay: '.05s' }}>Questions, <em className="chroma-i">answered.</em></h2>
        </div>
        <div className="faq rv" style={{ transitionDelay: '.1s' }}>
          <details open><summary><span className="qn">01</span>Is it really free?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>Yes. There's no fee for clubs to list, host runs, or manage members. We earn from event ticketing and partners.</p></div></details>
          <details><summary><span className="qn">02</span>What does hosting an event cost?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>Hosting is free. For ticketed events, standard payment processing applies — and we run free Instagram &amp; Google ads to help fill it.</p></div></details>
          <details><summary><span className="qn">03</span>Do I have to share my phone number?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>No. Members reach you through in-app chat. Your number stays private.</p></div></details>
          <details><summary><span className="qn">04</span>How do members find my club?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>Your page ranks on Google, shows in the in-app discover feed, and gets featured in city roundups.</p></div></details>
          <details><summary><span className="qn">05</span>Can you set the page up for me?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>Yes — our concierge option imports your last runs, pulls your next event from Instagram, and hands you the keys. Free, limited slots.</p></div></details>
          <details><summary><span className="qn">06</span>What kinds of clubs is this for?<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></summary>
            <div className="ans"><p>Any run club in India — training groups, weekend crews, beginner pods, women-only clubs.</p></div></details>
        </div>
      </div></section>

      {/* ═══ MARQUEE 2 ═══ */}
      <div className="marq marq-line" aria-hidden="true"><div className="marq-in">
        <div><span>Delhi</span><Star /><span>Mumbai</span><Star /><span>Bengaluru</span><Star /><span>Pune</span><Star /><span>Noida</span><Star /><span>Hyderabad</span><Star /></div>
        <div><span>Delhi</span><Star /><span>Mumbai</span><Star /><span>Bengaluru</span><Star /><span>Pune</span><Star /><span>Noida</span><Star /><span>Hyderabad</span><Star /></div>
      </div></div>

      {/* ═══ ⑨ CTA ═══ */}
      <section className="cta" id="cta">
        <span className="ghost" aria-hidden="true">ENDORFIN</span>
        <div className="blob blob-red" data-plx="0.12" style={{ width: '46vw', height: '46vw', maxWidth: 640, maxHeight: 640, right: '-12%', top: '-26%' }} aria-hidden="true" />
        <div className="blob blob-purple" data-plx="-0.1" style={{ width: '44vw', height: '44vw', maxWidth: 600, maxHeight: 600, left: '-12%', bottom: '-30%' }} aria-hidden="true" />
        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <span className="eyebrow rv" style={{ justifyContent: 'center' }}>Get started</span>
          <h2 className="rv" style={{ transitionDelay: '.05s', marginTop: 18 }}>Put your club<br />on <span className="chroma-i">the map.</span></h2>
          <p className="lead rv" style={{ transitionDelay: '.1s' }}>Add it in a minute, or let us set it up for you.</p>
          <div className="hero-ctas rv" style={{ transitionDelay: '.15s' }}>
            <Link href="/clubs" className="btn btn-red">Add your club</Link>
            <a href="mailto:hello@endorfin.run" className="btn btn-ghost">Talk to us</a>
          </div>
        </div>
      </section>
    </main>
  );
}
