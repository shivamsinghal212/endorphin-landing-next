/** React Query keys for the owner Studio surface. Centralised so mutations
 *  can invalidate without typos. */
export const studioKeys = {
  myClubs: (role: 'admin' | 'all' = 'admin') => ['studio', 'my-clubs', role] as const,
  club: (slug: string) => ['studio', 'club', slug] as const,
  membership: (slug: string) => ['studio', 'membership', slug] as const,
  members: (slug: string) => ['studio', 'members', slug] as const,
  joinRequests: (slug: string, status: string) =>
    ['studio', 'join-requests', slug, status] as const,
  events: (slug: string) => ['studio', 'events', slug] as const,
  event: (slug: string, eventId: string) => ['studio', 'event', slug, eventId] as const,
  rsvps: (slug: string, eventId: string) => ['studio', 'rsvps', slug, eventId] as const,
  rsvpSummary: (slug: string) => ['studio', 'rsvp-summary', slug] as const,
};
