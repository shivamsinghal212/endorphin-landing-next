'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  GOAL_LABEL,
  KIT_PRESETS,
  LEVEL_LABEL,
  type AthleteSummary,
  type Discipline,
  type Level,
} from '@/lib/coach-api';
import { useAthleteSearch, useCreateProgram } from '@/lib/coach/hooks';
import { KitPicker } from '../_components/kit-picker';
import { addDays, todayIso } from '../_components/fortnight';

const GOALS: (keyof typeof GOAL_LABEL)[] = ['hyrox', 'run', 'strength'];
const LEVELS: Level[] = ['beginner', 'intermediate', 'rx'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * New plan.
 *
 * Five decisions, not ten. The plan name is derived from the goal, the end date
 * is start + 13 because a block *is* a fortnight, and the race date belongs on
 * the plan screen once it exists rather than blocking creation.
 */
export function NewPlanContent() {
  const router = useRouter();
  const create = useCreateProgram();

  const [athlete, setAthlete] = React.useState<AthleteSummary | null>(null);
  const [query, setQuery] = React.useState('');
  const [goal, setGoal] = React.useState<keyof typeof GOAL_LABEL>('hyrox');
  const [level, setLevel] = React.useState<Level>('beginner');
  const [kit, setKit] = React.useState<string[]>(KIT_PRESETS[0].kit);
  const [days, setDays] = React.useState<number[]>([0, 3, 5, 6]);
  const [cap, setCap] = React.useState('60');
  const [notes, setNotes] = React.useState('');

  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data: results, isFetching } = useAthleteSearch(debounced);

  const startDate = todayIso();
  const planName =
    goal === 'hyrox' ? 'Your First HYROX'
      : goal === 'run' ? 'Running Plan'
        : 'Strength Plan';

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const submit = async () => {
    if (!athlete) return;
    const program = await create.mutateAsync({
      userId: athlete.id,
      name: planName,
      discipline: goal as Discipline,
      level,
      goal: `${GOAL_LABEL[goal]} — ${LEVEL_LABEL[level].toLowerCase()}`,
      availableEquipment: kit,
      startDate,
      endDate: addDays(startDate, 13),
      athleteContext: {
        notes: notes.trim() || null,
        availableWeekdays: days,
        sessionCapMinutes: Number(cap) || null,
      },
    });
    router.push(`/admin/coach/${program.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/admin/coach"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Plans
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">New plan</h1>
      </header>

      {/* 1 — who */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Who is this for?</h2>
          <p className="text-sm text-muted-foreground">Search by name or email.</p>
        </div>

        {athlete ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-600/30 bg-emerald-50 p-3">
            <Check className="size-4 text-emerald-700 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">
                {athlete.name || athlete.email}
              </span>
              <span className="block text-xs text-muted-foreground truncate">
                {athlete.email}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 md:size-9 shrink-0"
              onClick={() => setAthlete(null)}
              aria-label="Choose a different athlete"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing a name"
                className="pl-9 h-11"
                aria-label="Search athletes"
                autoComplete="off"
              />
              {isFetching ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {debounced.length >= 2 ? (
              results?.users?.length ? (
                <ul className="divide-y rounded-lg border">
                  {results.users.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setAthlete(u);
                          setQuery('');
                        }}
                        className="w-full text-left px-3 min-h-14 py-2 active:bg-accent hover:bg-accent/50"
                      >
                        <span className="block text-sm font-medium">
                          {u.name || '(no name)'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : isFetching ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                <p className="text-sm text-muted-foreground">Nobody found.</p>
              )
            ) : null}
          </>
        )}
      </section>

      {/* 2 — what for */}
      <section className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-base font-semibold">What are they training for?</h2>

        <div className="space-y-1.5">
          <Label className="text-xs">Goal</Label>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <ChoiceButton
                key={g}
                active={goal === g}
                onClick={() => setGoal(g)}
                label={GOAL_LABEL[g]}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Starting level</Label>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <ChoiceButton
                key={l}
                active={level === l}
                onClick={() => setLevel(l)}
                label={LEVEL_LABEL[l]}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The plan will be called <strong>{planName}</strong> and runs 14 days from
          today. You can rename it and set a race date afterwards.
        </p>
      </section>

      {/* 3 — when */}
      <section className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">When can they train?</h2>
          <p className="text-sm text-muted-foreground">
            The assembler only puts sessions on these days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((label, i) => (
            <ChoiceButton
              key={label}
              active={days.includes(i)}
              onClick={() => toggleDay(i)}
              label={label}
              className="w-14"
            />
          ))}
        </div>
        <div className="space-y-1.5 max-w-[12rem]">
          <Label htmlFor="cap" className="text-xs">
            Longest session (minutes)
          </Label>
          <Input
            id="cap"
            type="number"
            inputMode="numeric"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="h-11 tabular-nums"
          />
        </div>
      </section>

      {/* 4 — kit */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold">What can they train with?</h2>
          <p className="text-sm text-muted-foreground">
            Pick the closest profile. Anything they don&apos;t have gets swapped for
            something they do.
          </p>
        </div>
        <KitPicker value={kit} onChange={setKit} />
      </section>

      {/* 5 — context */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Anything to know?</h2>
          <p className="text-sm text-muted-foreground">
            Injuries, medication, running history. The assembler reads this.
          </p>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="38, no running base — hasn't run in a month. 10 bodyweight squats is a challenge. Mild knee pain."
          className="min-h-24"
        />
      </section>

      <div className="flex gap-2 sticky bottom-0 bg-background py-3 -mx-1 px-1 border-t md:static md:border-0 md:bg-transparent">
        <Button
          onClick={submit}
          disabled={!athlete || !days.length || create.isPending}
          className="flex-1 md:flex-none h-11"
        >
          {create.isPending ? (
            <>
              <Loader2 className="size-4 mr-1.5 animate-spin" />
              Creating
            </>
          ) : (
            'Create plan'
          )}
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/coach">Cancel</Link>
        </Button>
      </div>
      {!athlete ? (
        <p className="text-xs text-muted-foreground -mt-4">
          Choose an athlete to continue.
        </p>
      ) : null}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg border min-h-11 px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/5 text-primary ring-1 ring-inset ring-primary'
          : 'border-input hover:bg-accent',
        className,
      )}
    >
      {label}
    </button>
  );
}
