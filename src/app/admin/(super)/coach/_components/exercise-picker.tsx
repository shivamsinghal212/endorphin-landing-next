'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { STATION_NAME, UNIT_LABEL, type Exercise } from '@/lib/coach-api';
import { useExercises } from '@/lib/coach/hooks';
import { ResponsiveModal } from './responsive-modal';

/** Grouped by what it is, not alphabetically — "chest press" and "burpee" live in
 *  different mental buckets and a flat 159-row list makes both hard to find. */
const GROUPS: { key: string; label: string; match: (e: Exercise) => boolean }[] = [
  { key: 'weights', label: 'Weights & machines', match: (e) => e.modality === 'weightlifting' },
  { key: 'body', label: 'Bodyweight', match: (e) => e.modality === 'gymnastics' },
  { key: 'cardio', label: 'Running & cardio', match: (e) => e.modality === 'cardio' },
  { key: 'carry', label: 'Carries', match: (e) => e.modality === 'loaded_carry' },
  { key: 'mobility', label: 'Mobility', match: (e) => e.modality === 'mobility' },
];

/**
 * Pick bare exercises to build an activity by hand — "chest press, 3 × 12".
 *
 * Multi-select for the same reason as the workout picker: a coach adding a gym
 * block adds four movements, not one.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  kit,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kit: string[];
  onAdd: (exercises: Exercise[]) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [picked, setPicked] = React.useState<number[]>([]);
  const { data: all, isLoading } = useExercises();

  React.useEffect(() => {
    if (!open) {
      setPicked([]);
      setSearch('');
    }
  }, [open]);

  const kitSet = React.useMemo(() => new Set(kit), [kit]);
  const usable = React.useMemo(
    () => (all ?? []).filter((e) => e.equipment.every((q) => kitSet.has(q))),
    [all, kitSet],
  );

  const q = search.trim().toLowerCase();
  const shown = usable.filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.slug.includes(q) ||
      e.tags.some((t) => t.includes(q)),
  );

  const grouped = GROUPS.map((g) => ({
    ...g,
    rows: shown.filter(g.match),
  })).filter((g) => g.rows.length);
  const ungrouped = shown.filter((e) => !GROUPS.some((g) => g.match(e)));

  const toggle = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const commit = () => {
    onAdd(
      picked
        .map((id) => usable.find((e) => e.id === id))
        .filter((e): e is Exercise => Boolean(e)),
    );
    onOpenChange(false);
  };

  const row = (e: Exercise) => {
    const on = picked.includes(e.id);
    const units = [
      ...e.quantityUnits.slice(0, 1),
      ...e.quantity2Units.slice(0, 1),
    ].map((u) => UNIT_LABEL[u]);
    return (
      <li key={e.id}>
        <button
          type="button"
          onClick={() => toggle(e.id)}
          aria-pressed={on}
          className={cn(
            'w-full text-left px-3 min-h-14 py-2 flex items-center gap-3',
            'active:bg-accent transition-colors',
            on && 'bg-primary/5',
          )}
        >
          <span
            className={cn(
              'size-5 shrink-0 rounded border flex items-center justify-center text-xs',
              on
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-input',
            )}
            aria-hidden
          >
            {on ? '✓' : ''}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">{e.name}</span>
            <span className="block text-xs text-muted-foreground truncate">
              {units.length ? units.join(' + ') : 'no numbers'}
              {e.equipment.length ? ` · ${e.equipment.join(', ')}` : ' · no equipment'}
              {e.hyroxStation ? ` · ${STATION_NAME[e.hyroxStation]}` : ''}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add exercises"
      description={
        all ? `${usable.length} of ${all.length} work with this athlete's equipment.` : undefined
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search, e.g. chest press, burpee"
            className="pl-9 h-11"
            aria-label="Search exercises"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !shown.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing matches.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.key}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {g.label}
                </h4>
                <ul className="divide-y rounded-lg border">{g.rows.map(row)}</ul>
              </div>
            ))}
            {ungrouped.length ? (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Other
                </h4>
                <ul className="divide-y rounded-lg border">{ungrouped.map(row)}</ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 md:mx-0 mt-3 border-t bg-background px-4 py-3 flex gap-2">
        <Button
          type="button"
          className="flex-1 h-11"
          disabled={!picked.length}
          onClick={commit}
        >
          {picked.length
            ? `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}`
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
