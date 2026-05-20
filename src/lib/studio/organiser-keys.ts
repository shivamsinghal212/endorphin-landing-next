/** React Query keys for the organiser surface. */
export const organiserKeys = {
  me: () => ['organiser', 'me'] as const,
  events: (status?: string) => ['organiser', 'events', status ?? 'all'] as const,
  event: (eventId: string) => ['organiser', 'event', eventId] as const,
  stats: (eventId: string) => ['organiser', 'stats', eventId] as const,
  registrations: (eventId: string, filtersHash: string) =>
    ['organiser', 'registrations', eventId, filtersHash] as const,
  coupons: (eventId: string) => ['organiser', 'coupons', eventId] as const,
};
