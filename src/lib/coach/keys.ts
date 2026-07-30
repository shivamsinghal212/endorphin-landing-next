/** React Query keys for the Coach surface. Centralised so mutations can
 *  invalidate without typos. Mirrors the shape of `lib/studio/keys.ts`. */
export const coachKeys = {
  all: ['coach'] as const,

  programs: (status?: string) => ['coach', 'programs', status ?? 'any'] as const,
  program: (id: number) => ['coach', 'program', id] as const,
  coverage: (id: number) => ['coach', 'coverage', id] as const,
  generations: (id: number) => ['coach', 'generations', id] as const,

  workouts: (params?: Record<string, unknown>) =>
    ['coach', 'workouts', params ?? {}] as const,
  workout: (id: number) => ['coach', 'workout', id] as const,
  workoutVersions: (id: number) => ['coach', 'workout-versions', id] as const,

  exercises: (params?: Record<string, unknown>) =>
    ['coach', 'exercises', params ?? {}] as const,

  athleteSearch: (q: string) => ['coach', 'athlete-search', q] as const,
  athlete: (userId: string) => ['coach', 'athlete', userId] as const,
};
