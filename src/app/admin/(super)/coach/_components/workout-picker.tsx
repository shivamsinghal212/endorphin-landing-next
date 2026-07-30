'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  DISCIPLINE_LABEL,
  SECTION_LABEL,
  type Discipline,
  type Exercise,
  type Section,
  type Workout,
} from '@/lib/coach-api';
import { useExercises, useWorkouts } from '@/lib/coach/hooks';
import { ResponsiveModal } from './responsive-modal';

const SECTION_ORDER: Section[] = ['warmup', 'main', 'finisher', 'cooldown', 'test'];

/** Can this athlete do every exercise in the workout, substituting where needed?
 *  Mirrors `retrieval.resolve_line` — the server is authoritative, this is only
 *  so the picker doesn't offer something that will be rejected. */
function resolvable(
  w: Workout,
  kit: Set<string>,
  byId: Map<number, Exercise>,
): { ok: boolean; swaps: number; names: string[] } {
  let swaps = 0;
  const names: string[] = [];
  for (const item of w.items) {
    const ex = byId.get(item.exerciseId);
    if (!ex) return { ok: false, swaps: 0, names: [] };
    if (ex.equipment.every((q) => kit.has(q))) {
      names.push(ex.name);
      continue;
    }
    const sub = ex.substituteIds
      .map((id) => byId.get(id))
      .find((s) => s && s.equipment.every((q) => kit.has(q)));
    if (!sub) return { ok: false, swaps: 0, names: [] };
    swaps += 1;
    names.push(sub.name);
  }
  return { ok: true, swaps, names };
}

/**
 * The workout picker.
 *
 * Multi-select: a day is usually warm-up + main + cool-down, and opening this
 * three times to add three things was the slowest loop in the tool. Pick as many
 * as you want, then add them in one go — they land in section order.
 */
export function WorkoutPicker({
  open,
  onOpenChange,
  kit,
  goal,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kit: string[];
  goal: Discipline;
  onAdd: (workouts: Workout[]) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<Discipline | 'all'>('all');
  const [picked, setPicked] = React.useState<number[]>([]);

  const { data: workouts, isLoading } = useWorkouts();
  const { data: exercises } = useExercises();

  React.useEffect(() => {
    if (!open) {
      setPicked([]);
      setSearch('');
      setFilter('all');
    }
  }, [open]);

  const kitSet = React.useMemo(() => new Set(kit), [kit]);
  const byId = React.useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e])),
    [exercises],
  );

  /** Training for HYROX draws on running and strength too — discipline labels a
   *  workout, it does not gate a goal. */
  const uses: Discipline[] =
    goal === 'hyrox'
      ? ['hyrox', 'run', 'strength', 'functional', 'mobility']
      : goal === 'run'
        ? ['run', 'strength', 'functional', 'mobility']
        : ['strength', 'functional', 'mobility'];

  const usable = React.useMemo(() => {
    if (!workouts || !exercises) return [];
    return workouts
      .filter((w) => uses.includes(w.discipline))
      .map((w) => ({ w, res: resolvable(w, kitSet, byId) }))
      .filter((x) => x.res.ok);
  }, [workouts, exercises, kitSet, byId, uses]);

  const counts = React.useMemo(() => {
    const c: Partial<Record<Discipline, number>> = {};
    usable.forEach(({ w }) => {
      c[w.discipline] = (c[w.discipline] ?? 0) + 1;
    });
    return c;
  }, [usable]);

  const q = search.trim().toLowerCase();
  const shown = usable.filter(
    ({ w }) =>
      (filter === 'all' || w.discipline === filter) &&
      (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)),
  );

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    rows: shown.filter(({ w }) => w.section === section),
  })).filter((g) => g.rows.length);

  const toggle = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const commit = () => {
    const chosen = picked
      .map((id) => usable.find((x) => x.w.id === id)?.w)
      .filter((w): w is Workout => Boolean(w))
      // Land in the order they belong in a day, not the order they were tapped.
      .sort(
        (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section),
      );
    onAdd(chosen);
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add workouts"
      description={
        exercises && workouts
          ? `${usable.length} of ${workouts.length} work with this athlete's equipment.`
          : undefined
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workouts"
            className="pl-9 h-11"
            aria-label="Search workouts"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={usable.length}
          />
          {uses
            .filter((d) => counts[d])
            .map((d) => (
              <FilterChip
                key={d}
                active={filter === d}
                onClick={() => setFilter(d)}
                label={DISCIPLINE_LABEL[d]}
                count={counts[d]!}
              />
            ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing matches. Try a different search, or add more equipment to the plan.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ section, rows }) => (
              <div key={section}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {SECTION_LABEL[section]}
                </h4>
                <ul className="divide-y rounded-lg border">
                  {rows.map(({ w, res }) => {
                    const on = picked.includes(w.id);
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => toggle(w.id)}
                          aria-pressed={on}
                          className={cn(
                            'w-full text-left px-3 py-2.5 min-h-16 flex gap-3 items-start',
                            'active:bg-accent transition-colors',
                            on && 'bg-primary/5',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 size-5 shrink-0 rounded border flex items-center justify-center',
                              on ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                            )}
                            aria-hidden
                          >
                            {on ? '✓' : ''}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{w.name}</span>
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {DISCIPLINE_LABEL[w.discipline]}
                              </Badge>
                              {w.durationMin ? (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {w.durationMin} min
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {w.description}
                            </span>
                            <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
                              {res.names.join(' · ')}
                              {res.swaps ? (
                                <span className="text-amber-700">
                                  {' '}· {res.swaps} swapped for their kit
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky commit bar: on a phone the list is long and the action must stay
          reachable without scrolling back. */}
      <div className="sticky bottom-0 -mx-4 md:mx-0 mt-3 border-t bg-background px-4 py-3 flex gap-2">
        <Button
          type="button"
          className="flex-1 h-11"
          disabled={!picked.length}
          onClick={commit}
        >
          {picked.length
            ? `Add ${picked.length} workout${picked.length === 1 ? '' : 's'}`
            : 'Select at least one'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </ResponsiveModal>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 h-9 text-xs font-medium whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-input hover:bg-accent',
      )}
    >
      {label} <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

/** Loading affordance for callers that fetch the library before opening. */
export function PickerSpinner() {
  return <Loader2 className="size-4 animate-spin" aria-hidden />;
}
