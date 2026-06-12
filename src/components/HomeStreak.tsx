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
      const localH = root.scrollHeight;
      const w = root.clientWidth;
      streakWrap.style.height = `${localH}px`;
      streakWrap.innerHTML = '';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${localH}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.height = `${localH}px`;

      const anchors = Array.from(root.querySelectorAll<HTMLElement>('section, header'));
      const lo = w < 720 ? 0.2 : 0.12;
      const hi = 1 - lo;
      const MIN_GAP = Math.max(520, window.innerHeight * 0.7);
      const pts: Array<[number, number]> = [[w * hi, 60]];
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
      if (localH - 120 - pts[pts.length - 1][1] > 420) pts.push([w * 0.5, localH - 100]);

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
      const mainTop = root.getBoundingClientRect().top + window.scrollY;
      const localTipY = window.scrollY + window.innerHeight * 0.58 - mainTop;
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

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      window.clearTimeout(rT);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div id="homeStreakWrap" aria-hidden="true" />;
}
