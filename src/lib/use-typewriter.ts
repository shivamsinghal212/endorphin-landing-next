'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_FULL_MS = 1900;
const HOLD_EMPTY_MS = 400;

/**
 * Cycles through `phrases` with a typewriter effect: type, hold, delete,
 * next. SSR/first render returns the first phrase fully typed (no hydration
 * mismatch, sane no-JS fallback); the cycle starts client-side after mount.
 * Honors prefers-reduced-motion by staying static on the first phrase.
 *
 * `phrases` must be referentially stable (module-level const or useMemo) —
 * a fresh array every render restarts the animation.
 */
export function useTypewriter(phrases: readonly string[] | null, paused = false): string {
  const [text, setText] = useState(phrases?.[0] ?? '');

  useEffect(() => {
    if (!phrases || phrases.length === 0 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let phraseIdx = 0;
    let charIdx = phrases[0].length;
    let deleting = true;
    let t: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = phrases[phraseIdx];
      if (deleting) {
        charIdx -= 1;
        setText(phrase.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          t = setTimeout(tick, HOLD_EMPTY_MS);
        } else {
          t = setTimeout(tick, DELETE_MS);
        }
      } else {
        charIdx += 1;
        setText(phrase.slice(0, charIdx));
        t = setTimeout(tick, charIdx >= phrase.length ? HOLD_FULL_MS : TYPE_MS);
        if (charIdx >= phrase.length) deleting = true;
      }
    };

    // Restart cleanly from the first phrase whenever we unpause.
    setText(phrases[0]);
    t = setTimeout(tick, HOLD_FULL_MS);
    return () => clearTimeout(t);
  }, [phrases, paused]);

  return text;
}
