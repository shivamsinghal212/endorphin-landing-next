'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  DAY_ROLE_LABEL,
  type DayRole,
  type Exercise,
  type Workout,
} from '@/lib/coach-api';
import {
  useDeleteDay,
  useExercises,
  useProgram,
  useSaveDay,
} from '@/lib/coach/hooks';
import { ActivityCard } from '../../../_components/activity-card';
import { ExercisePicker } from '../../../_components/exercise-picker';
import { WorkoutPicker } from '../../../_components/workout-picker';
import {
  SECTION_RANK,
  customActivity,
  dayInputFromDraft,
  draftFromDay,
  draftMinutes,
  linesFor,
  workoutToDraft,
  type DayDraft,
  type DraftActivity,
} from '../../../_components/day-draft';

const DAY_ROLES: DayRole[] = ['strength', 'run', 'long', 'hybrid', 'test', 'rest'];

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function DayEditorContent({
  programId,
  date,
}: {
  programId: number;
  date: string;
}) {
  const router = useRouter();
  const { data: program, isLoading } = useProgram(programId);
  const { data: exercises } = useExercises();
  const save = useSaveDay(programId);
  const del = useDeleteDay(programId);

  const [draft, setDraft] = React.useState<DayDraft | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [workoutPickerOpen, setWorkoutPickerOpen] = React.useState(false);
  const [exercisePickerFor, setExercisePickerFor] = React.useState<
    string | 'new' | null
  >(null);
  const [confirmLeave, setConfirmLeave] = React.useState<string | null>(null);

  const byId = React.useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e])),
    [exercises],
  );

  const existing = program?.days.find((d) => d.onDate === date);

  // Seed the draft once both the program and the exercise vocabulary are in.
  React.useEffect(() => {
    if (!program || !exercises || draft) return;
    setDraft(draftFromDay(date, existing, byId));
  }, [program, exercises, draft, date, existing, byId]);

  const update = (patch: Partial<DayDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const setActivities = (activities: DraftActivity[]) => update({ activities });

  const addWorkouts = (workouts: Workout[]) => {
    if (!draft || !program) return;
    const added = workouts.map((w) =>
      workoutToDraft(w, program.availableEquipment, byId, program.level),
    );
    setActivities(
      [...draft.activities, ...added].sort(
        (a, b) => SECTION_RANK[a.section] - SECTION_RANK[b.section],
      ),
    );
  };

  const addExercises = (picked: Exercise[]) => {
    if (!draft || !program) return;
    if (exercisePickerFor === 'new' || exercisePickerFor === null) {
      setActivities([
        ...draft.activities,
        customActivity(picked, program.level),
      ]);
      return;
    }
    // Appending to an existing custom block.
    setActivities(
      draft.activities.map((a) =>
        a.key === exercisePickerFor
          ? {
              ...a,
              lines: [...a.lines, ...picked.map((e) => linesFor(e, program.level))],
            }
          : a,
      ),
    );
  };

  const moveActivity = (index: number, dir: -1 | 1) => {
    if (!draft) return;
    const j = index + dir;
    if (j < 0 || j >= draft.activities.length) return;
    const next = [...draft.activities];
    [next[index], next[j]] = [next[j], next[index]];
    setActivities(next);
  };

  const leave = (href: string) => {
    if (dirty) setConfirmLeave(href);
    else router.push(href);
  };

  const onSave = async () => {
    if (!draft) return;
    await save.mutateAsync(dayInputFromDraft(draft));
    setDirty(false);
    router.push(`/admin/coach/${programId}`);
  };

  if (isLoading || !program || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const isRest = draft.dayRole === 'rest';
  const minutes = draftMinutes(draft);
  const cap = program.athleteContext?.sessionCapMinutes ?? null;
  const overCap = cap != null && minutes > cap;
  const backHref = `/admin/coach/${programId}`;

  return (
    <div className="space-y-5 max-w-3xl pb-24 md:pb-0">
      <header className="space-y-1">
        <button
          type="button"
          onClick={() => leave(backHref)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {program.name}
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{prettyDate(date)}</h1>
        {existing?.session ? (
          <p className="text-sm text-muted-foreground">
            The athlete has already logged this day ({existing.session.status}). Edits
            will change what they see.
          </p>
        ) : null}
      </header>

      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">What kind of day?</Label>
            <Select
              value={draft.dayRole}
              onValueChange={(v) => update({ dayRole: v as DayRole })}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {DAY_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">
              What the athlete sees as the title
            </Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={DAY_ROLE_LABEL[draft.dayRole]}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-xs">
            Note for the athlete (optional)
          </Label>
          <Input
            id="note"
            value={draft.coachNote}
            onChange={(e) => update({ coachNote: e.target.value })}
            placeholder="Carry water. It's humid."
            className="h-11"
          />
        </div>
      </section>

      {isRest ? (
        <Alert>
          <AlertDescription>
            Rest day — nothing to add. Rest is part of the plan.
          </AlertDescription>
        </Alert>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold">Workouts</h2>
            {minutes ? (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  overCap ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}
              >
                ≈{minutes} min{cap ? ` of ${cap}` : ''}
              </span>
            ) : null}
            <div className="ms-auto flex gap-2">
              <Button
                size="sm"
                className="h-11 md:h-9"
                onClick={() => setWorkoutPickerOpen(true)}
              >
                <Plus className="size-4 mr-1" />
                Workout
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 md:h-9"
                onClick={() => setExercisePickerFor('new')}
              >
                <Plus className="size-4 mr-1" />
                Exercises
              </Button>
            </div>
          </div>

          {overCap ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                This day is longer than the {cap} minutes they said they have.
              </AlertDescription>
            </Alert>
          ) : null}

          {draft.activities.length ? (
            <div className="space-y-3">
              {draft.activities.map((a, i) => (
                <ActivityCard
                  key={a.key}
                  activity={a}
                  index={i}
                  count={draft.activities.length}
                  onChange={(next) =>
                    setActivities(
                      draft.activities.map((x) => (x.key === a.key ? next : x)),
                    )
                  }
                  onMove={(dir) => moveActivity(i, dir)}
                  onRemove={() =>
                    setActivities(draft.activities.filter((x) => x.key !== a.key))
                  }
                  onAddExercise={
                    a.workoutId === null
                      ? () => setExercisePickerFor(a.key)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Nothing added yet.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button className="h-11 md:h-9" onClick={() => setWorkoutPickerOpen(true)}>
                  Pick a workout
                </Button>
                <Button
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => setExercisePickerFor('new')}
                >
                  Build it from exercises
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sticky save on mobile: the day editor is long and the action must stay
          reachable without scrolling to the bottom. */}
      <div
        className={cn(
          'flex gap-2 flex-wrap',
          'fixed bottom-0 left-0 right-0 z-20 border-t bg-background p-3',
          'md:static md:border-0 md:bg-transparent md:p-0',
        )}
      >
        <Button onClick={onSave} disabled={save.isPending} className="flex-1 md:flex-none h-11">
          {save.isPending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
          Save this day
        </Button>
        <Button variant="outline" className="h-11" onClick={() => leave(backHref)}>
          Back
        </Button>
        {existing ? (
          <Button
            variant="ghost"
            className="h-11 text-destructive ms-auto"
            onClick={() => del.mutate(existing.id)}
            disabled={del.isPending}
          >
            <Trash2 className="size-4 mr-1" />
            Clear
          </Button>
        ) : null}
      </div>

      <WorkoutPicker
        open={workoutPickerOpen}
        onOpenChange={setWorkoutPickerOpen}
        kit={program.availableEquipment}
        goal={program.discipline}
        onAdd={addWorkouts}
      />
      <ExercisePicker
        open={exercisePickerFor !== null}
        onOpenChange={(o) => setExercisePickerFor(o ? exercisePickerFor : null)}
        kit={program.availableEquipment}
        onAdd={addExercises}
      />

      <AlertDialog
        open={confirmLeave !== null}
        onOpenChange={(o) => !o && setConfirmLeave(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve changed this day but haven&apos;t saved it. Those changes
              will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const href = confirmLeave!;
                setConfirmLeave(null);
                router.push(href);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
