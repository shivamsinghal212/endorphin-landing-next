import type { ApiEvent } from '@/app/running-events/page';

/**
 * The only race fields a rendered card needs.
 *
 * RaceCard is a client component, so every property handed to it is
 * serialised into the RSC flight payload for hydration — on top of the SSR
 * markup, and JSON-escaped inside HTML, so each byte of prop data costs
 * roughly two on the wire.
 *
 * Passing whole ApiEvent objects made /running-events a 3.8 MB document,
 * 84% of it a payload the page never rendered: `description` (159 KB),
 * `topComments` — scraped Instagram usernames, comment text and signed
 * profile-photo URLs, 206 KB of `userPictureUrl` alone — plus `recap`,
 * `sponsorsSeen`, `maxParticipants`, `inclusions`, `registrationUrl`,
 * `locationAddress` and more.
 *
 * Keep this type minimal. Anything added here ships to every visitor for
 * every one of ~250 races.
 */
export interface RaceCardData {
  id: string;
  slug?: string;
  /** Read by eventPath(). */
  category?: string;
  title: string;
  imageUrl?: string;
  startTime: string;
  locationName?: string;
  priceMin?: number;
  distanceCategories?: Array<{ categoryName?: string }>;
}

/** Narrow a full API event down to what the card renders. */
export function toRaceCardData(r: ApiEvent): RaceCardData {
  return {
    id: r.id,
    slug: r.slug,
    category: r.category,
    title: r.title,
    imageUrl: r.imageUrl,
    startTime: r.startTime,
    locationName: r.locationName,
    priceMin: r.priceMin,
    distanceCategories: r.distanceCategories?.map((c) => ({ categoryName: c.categoryName })),
  };
}
