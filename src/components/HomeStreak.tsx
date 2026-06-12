'use client';

import { useEffect } from 'react';
import './home-refresh.css';

/**
 * Glowing scroll-drawn streak for the homepage — same mechanic as the
 * /for-clubs page. Renders an absolutely-positioned SVG inside the
 * nearest `.hstreak` host; the path weaves through the sections and is
 * drawn as you scroll (tip locked ~58% down the viewport via arc-length
 * sampling, so it never races ahead on the horizontal swings).
 */
export default function HomeStreak() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.hstreak');
    const streakWrap = document.getElementById('homeStreakWrap');
    if (!root || !streakWrap) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NS = 'http://www.w3.org/2000/svg';
    let core: SVGPathElement | null = null;
    let glow: SVGPathElement | null = null;
    let built = false;
    let samples: Array<[number, number]> = [];

    const build = () => {
      const rootRect = root.getBoundingClientRect();
      const localH = root.scrollHeight;
      const w = root.clientWidth;
      const vh = window.innerHeight;
      streakWrap.style.height = `${localH}px`;
      streakWrap.innerHTML = '';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${localH}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.height = `${localH}px`;

      const lo = w < 720 ? 0.18 : 0.12;
      const hi = 1 - lo;
      // tighter gap + per-section mid-bends so tall mobile sections still weave
      const MIN_GAP = Math.max(340, vh * 0.5);
      const localTop = (el: HTMLElement) => el.getBoundingClientRect().top - rootRect.top;

      // Start at the top so the at-rest line is one continuous streak (not a
      // floating segment), then route it down THROUGH the hero search bar so
      // it threads behind it.
      const pts: Array<[number, number]> = [[w * hi, 40]];
      const searchEl = root.querySelector<HTMLElement>('.v1-hero-search') || root.querySelector<HTMLElement>('.v1-hero-search-trigger');
      if (searchEl) {
        const r = searchEl.getBoundingClientRect();
        pts.push([r.left - rootRect.left + r.width * 0.5, r.top - rootRect.top + r.height * 0.5]);
      }
      let flip = 0;
      const addPt = (y: number) => {
        if (pts.length && y - pts[pts.length - 1][1] < MIN_GAP) return;
        pts.push([flip++ % 2 === 0 ? w * lo : w * hi, y]);
      };
      const anchors = Array.from(root.querySelectorAll<HTMLElement>('section, header'));
      anchors.forEach((s) => {
        const top = localTop(s);
        const h = s.getBoundingClientRect().height;
        addPt(top + h * 0.45);
        if (h > vh * 1.0) addPt(top + h * 0.8);
      });
      if (localH - 100 - pts[pts.length - 1][1] > 340) pts.push([w * 0.5, localH - 90]);

      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const dy = (p1[1] - p0[1]) * 0.55;
        d += ` C${p0[0]},${p0[1] + dy} ${p1[0]},${p1[1] - dy} ${p1[0]},${p1[1]}`;
      }

      const defs = document.createElementNS(NS, 'defs');
      const grad = document.createElementNS(NS, 'linearGradient');
      grad.setAttribute('id', 'homeSgrad');
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
      // Tip is driven directly by scroll depth: 0 at the very top (nothing
      // drawn until the user starts scrolling), leading ahead as they go.
      const localTipY = window.scrollY * 1.5;
      const p = Math.min(1, Math.max(0, fracAtY(localTipY)));
      const off = String(1 - p);
      core.style.strokeDashoffset = off;
      glow.style.strokeDashoffset = off;
    };

    let sTick = false;
    const onScroll = () => {
      if (!sTick) { sTick = true; requestAnimationFrame(() => { sTick = false; draw(); }); }
    };
    let rT: number | undefined;
    const onResize = () => { window.clearTimeout(rT); rT = window.setTimeout(build, 200); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    const raf = requestAnimationFrame(build);
    const onLoad = () => build();
    window.addEventListener('load', onLoad);

    // Rebuild when the page height changes without a window resize — e.g. the
    // search panel expanding into results, or async event/club content loading.
    // (streakWrap is absolutely positioned so re-sizing it can't feed back
    // into the host's height — no observer loop.)
    let lastH = root.scrollHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(root.scrollHeight - lastH) < 4) return;
      lastH = root.scrollHeight;
      window.clearTimeout(rT);
      rT = window.setTimeout(build, 150);
    });
    ro.observe(root);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      window.clearTimeout(rT);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <div id="homeStreakWrap" aria-hidden="true" />;
}
