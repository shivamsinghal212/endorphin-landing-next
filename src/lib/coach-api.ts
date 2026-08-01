/** Coach API — training plans, the workout library, and the AI assembler.
 *
 *  Mirrors `app/schemas/training.py` in EndorphinBackend. Every path here sits
 *  under `/api/v1/admin/training`, so it is gated by the same super-admin email
 *  whitelist as the rest of `/admin`.
 *
 *  Follows the `adminFetch` shape in `admin-api.ts`: token passed explicitly,
 *  `AdminApiError` on non-2xx so `describeError()` can unwrap FastAPI's
 *  `{detail: "..."}`.
 */
import { AdminApiError } from './admin-api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

async function coachFetch<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/admin/training${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new AdminApiError(res.status, await res.text());
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Athlete lookup reuses the plain admin surface, not the training prefix. */
async function adminFetch<T = unknown>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new AdminApiError(res.status, await res.text());
  return res.json();
}

// ── Vocabulary ─────────────────────────────────────────────────────────────

export type Section = 'warmup' | 'main' | 'finisher' | 'cooldown' | 'test';
export type Discipline = 'run' | 'strength' | 'hyrox' | 'functional' | 'mobility';
export type Level = 'beginner' | 'intermediate' | 'rx';
export type DayRole = 'strength' | 'run' | 'long' | 'hybrid' | 'test' | 'rest';
export type FeltEffort = 'easy' | 'medium' | 'hard';
export type ProgramStatus =
  | 'draft' | 'published' | 'rejected' | 'completed' | 'abandoned';
export type ScoreType =
  | 'amrap' | 'emom' | 'tabata' | 'for-time' | 'for-load'
  | 'for-quality' | 'intervals' | 'for-distance';
export type QuantityUnit =
  | 'm' | 'km' | 'number' | 'kg' | 'seconds' | 'minutes' | 'percent' | 'calories';

/** Plain English for everything the API names in its own vocabulary. The coach
 *  never sees an enum value. */
export const DAY_ROLE_LABEL: Record<DayRole, string> = {
  strength: 'Gym day',
  run: 'Run day',
  long: 'Long day',
  hybrid: 'Mixed day',
  test: 'Test day',
  rest: 'Rest day',
};

export const SECTION_LABEL: Record<Section, string> = {
  warmup: 'Warm-up',
  main: 'Main workout',
  finisher: 'Finisher',
  cooldown: 'Cool down',
  test: 'Test',
};

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  hyrox: 'Race station',
  run: 'Running',
  strength: 'Strength',
  functional: 'Conditioning',
  mobility: 'Mobility',
};

export const GOAL_LABEL: Record<'hyrox' | 'run' | 'strength', string> = {
  hyrox: 'HYROX',
  run: 'Running',
  strength: 'Strength',
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  rx: 'Advanced',
};

export const UNIT_LABEL: Record<QuantityUnit, string> = {
  m: 'metres',
  km: 'km',
  number: 'reps',
  kg: 'kg',
  seconds: 'seconds',
  minutes: 'minutes',
  percent: '% incline',
  calories: 'calories',
};

export const SCORE_LABEL: Record<ScoreType, string> = {
  'for-load': 'Sets and reps',
  'for-time': 'For time',
  amrap: 'As many rounds as possible',
  emom: 'Every minute',
  intervals: 'Intervals',
  tabata: 'Tabata',
  'for-distance': 'For distance',
  'for-quality': 'Quality — no score',
};

/** Which score types take a round count. Mirrors ROUND_SCORES in the backend. */
export const ROUND_SCORED: ScoreType[] = [
  'amrap', 'emom', 'for-time', 'intervals', 'tabata',
];

/** The 8 race stations by name, for coverage reporting. */
export const STATION_NAME: Record<number, string> = {
  1: 'SkiErg', 2: 'Sled push', 3: 'Sled pull', 4: 'Burpee broad jump',
  5: 'Row', 6: 'Farmers carry', 7: 'Sandbag lunge', 8: 'Wall balls',
};

/** Equipment the coach ticks, in words. Ordered by how likely an athlete is to
 *  have it, so the common kit is reachable without scrolling on a phone. */
export const EQUIPMENT: { slug: string; label: string; rare?: boolean }[] = [
  { slug: 'mat', label: 'Yoga mat' },
  { slug: 'chair', label: 'Chair' },
  { slug: 'wall', label: 'Wall' },
  { slug: 'bands', label: 'Resistance bands' },
  { slug: 'backpack', label: 'Loaded backpack' },
  { slug: 'treadmill', label: 'Treadmill' },
  { slug: 'bench', label: 'Bench' },
  { slug: 'dumbbells', label: 'Dumbbells' },
  { slug: 'kettlebells', label: 'Kettlebells' },
  { slug: 'barbell', label: 'Barbell & plates' },
  { slug: 'box', label: 'Plyo box' },
  { slug: 'pull-up-bar', label: 'Pull-up bar' },
  { slug: 'jump-rope', label: 'Jump rope' },
  { slug: 'leg-press-machine', label: 'Leg press' },
  { slug: 'lat-pulldown-machine', label: 'Lat pulldown' },
  { slug: 'chest-press-machine', label: 'Chest press' },
  { slug: 'shoulder-press-machine', label: 'Shoulder press' },
  { slug: 'cable-machine', label: 'Cable machine' },
  { slug: 'leg-curl-machine', label: 'Leg curl' },
  { slug: 'leg-extension-machine', label: 'Leg extension' },
  { slug: 'medicine-ball', label: 'Medicine ball', rare: true },
  { slug: 'rower', label: 'Rowing machine', rare: true },
  { slug: 'skierg', label: 'SkiErg', rare: true },
  { slug: 'sled', label: 'Sled', rare: true },
  { slug: 'rope', label: 'Rope', rare: true },
  { slug: 'sandbag', label: 'Sandbag', rare: true },
  { slug: 'air-bike', label: 'Air bike', rare: true },
  { slug: 'rings', label: 'Gymnastic rings', rare: true },
  { slug: 'dip-bars', label: 'Dip bars', rare: true },
];

/** The three profiles the first cohort actually falls into. One tap instead of
 *  ticking eight boxes — and the boxes stay available behind "Customise". */
export const KIT_PRESETS: { id: string; label: string; hint: string; kit: string[] }[] = [
  {
    id: 'apartment',
    label: 'Apartment gym',
    hint: 'Barbell, dumbbells, bench, treadmill',
    kit: ['mat', 'chair', 'wall', 'bands', 'backpack', 'treadmill', 'bench',
          'dumbbells', 'barbell'],
  },
  {
    id: 'commercial',
    label: 'Commercial gym',
    hint: 'Machines, full free weights, ergs',
    kit: ['mat', 'chair', 'wall', 'bands', 'backpack', 'treadmill', 'bench',
          'dumbbells', 'kettlebells', 'barbell', 'box', 'pull-up-bar',
          'jump-rope', 'leg-press-machine', 'lat-pulldown-machine',
          'chest-press-machine', 'shoulder-press-machine', 'cable-machine',
          'leg-curl-machine', 'leg-extension-machine', 'rower', 'medicine-ball'],
  },
  {
    id: 'home',
    label: 'Home only',
    hint: 'Bodyweight, bands, a backpack',
    kit: ['mat', 'chair', 'wall', 'bands', 'backpack'],
  },
];

// ── Library ────────────────────────────────────────────────────────────────

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  quantityUnits: QuantityUnit[];
  quantity2Units: QuantityUnit[];
  equipment: string[];
  substituteIds: number[];
  tags: string[];
  focusAreas: string[];
  modality: string | null;
  impactLevel: 'low' | 'medium' | 'high';
  beginnerSafe: boolean;
  hyroxStation: number | null;
  difficulty: number | null;
}

export interface WorkoutItem {
  id: number;
  exerciseId: number;
  exerciseSlug: string;
  exerciseName: string;
  blockIndex: number;
  blockRepeat: number | null;
  position: number;
  descriptionTemplate: string | null;
  qty1Unit: QuantityUnit | null;
  qty1Default: number | null;
  qty2Unit: QuantityUnit | null;
  qty2Default: number | null;
  /** What the exercise permits, so an editor can offer the right choices. */
  quantityUnits: QuantityUnit[];
  quantity2Units: QuantityUnit[];
}

export interface Workout {
  id: number;
  slug: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string | null;
  scoreType: ScoreType;
  section: Section;
  discipline: Discipline;
  difficulty: number | null;
  defaultRounds: number | null;
  timeCapS: number | null;
  durationMin: number | null;
  tags: string[];
  /** Editing produces a new version; `supersededById` null means current. */
  version: number;
  familyId: number | null;
  supersededById: number | null;
  archived: boolean;
  items: WorkoutItem[];
}

export interface WorkoutItemInput {
  exerciseId: number;
  descriptionTemplate?: string | null;
  qty1Unit?: QuantityUnit | null;
  qty1Default?: number | null;
  qty2Unit?: QuantityUnit | null;
  qty2Default?: number | null;
  blockIndex?: number;
  blockRepeat?: number | null;
  restS?: number | null;
}

export interface WorkoutInput {
  name: string;
  description: string;
  section: Section;
  discipline: Discipline;
  scoreType: ScoreType;
  difficulty: number;
  durationMin: number;
  defaultRounds?: number | null;
  timeCapS?: number | null;
  category?: string | null;
  tags?: string[];
  items: WorkoutItemInput[];
}

export const listExercises = (
  token: string,
  params: { search?: string; equipment?: string; station?: number; focus?: string } = {},
) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  return coachFetch<Exercise[]>(`/exercises?${q}`, token);
};

export const listWorkouts = (
  token: string,
  params: { section?: Section; discipline?: Discipline; search?: string } = {},
) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  return coachFetch<Workout[]>(`/workouts?${q}`, token);
};

export const getWorkout = (token: string, id: number) =>
  coachFetch<Workout>(`/workouts/${id}`, token);

export const createWorkout = (token: string, body: WorkoutInput) =>
  coachFetch<Workout>('/workouts', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Saves a **new version**. The original is kept and stays attached to any plan
 *  already using it, so nobody's session changes under them. */
export const saveWorkoutVersion = (token: string, id: number, body: WorkoutInput) =>
  coachFetch<Workout>(`/workouts/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const listWorkoutVersions = (token: string, id: number) =>
  coachFetch<Workout[]>(`/workouts/${id}/versions`, token);

export const archiveWorkout = (token: string, id: number, archived = true) =>
  coachFetch<Workout>(`/workouts/${id}/archive?archived=${archived}`, token, {
    method: 'POST',
  });

// ── Plans ──────────────────────────────────────────────────────────────────

export interface ActivityLine {
  id: number;
  /** Set on a library line — what the write path needs to rebuild it. */
  workoutItemId: number | null;
  /** The effective exercise: the substitute when there is one. */
  exerciseId: number | null;
  substitutedExerciseId: number | null;
  exerciseSlug: string;
  exerciseName: string;
  /** Rendered text, numbers already substituted. */
  text: string;
  sets: number | null;
  qty1: number | null;
  qty1Unit: QuantityUnit | null;
  qty2: number | null;
  qty2Unit: QuantityUnit | null;
  substituted: boolean;
  substitutedFor: string | null;
  note: string | null;
}

export interface Activity {
  headerId: number;
  position: number;
  section: Section;
  workoutId: number | null;
  workoutSlug: string | null;
  workoutName: string;
  description: string;
  scoreType: ScoreType;
  rounds: number | null;
  timeCapS: number | null;
  durationMin: number | null;
  /** True when the coach built it from bare exercises. */
  isCustom: boolean;
  lines: ActivityLine[];
}

export interface SessionLog {
  status: 'in_progress' | 'done' | 'partial' | 'skipped';
  startedAt: string | null;
  endedAt: string | null;
  feltEffort: FeltEffort | null;
  maxHr: number | null;
  jointPain: number | null;
  talkTest: 'yes' | 'sometimes' | 'no' | null;
  notes: string | null;
}

export interface Day {
  id: number;
  onDate: string;
  dayRole: DayRole;
  title: string | null;
  coachNote: string | null;
  /** `draft` until the coach publishes it; athletes only ever see published. */
  status: 'draft' | 'published';
  isRest: boolean;
  /** Empty on `listPrograms` — that endpoint sends counts, not prescriptions.
   *  Use `activityCount` to tell a written day from an empty one. */
  activities: Activity[];
  /** Always accurate, including where `activities` is empty. */
  activityCount: number;
  session: SessionLog | null;
}

export interface Program {
  id: number;
  userId: string;
  name: string;
  goal: string | null;
  discipline: Discipline;
  level: Level;
  availableEquipment: string[];
  athleteContext: {
    notes?: string | null;
    availableWeekdays?: number[];
    sessionCapMinutes?: number | null;
    /** Minutes of unbroken running. Under 10 withholds continuous-run
     *  workouts, so the athlete gets run-walk intervals instead. */
    continuousRunMinutes?: number | null;
  } | null;
  startDate: string;
  endDate: string;
  raceOn: string | null;
  status: ProgramStatus;
  createdAt: string;
  days: Day[];
}

export interface ProgramInput {
  userId: string;
  name: string;
  discipline: Discipline;
  level: Level;
  goal?: string | null;
  availableEquipment: string[];
  athleteContext?: Program['athleteContext'];
  startDate: string;
  endDate: string;
  raceOn?: string | null;
}

/** A line in a library-driven activity. */
export interface LineInput {
  workoutItemId: number;
  substitutedExerciseId?: number | null;
  sets?: number | null;
  qty1?: number | null;
  qty1Unit?: QuantityUnit | null;
  qty2?: number | null;
  qty2Unit?: QuantityUnit | null;
  overrideDescription?: string | null;
  note?: string | null;
}

/** A line the coach built from a bare exercise — "chest press, 3 x 12". */
export interface ExerciseLineInput {
  exerciseId: number;
  sets?: number | null;
  qty1?: number | null;
  qty1Unit?: QuantityUnit | null;
  qty2?: number | null;
  qty2Unit?: QuantityUnit | null;
  note?: string | null;
}

/** Either library-driven (`workoutId` + `lines`) or ad-hoc (`title` +
 *  `exercises`). The backend rejects both together. */
export interface ActivityInput {
  section: Section;
  workoutId?: number | null;
  title?: string | null;
  rounds?: number | null;
  overrideDescription?: string | null;
  note?: string | null;
  lines?: LineInput[];
  exercises?: ExerciseLineInput[];
}

export interface DayInput {
  onDate: string;
  dayRole: DayRole;
  title?: string | null;
  coachNote?: string | null;
  status: 'draft' | 'published';
  activities: ActivityInput[];
}

export interface Coverage {
  covered: number[];
  missing: number[];
  byStation: Record<string, number>;
}

export interface GenerationResult {
  phase: string;
  summary: string | null;
  startDate: string;
  endDate: string;
  daysWritten: number;
  shortlistSize: number;
}

export interface GenerationAttempt {
  id: number;
  status: 'ok' | 'rejected' | 'failed';
  attempt: number;
  model: string | null;
  promptVersion: string | null;
  dayFrom: string | null;
  dayTo: string | null;
  shortlistSize: number;
  failures: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  createdAt: string;
}

export const listPrograms = (token: string, params: { status?: string } = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  return coachFetch<Program[]>(`/programs?${q}`, token);
};

export const getProgram = (token: string, id: number) =>
  coachFetch<Program>(`/programs/${id}`, token);

export const createProgram = (token: string, body: ProgramInput) =>
  coachFetch<Program>('/programs', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchProgram = (
  token: string,
  id: number,
  body: Partial<Omit<ProgramInput, 'userId'>> & { status?: ProgramStatus },
) =>
  coachFetch<Program>(`/programs/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

/** Delete a plan and everything under it.
 *
 *  Refused with 409 once the athlete has logged a session against it — that is a
 *  record, not a draft. Patch `status` to `abandoned` in that case: the athlete
 *  stops seeing it and their history survives.
 */
export const deleteProgram = (token: string, id: number) =>
  coachFetch<void>(`/programs/${id}`, token, { method: 'DELETE' });

/** Upserts a whole day. `activities` replaces whatever was there. */
export const saveDay = (token: string, programId: number, body: DayInput) =>
  coachFetch<Day>(`/programs/${programId}/days`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteDay = (token: string, programId: number, dayId: number) =>
  coachFetch<void>(`/programs/${programId}/days/${dayId}`, token, {
    method: 'DELETE',
  });

export const publishDays = (
  token: string,
  programId: number,
  fromDate: string,
  toDate: string,
) =>
  coachFetch<{ published: number }>(`/programs/${programId}/publish-days`, token, {
    method: 'POST',
    body: JSON.stringify({ fromDate, toDate }),
  });

/** The AI assembler. 14 draft days, starting the day after the last planned one.
 *  Rejects with 422 and the failed rules rather than persisting a bad block. */
export const generateBlock = (token: string, programId: number) =>
  coachFetch<GenerationResult>(`/programs/${programId}/generate`, token, {
    method: 'POST',
  });

export const listGenerations = (token: string, programId: number) =>
  coachFetch<GenerationAttempt[]>(`/programs/${programId}/generations`, token);

export const getCoverage = (token: string, programId: number) =>
  coachFetch<Coverage>(`/programs/${programId}/coverage`, token);

// ── Athletes ───────────────────────────────────────────────────────────────

export interface AthleteSummary {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  city: string | null;
}

export const searchAthletes = (token: string, search: string) =>
  adminFetch<{ users: AthleteSummary[]; total: number }>(
    `/users?limit=8&search=${encodeURIComponent(search)}`,
    token,
  );

export const getAthlete = (token: string, userId: string) =>
  adminFetch<{ user?: AthleteSummary } & AthleteSummary>(`/users/${userId}`, token);
