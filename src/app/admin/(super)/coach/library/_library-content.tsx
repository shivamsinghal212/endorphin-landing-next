'use client';

import * as React from 'react';
import Link from 'next/link';
import { History, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DISCIPLINE_LABEL,
  SECTION_LABEL,
  type Section,
  type Workout,
} from '@/lib/coach-api';
import { useWorkoutVersions, useWorkouts } from '@/lib/coach/hooks';
import { ResponsiveModal } from '../_components/responsive-modal';

const SECTION_ORDER: Section[] = ['warmup', 'main', 'finisher', 'cooldown', 'test'];

export function LibraryContent() {
  const [search, setSearch] = React.useState('');
  const [historyFor, setHistoryFor] = React.useState<Workout | null>(null);
  const { data: workouts, isLoading } = useWorkouts();

  const q = search.trim().toLowerCase();
  const shown = (workouts ?? []).filter(
    (w) => !q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
  );
  const grouped = SECTION_ORDER.map((s) => ({
    section: s,
    rows: shown.filter((w) => w.section === s),
  })).filter((g) => g.rows.length);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <Link
          href="/admin/coach"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Plans
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Workout library</h1>
        <p className="text-sm text-muted-foreground">
          {workouts?.length ?? '…'} workouts. Editing one saves a new version — the
          old one is kept, so plans already using it don&apos;t change.
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workouts"
          className="pl-9 h-11"
          aria-label="Search workouts"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !grouped.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nothing matches.
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ section, rows }) => (
            <section key={section}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {SECTION_LABEL[section]}
              </h2>
              <ul className="divide-y rounded-lg border bg-card">
                {rows.map((w) => (
                  <li
                    key={w.id}
                    className="px-4 py-3 flex items-start gap-3 flex-wrap min-h-16"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{w.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {DISCIPLINE_LABEL[w.discipline]}
                        </Badge>
                        {w.version > 1 ? (
                          <Badge variant="outline" className="text-[10px]">
                            v{w.version}
                          </Badge>
                        ) : null}
                        {w.source === 'coach' ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-600/40 text-amber-700"
                          >
                            Yours
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {w.description}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        {w.items.map((i) => i.exerciseName).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                        {w.durationMin} min
                      </span>
                      {w.version > 1 || w.familyId ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 md:size-9"
                          onClick={() => setHistoryFor(w)}
                          aria-label={`Version history for ${w.name}`}
                        >
                          <History className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <VersionHistory
        workout={historyFor}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}

function VersionHistory({
  workout,
  onClose,
}: {
  workout: Workout | null;
  onClose: () => void;
}) {
  const { data: versions, isLoading } = useWorkoutVersions(workout?.id ?? null);

  return (
    <ResponsiveModal
      open={Boolean(workout)}
      onOpenChange={(o) => !o && onClose()}
      title={workout ? `${workout.name} — versions` : 'Versions'}
      description="Nothing is ever deleted. Old versions stay attached to plans that already use them."
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(versions ?? []).map((v) => (
            <li key={v.id} className="px-3 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold tabular-nums">v{v.version}</span>
                {v.supersededById ? (
                  <Badge variant="secondary" className="text-[10px]">
                    superseded
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                    current
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground tabular-nums ms-auto">
                  {v.durationMin} min
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {v.items.map((i) => i.exerciseName).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveModal>
  );
}
