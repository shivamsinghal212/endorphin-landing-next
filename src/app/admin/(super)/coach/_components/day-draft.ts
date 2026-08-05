/** Editable shape for one day, and the conversions either side of it.
 *
 *  The wire has two activity shapes — library-driven and ad-hoc — and the editor
 *  needs one model that covers both plus the ordering the coach controls. Kept
 *  out of the component so the round-trip is testable and readable on its own.
 */
import {
  type Activity,
  type ActivityInput,
  type Day,
  type DayInput,
  type DayRole,
  type Exercise,
  type QuantityUnit,
  type Section,
  type Workout,
} from '@/lib/coach-api';

export interface DraftLine {
  /** Library line: the workout item behind it. Null on an ad-hoc line. */
  workoutItemId: number | null;
  /** Ad-hoc line: the exercise itself. Null on a library line. */
  exerciseId: number | null;
  substitutedExerciseId: number | null;
  name: string;
  substitutedFor: string | null;
  sets: number | null;
  qty1: number | null;
  qty1Unit: QuantityUnit | null;
  qty2: number | null;
  qty2Unit: QuantityUnit | null;
  /** What the exercise permits, so a unit dropdown can offer the right options. */
  units1: QuantityUnit[];
  units2: QuantityUnit[];
}

export interface DraftActivity {
  /** Stable key for React across reorders — not a server id. */
  key: string;
  section: Section;
  /** Null on an activity the coach built from bare exercises. */
  workoutId: number | null;
  /** Library workouts show their own name; ad-hoc ones are named by the coach. */
  title: string;
  description: string;
  scoreType: string;
  rounds: number | null;
  durationMin: number | null;
  lines: DraftLine[];
}

export interface DayDraft {
  onDate: string;
  dayRole: DayRole;
  title: string;
  coachNote: string;
  status: 'draft' | 'published';
  activities: DraftActivity[];
}

let seq = 0;
const nextKey = () => `a${(seq += 1)}`;

export const SECTION_RANK: Record<Section, number> = {
  warmup: 0, main: 1, test: 1, finisher: 2, cooldown: 3,
};

/** Sensible starting numbers by level, used when a line has no default. */
const START: Record<string, Record<QuantityUnit, number>> = {
  beginner: { m: 200, km: 2, number: 10, kg: 10, seconds: 30, minutes: 5, percent: 10, calories: 15 },
  intermediate: { m: 400, km: 5, number: 12, kg: 16, seconds: 45, minutes: 8, percent: 12, calories: 25 },
  rx: { m: 800, km: 8, number: 20, kg: 24, seconds: 60, minutes: 12, percent: 15, calories: 40 },
};

function startFor(unit: QuantityUnit | null, level: string): number | null {
  if (!unit) return null;
  return (START[level] ?? START.beginner)[unit] ?? 10;
}

// ── wire -> draft ──────────────────────────────────────────────────────────

export function draftFromDay(
  date: string,
  day: Day | undefined,
  exercisesById: Map<number, Exercise>,
): DayDraft {
  return {
    onDate: date,
    dayRole: day?.dayRole ?? 'hybrid',
    title: day?.title ?? '',
    coachNote: day?.coachNote ?? '',
    status: day?.status ?? 'draft',
    activities: (day?.activities ?? []).map((a) => activityToDraft(a, exercisesById)),
  };
}

function activityToDraft(a: Activity, byId: Map<number, Exercise>): DraftActivity {
  return {
    key: nextKey(),
    section: a.section,
    workoutId: a.workoutId,
    title: a.workoutName,
    description: a.description,
    scoreType: a.scoreType,
    rounds: a.rounds,
    durationMin: a.durationMin,
    lines: a.lines.map((l) => {
      const ex = l.exerciseId ? byId.get(l.exerciseId) : undefined;
      return {
        workoutItemId: l.workoutItemId,
        exerciseId: a.isCustom ? l.exerciseId : null,
        substitutedExerciseId: l.substitutedExerciseId,
        name: l.exerciseName,
        substitutedFor: l.substitutedFor,
        sets: l.sets,
        qty1: l.qty1,
        qty1Unit: l.qty1Unit,
        qty2: l.qty2,
        qty2Unit: l.qty2Unit,
        units1: ex?.quantityUnits ?? (l.qty1Unit ? [l.qty1Unit] : []),
        units2: ex?.quantity2Units ?? (l.qty2Unit ? [l.qty2Unit] : []),
      };
    }),
  };
}

// ── library workout -> draft ───────────────────────────────────────────────

/** Resolve a workout for this athlete: substitute anything they lack the kit for,
 *  and seed each line's numbers from the item's own default. */
export function workoutToDraft(
  w: Workout,
  kit: string[],
  byId: Map<number, Exercise>,
  level: string,
): DraftActivity {
  const have = new Set(kit);
  const lines: DraftLine[] = [];

  for (const item of [...w.items].sort(
    (a, b) => a.blockIndex - b.blockIndex || a.position - b.position,
  )) {
    const prescribed = byId.get(item.exerciseId);
    if (!prescribed) continue;

    let sub: Exercise | undefined;
    if (!prescribed.equipment.every((q) => have.has(q))) {
      sub = prescribed.substituteIds
        .map((id) => byId.get(id))
        .find((s) => s && s.equipment.every((q) => have.has(q)));
      if (!sub) continue; // the picker should never have offered this
    }
    const eff = sub ?? prescribed;

    // A substitute may measure the movement differently — a sled push is kg over
    // metres, an incline march is percent over seconds. Take the substitute's
    // units and fall back to a level default when there is no matching number.
    const u1 = sub ? (eff.quantityUnits[0] ?? null) : item.qty1Unit;
    const u2 = sub ? (eff.quantity2Units[0] ?? null) : item.qty2Unit;
    const d1 = sub || item.qty1Default == null ? startFor(u1, level) : item.qty1Default;
    const d2 = sub || item.qty2Default == null ? startFor(u2, level) : item.qty2Default;

    lines.push({
      workoutItemId: item.id,
      exerciseId: null,
      substitutedExerciseId: sub?.id ?? null,
      name: eff.name,
      substitutedFor: sub ? prescribed.name : null,
      sets: 1,
      qty1: d1,
      qty1Unit: u1,
      qty2: d2,
      qty2Unit: u2,
      units1: eff.quantityUnits,
      units2: eff.quantity2Units,
    });
  }

  return {
    key: nextKey(),
    section: w.section,
    workoutId: w.id,
    title: w.name,
    description: w.description,
    scoreType: w.scoreType,
    // Whatever the workout declares, whatever its score type. Gating this on
    // ROUND_SCORED meant a workout defined as 3 rounds was added as one pass.
    rounds: w.defaultRounds ?? null,
    durationMin: w.durationMin,
    lines,
  };
}

/** A block the coach builds from bare exercises. */
export function customActivity(
  exercises: Exercise[],
  level: string,
  section: Section = 'main',
): DraftActivity {
  return {
    key: nextKey(),
    section,
    workoutId: null,
    title: '',
    description: '',
    scoreType: 'for-load',
    rounds: null,
    durationMin: null,
    lines: exercises.map((e) => {
      const u1 = e.quantityUnits[0] ?? null;
      const u2 = e.quantity2Units[0] ?? null;
      return {
        workoutItemId: null,
        exerciseId: e.id,
        substitutedExerciseId: null,
        name: e.name,
        substitutedFor: null,
        sets: 1,
        qty1: startFor(u1, level),
        qty1Unit: u1,
        qty2: startFor(u2, level),
        qty2Unit: u2,
        units1: e.quantityUnits,
        units2: e.quantity2Units,
      };
    }),
  };
}

export function linesFor(e: Exercise, level: string): DraftLine {
  return customActivity([e], level).lines[0];
}

// ── draft -> wire ──────────────────────────────────────────────────────────

export function dayInputFromDraft(draft: DayDraft): DayInput {
  const activities: ActivityInput[] =
    draft.dayRole === 'rest'
      ? []
      : draft.activities.map((a) =>
          a.workoutId
            ? {
                section: a.section,
                workoutId: a.workoutId,
                // Send what the coach set. This used to null the round count for
                // any non-round-scored workout, so saving an edited day silently
                // stripped the rounds off every strength session on it.
                rounds: a.rounds,
                lines: a.lines
                  .filter((l) => l.workoutItemId != null)
                  .map((l) => ({
                    workoutItemId: l.workoutItemId!,
                    substitutedExerciseId: l.substitutedExerciseId,
                    sets: l.sets ?? 1,
                    qty1: l.qty1,
                    qty1Unit: l.qty1Unit,
                    qty2: l.qty2,
                    qty2Unit: l.qty2Unit,
                  })),
              }
            : {
                section: a.section,
                title: a.title.trim() || 'Exercises',
                exercises: a.lines
                  .filter((l) => l.exerciseId != null)
                  .map((l) => ({
                    exerciseId: l.exerciseId!,
                    sets: l.sets ?? 1,
                    qty1: l.qty1,
                    qty1Unit: l.qty1Unit,
                    qty2: l.qty2,
                    qty2Unit: l.qty2Unit,
                  })),
              },
        );

  return {
    onDate: draft.onDate,
    dayRole: draft.dayRole,
    title: draft.title.trim() || null,
    coachNote: draft.coachNote.trim() || null,
    status: draft.status,
    activities,
  };
}

/** Total planned minutes, for the session-cap warning. */
export function draftMinutes(draft: DayDraft): number {
  return draft.activities.reduce((t, a) => t + (a.durationMin ?? 0), 0);
}
