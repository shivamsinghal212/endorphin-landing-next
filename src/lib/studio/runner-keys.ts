/** React Query keys for the runner surface (registrations, my events). */
export const runnerKeys = {
  me: () => ['runner', 'me'] as const,
  myRegistrations: () => ['runner', 'my-registrations'] as const,
  registration: (id: string) => ['runner', 'registration', id] as const,
  booking: (id: string) => ['runner', 'booking', id] as const,
};
