/**
 * Single source of truth for an event's public URL path.
 *
 * One prefix now. Events used to split across /running-events and
 * /experiences by category, with a rewrite making both resolve; the two
 * indexes have since merged into /running-events, and /experiences 301s
 * there, so a second prefix would only create a redirect hop.
 *
 *   eventPath(ev)              -> "/running-events/monsoon-10k"
 *   eventPath(ev, '/register') -> "/running-events/sunset-yoga/register"
 */
export function eventPath(
  ev: { category?: string | null; slug?: string | null; id: string },
  sub = '',
): string {
  return `/running-events/${ev.slug || ev.id}${sub}`;
}
