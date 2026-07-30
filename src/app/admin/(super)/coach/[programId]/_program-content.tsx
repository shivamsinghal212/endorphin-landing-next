'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Sparkles, Target } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GOAL_LABEL,
  LEVEL_LABEL,
  STATION_NAME,
} from '@/lib/coach-api';
import {
  useAthlete,
  useCoverage,
  useGenerateBlock,
  usePatchProgram,
  useProgram,
  usePublishDays,
} from '@/lib/coach/hooks';
import { Fortnight } from '../_components/fortnight';

export function ProgramContent({ programId }: { programId: number }) {
  const { data: program, isLoading } = useProgram(programId);
  const { data: athlete } = useAthlete(program?.userId ?? null);
  const { data: coverage } = useCoverage(programId);
  const generate = useGenerateBlock(programId);
  const publish = usePublishDays(programId);
  const patch = usePatchProgram(programId);

  const [showCoverage, setShowCoverage] = React.useState(false);

  if (isLoading || !program) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const draftDays = program.days.filter((d) => d.status === 'draft').length;
  const plannedDays = program.days.filter(
    (d) => d.activities.length || d.isRest,
  ).length;
  const isLive = program.status === 'published';

  const makeLive = async () => {
    await publish.mutateAsync({
      fromDate: program.startDate,
      toDate: program.endDate,
    });
    if (!isLive) await patch.mutateAsync({ status: 'published' });
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <Link
          href="/admin/coach"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Plans
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {athlete?.name || athlete?.email || '…'}
              {' · '}
              {GOAL_LABEL[program.discipline as keyof typeof GOAL_LABEL] ??
                program.discipline}
              {' · '}
              {LEVEL_LABEL[program.level]}
              {' · '}
              {plannedDays} of 14 days planned
            </p>
          </div>
          <div className="ms-auto">
            {isLive ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                Live for the athlete
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-600/40 text-amber-700">
                Not live yet
              </Badge>
            )}
          </div>
        </div>
      </header>

      {!isLive ? (
        <Alert>
          <AlertDescription>
            The athlete can&apos;t see anything yet. Plan some days, then press{' '}
            <strong>Make it live</strong>.
          </AlertDescription>
        </Alert>
      ) : draftDays ? (
        <Alert>
          <AlertDescription>
            {draftDays} day{draftDays === 1 ? '' : 's'} still in draft — the athlete
            can&apos;t see {draftDays === 1 ? 'it' : 'them'} yet.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="h-11 md:h-9"
        >
          {generate.isPending ? (
            <>
              <Loader2 className="size-4 mr-1.5 animate-spin" />
              Drafting 14 days…
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-1.5" />
              {plannedDays ? 'Add the next 14 days' : 'Draft 14 days with AI'}
            </>
          )}
        </Button>

        <Button
          variant={isLive ? 'outline' : 'default'}
          onClick={makeLive}
          disabled={publish.isPending || patch.isPending || !plannedDays}
          className="h-11 md:h-9"
        >
          {publish.isPending || patch.isPending ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : null}
          {isLive ? 'Publish new days' : 'Make it live'}
        </Button>

        <Button
          variant="ghost"
          onClick={() => setShowCoverage((v) => !v)}
          className="h-11 md:h-9 ms-auto"
        >
          <Target className="size-4 mr-1.5" />
          Race stations
        </Button>
      </div>

      {generate.isPending ? (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin shrink-0" />
            One call to the model, usually about a minute. It lands as draft days
            for you to review — nothing reaches the athlete until you publish.
          </AlertDescription>
        </Alert>
      ) : null}

      {showCoverage && coverage ? (
        <Alert variant={coverage.missing.length ? 'default' : 'default'}>
          <AlertDescription className="space-y-1">
            <span className="block">
              <strong>Trained:</strong>{' '}
              {coverage.covered.length
                ? coverage.covered.map((n) => STATION_NAME[n]).join(', ')
                : 'none yet'}
            </span>
            {coverage.missing.length ? (
              <span className="block text-muted-foreground">
                <strong>Not yet:</strong>{' '}
                {coverage.missing.map((n) => STATION_NAME[n]).join(', ')}
              </span>
            ) : (
              <span className="block text-emerald-700">All eight covered.</span>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <Fortnight program={program} basePath={`/admin/coach/${program.id}`} />
    </div>
  );
}
