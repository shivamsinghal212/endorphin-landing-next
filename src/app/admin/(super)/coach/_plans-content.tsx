'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, Dumbbell, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  GOAL_LABEL,
  LEVEL_LABEL,
  type Program,
} from '@/lib/coach-api';
import { useAthlete, usePrograms } from '@/lib/coach/hooks';

function AthleteName({ userId }: { userId: string }) {
  const { data, isLoading } = useAthlete(userId);
  if (isLoading) return <Skeleton className="h-3 w-24 mt-1" />;
  return (
    <span className="block text-xs text-muted-foreground truncate">
      {data?.name || data?.email || 'unknown athlete'}
    </span>
  );
}

function StatusBadge({ status }: { status: Program['status'] }) {
  if (status === 'published') {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 shrink-0">Live</Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="outline" className="border-amber-600/40 text-amber-700 shrink-0">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0 capitalize">
      {status}
    </Badge>
  );
}

function planned(p: Program): string {
  const filled = p.days.filter((d) => d.activities.length || d.isRest).length;
  const total =
    Math.round(
      (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86_400_000,
    ) + 1;
  return `${filled} of ${total} days planned`;
}

export function PlansContent() {
  const { data: programs, isLoading, error } = usePrograms();

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Training plans for the HYROX and running cohort.
          </p>
        </div>
        <div className="ms-auto flex gap-2">
          <Button asChild variant="outline" className="h-11 md:h-9">
            <Link href="/admin/coach/library">
              <BookOpen className="size-4 mr-1.5" />
              Library
            </Link>
          </Button>
          <Button asChild className="h-11 md:h-9">
            <Link href="/admin/coach/new">
              <Plus className="size-4 mr-1.5" />
              New plan
            </Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          Couldn&apos;t load plans. Check you&apos;re signed in as a super admin.
        </div>
      ) : !programs?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Dumbbell className="size-8 mx-auto text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            No plans yet. Create one and either build the fortnight yourself or let
            the assembler draft it.
          </p>
          <Button asChild className="mt-4 h-11 md:h-9">
            <Link href="/admin/coach/new">Create the first plan</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/coach/${p.id}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 min-h-16',
                  'hover:bg-accent/50 active:bg-accent transition-colors',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{p.name}</span>
                  <AthleteName userId={p.userId} />
                  <span className="block text-xs text-muted-foreground mt-1">
                    {GOAL_LABEL[p.discipline as keyof typeof GOAL_LABEL] ?? p.discipline}
                    {' · '}
                    {LEVEL_LABEL[p.level]}
                    {' · '}
                    {planned(p)}
                  </span>
                </span>
                <StatusBadge status={p.status} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
