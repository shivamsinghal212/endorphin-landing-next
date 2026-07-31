'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AdminApiError } from '@/lib/admin-api';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  type DayInput,
  type ProgramInput,
  type ProgramStatus,
  type Section,
  type Discipline,
  type WorkoutInput,
  archiveWorkout,
  createProgram,
  createWorkout,
  deleteDay,
  deleteProgram,
  generateBlock,
  getAthlete,
  getCoverage,
  getProgram,
  getWorkout,
  listExercises,
  listGenerations,
  listPrograms,
  listWorkoutVersions,
  listWorkouts,
  patchProgram,
  publishDays,
  saveDay,
  saveWorkoutVersion,
  searchAthletes,
} from '@/lib/coach-api';
import { coachKeys } from './keys';

/** Unwrap FastAPI's `{detail: "..."}` so a toast shows the sentence the backend
 *  wrote rather than a raw JSON blob. */
export function describeError(e: unknown): string {
  if (e instanceof AdminApiError) {
    try {
      const parsed = JSON.parse(e.message);
      if (typeof parsed?.detail === 'string') return parsed.detail;
      if (Array.isArray(parsed?.detail)) {
        // Pydantic validation errors
        return parsed.detail
          .map((d: { loc?: string[]; msg?: string }) =>
            `${(d.loc ?? []).slice(1).join('.')}: ${d.msg}`)
          .join('; ');
      }
    } catch {
      /* not JSON — fall through */
    }
    return e.message || `Request failed (${e.status})`;
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** Every hook needs the backend JWT and is useless without it. */
function useToken(): string {
  return useAdminToken() ?? '';
}

// ── Library ────────────────────────────────────────────────────────────────

export function useExercises(params: Parameters<typeof listExercises>[1] = {}) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.exercises(params),
    queryFn: () => listExercises(token, params),
    enabled: Boolean(token),
    // The library barely changes within a session; don't refetch on every mount.
    staleTime: 10 * 60 * 1000,
  });
}

export function useWorkouts(
  params: { section?: Section; discipline?: Discipline; search?: string } = {},
) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.workouts(params),
    queryFn: () => listWorkouts(token, params),
    enabled: Boolean(token),
    staleTime: 10 * 60 * 1000,
  });
}

export function useWorkout(id: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.workout(id ?? 0),
    queryFn: () => getWorkout(token, id!),
    enabled: Boolean(token && id),
  });
}

export function useWorkoutVersions(id: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.workoutVersions(id ?? 0),
    queryFn: () => listWorkoutVersions(token, id!),
    enabled: Boolean(token && id),
  });
}

export function useCreateWorkout() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkoutInput) => createWorkout(token, body),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ['coach', 'workouts'] });
      toast.success(`"${w.name}" added to the library`);
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

/** Saving an edit creates a new version — the old one is kept. */
export function useSaveWorkoutVersion(id: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WorkoutInput) => saveWorkoutVersion(token, id, body),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ['coach', 'workouts'] });
      qc.invalidateQueries({ queryKey: coachKeys.workoutVersions(id) });
      toast.success(`Saved as version ${w.version}. Version ${w.version - 1} is kept.`);
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

export function useArchiveWorkout() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      archiveWorkout(token, id, archived),
    onSuccess: (_, { archived }) => {
      qc.invalidateQueries({ queryKey: ['coach', 'workouts'] });
      toast.success(archived ? 'Retired from the pickers' : 'Back in the pickers');
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

// ── Plans ──────────────────────────────────────────────────────────────────

export function usePrograms(status?: string) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.programs(status),
    queryFn: () => listPrograms(token, { status }),
    enabled: Boolean(token),
  });
}

export function useProgram(id: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.program(id ?? 0),
    queryFn: () => getProgram(token, id!),
    enabled: Boolean(token && id),
  });
}

export function useCoverage(id: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.coverage(id ?? 0),
    queryFn: () => getCoverage(token, id!),
    enabled: Boolean(token && id),
  });
}

export function useGenerations(id: number | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.generations(id ?? 0),
    queryFn: () => listGenerations(token, id!),
    enabled: Boolean(token && id),
  });
}

export function useCreateProgram() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProgramInput) => createProgram(token, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'programs'] }),
    onError: (e) => toast.error(describeError(e)),
  });
}

export function usePatchProgram(id: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof patchProgram>[2]) =>
      patchProgram(token, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachKeys.program(id) });
      qc.invalidateQueries({ queryKey: ['coach', 'programs'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

/** Delete a plan. 409 when the athlete has logged against it — the toast then
 *  carries the backend's sentence, which names abandoning as the way out. */
export function useDeleteProgram() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProgram(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach', 'programs'] });
      toast.success('Plan deleted');
    },
    onError: (e) => toast.error(describeError(e), { duration: 8000 }),
  });
}

export function useSaveDay(programId: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DayInput) => saveDay(token, programId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachKeys.program(programId) });
      qc.invalidateQueries({ queryKey: coachKeys.coverage(programId) });
      toast.success('Day saved');
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

export function useDeleteDay(programId: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayId: number) => deleteDay(token, programId, dayId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coachKeys.program(programId) });
      toast.success('Day cleared');
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

export function usePublishDays(programId: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromDate, toDate }: { fromDate: string; toDate: string }) =>
      publishDays(token, programId, fromDate, toDate),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: coachKeys.program(programId) });
      toast.success(
        r.published
          ? `${r.published} day${r.published === 1 ? '' : 's'} now visible to the athlete`
          : 'Nothing new to publish',
      );
    },
    onError: (e) => toast.error(describeError(e)),
  });
}

/** The assembler. Slow — around a minute — so the caller must show progress. */
export function useGenerateBlock(programId: number) {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateBlock(token, programId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: coachKeys.program(programId) });
      qc.invalidateQueries({ queryKey: coachKeys.coverage(programId) });
      qc.invalidateQueries({ queryKey: coachKeys.generations(programId) });
      toast.success(`${r.daysWritten} draft days added — ${r.phase} phase`);
    },
    onError: (e) =>
      toast.error(describeError(e), {
        description: 'Nothing was saved. Try again or adjust the plan.',
        duration: 10000,
      }),
  });
}

// ── Athletes ───────────────────────────────────────────────────────────────

export function useAthleteSearch(q: string) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.athleteSearch(q),
    queryFn: () => searchAthletes(token, q),
    enabled: Boolean(token) && q.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useAthlete(userId: string | null) {
  const token = useToken();
  return useQuery({
    queryKey: coachKeys.athlete(userId ?? ''),
    queryFn: async () => {
      const r = await getAthlete(token, userId!);
      return r.user ?? r;
    },
    enabled: Boolean(token && userId),
    staleTime: 10 * 60 * 1000,
  });
}
