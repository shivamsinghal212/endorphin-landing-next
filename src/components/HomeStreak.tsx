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
    let tipGlow: SVGCircleElement | null = null;
    let tipCore: SVGCircleElement | null = null;
    let pathTotal = 0;
    let built = false;
    let samples: Array<[number, number]> = [];
    let hostTopDoc = 0;
    let startY = 0;
    let endY = 1;
    let lastSecTop = 0;

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
      lastSecTop = anchors.length ? localTop(anchors[anchors.length - 1]) : localH - vh;
      // Exit off the bottom edge (clipped by the wrap's overflow:hidden) so the
      // streak ends with a clean exit instead of a glowing cap floating in space.
      pts.push([w * 0.5, localH + 80]);

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

      // Glowing tip that rides the leading (drawn) end of the streak: a soft
      // colour halo (sampling the gradient so it matches the local hue) plus a
      // white-hot centre. Hidden until the streak starts drawing.
      tipGlow = document.createElementNS(NS, 'circle');
      tipGlow.setAttribute('class', 'streak-tip-glow');
      tipGlow.setAttribute('r', '15');
      tipCore = document.createElementNS(NS, 'circle');
      tipCore.setAttribute('class', 'streak-tip-core');
      tipCore.setAttribute('r', '3.5');
      [tipGlow, tipCore].forEach((c) => { c.style.opacity = '0'; svg.appendChild(c); });

      streakWrap.appendChild(svg);

      samples = [];
      const total = core.getTotalLength();
      pathTotal = total;
      const N = 240;
      for (let k = 0; k <= N; k++) {
        const pt = core.getPointAtLength((total * k) / N);
        samples.push([pt.y, k / N]);
      }
      startY = samples[0][0];
      endY = samples[samples.length - 1][0];
      hostTopDoc = rootRect.top + window.scrollY;
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
      // Progress: 0 at the very top (nothing drawn until the user scrolls),
      // reaching 1 as the last section (CTA) scrolls into view — so by the
      // time the CTA is on screen the streak is fully drawn and exiting the
      // bottom edge, never a tip floating mid-section.
      const endScroll = Math.max(1, hostTopDoc + lastSecTop - window.innerHeight * 0.4);
      const prog = Math.min(1, Math.max(0, window.scrollY / endScroll));
      const targetY = startY + prog * (endY - startY);
      const p = Math.min(1, Math.max(0, fracAtY(targetY)));
      const off = String(1 - p);
      core.style.strokeDashoffset = off;
      glow.style.strokeDashoffset = off;
      // Park the glowing tip on the leading end; fade it out before the very
      // top (nothing drawn yet) and as the streak exits off the bottom edge.
      if (tipGlow && tipCore) {
        if (p <= 0.003 || p >= 0.99) {
          tipGlow.style.opacity = '0';
          tipCore.style.opacity = '0';
        } else {
          const pt = core.getPointAtLength(p * pathTotal);
          const cx = String(pt.x);
          const cy = String(pt.y);
          tipGlow.setAttribute('cx', cx);
          tipGlow.setAttribute('cy', cy);
          tipCore.setAttribute('cx', cx);
          tipCore.setAttribute('cy', cy);
          tipGlow.style.opacity = '0.9';
          tipCore.style.opacity = '1';
        }
      }
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
