/**
 * Single source of truth for an event's public URL path.
 *
 * Running events live under `/running-events/{slug}`; non-running
 * "experience" events (yoga, workshops, socials) live under
 * `/experiences/{slug}`. A Next.js rewrite (see next.config.ts) serves
 * both prefixes from the same `running-events` route tree, so the only
 * thing that varies is the prefix we render in links + canonical/SEO.
 *
 *   eventPath(ev)              -> "/running-events/monsoon-10k"
 *   eventPath(ev, '/register') -> "/experiences/sunset-yoga/register"
 */
export function eventPath(
  ev: { category?: string | null; slug?: string | null; id: string },
  sub = '',
): string {
  const base = ev.category === 'experience' ? '/experiences' : '/running-events';
  return `${base}/${ev.slug || ev.id}${sub}`;
}
