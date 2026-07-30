'use client';

import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DAY_ROLE_LABEL, type Day, type Program } from '@/lib/coach-api';

/** Local-date helpers. `toISOString()` would shift the date across midnight in
 *  IST, which silently moves a session to the wrong day. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return isoDate(dt);
}

export function todayIso(): string {
  return isoDate(new Date());
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short' });
}

function dayNumber(iso: string): string {
  return iso.slice(8);
}

function spanDates(program: Program): string[] {
  const out: string[] = [];
  let cursor = program.startDate;
  // Guard against a runaway loop if end < start slips through.
  for (let i = 0; i < 400 && cursor <= program.endDate; i += 1) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

function DayStatus({ day }: { day: Day | undefined }) {
  if (!day) return null;
  if (day.session) {
    const s = day.session.status;
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 py-0 font-semibold',
          s === 'done' && 'border-emerald-600/40 text-emerald-700 bg-emerald-50',
          s === 'skipped' && 'border-muted-foreground/30 text-muted-foreground',
          s === 'partial' && 'border-amber-600/40 text-amber-700 bg-amber-50',
          s === 'in_progress' && 'border-sky-600/40 text-sky-700 bg-sky-50',
        )}
      >
        {s === 'in_progress' ? 'Doing it now' : s}
      </Badge>
    );
  }
  // Draft vs live, in words rather than a colour — the old build used an empty
  // coloured div, which conveyed nothing at all.
  return day.status === 'published' ? (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-600/40 text-emerald-700">
      Live
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-600/40 text-amber-700">
      Draft
    </Badge>
  );
}

function summary(day: Day | undefined): string {
  if (!day) return 'Nothing planned';
  if (day.isRest) return 'Rest';
  const n = day.activities.length;
  if (!n) return 'Nothing planned';
  const mins = day.activities.reduce((t, a) => t + (a.durationMin ?? 0), 0);
  return `${n} workout${n === 1 ? '' : 's'}${mins ? ` · ${mins} min` : ''}`;
}

/**
 * The fortnight.
 *
 * A vertical list on a phone and a 7-across grid from `md` up. A 7-column grid
 * at 375px gives ~44px cells, which is unreadable — and collapsing it to two
 * columns turns two weeks into a long scroll, destroying the one thing this
 * screen is for: judging the *shape* of the block at a glance.
 */
export function Fortnight({
  program,
  basePath,
}: {
  program: Program;
  basePath: string;
}) {
  const byDate = new Map(program.days.map((d) => [d.onDate, d]));
  const dates = spanDates(program);
  const today = todayIso();

  const weeks: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7));

  return (
    <div className="space-y-5">
      {weeks.map((week, wi) => (
        <section key={wi} aria-label={`Week ${wi + 1}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Week {wi + 1}
          </h3>

          {/* Phone: one row per day. 14 rows fit a screen and rest days read as
              lighter rows, so the shape stays legible. */}
          <ul className="md:hidden divide-y rounded-lg border bg-card">
            {week.map((date) => {
              const day = byDate.get(date);
              return (
                <li key={date}>
                  <Link
                    href={`${basePath}/days/${date}`}
                    className={cn(
                      // 56px row: comfortably over the 44px touch minimum.
                      'flex items-center gap-3 px-3 min-h-14 py-2 active:bg-accent',
                      day?.isRest && 'bg-muted/40',
                      date === today && 'ring-1 ring-inset ring-primary',
                    )}
                  >
                    <span className="w-10 shrink-0 text-center">
                      <span className="block text-[10px] uppercase text-muted-foreground font-semibold">
                        {weekday(date)}
                      </span>
                      <span className="block text-sm font-semibold tabular-nums">
                        {dayNumber(date)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {day?.title || (day ? DAY_ROLE_LABEL[day.dayRole] : 'Plan this day')}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {summary(day)}
                      </span>
                    </span>
                    <DayStatus day={day} />
                    {day ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: the grid, where a week reads as a week. */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {week.map((date) => {
              const day = byDate.get(date);
              return (
                <Link
                  key={date}
                  href={`${basePath}/days/${date}`}
                  className={cn(
                    'rounded-lg border bg-card p-2.5 min-h-[104px] flex flex-col gap-1',
                    'hover:border-primary transition-colors',
                    !day && 'border-dashed bg-muted/30',
                    day?.isRest && 'bg-muted/40',
                    date === today && 'ring-1 ring-inset ring-primary',
                  )}
                >
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    {weekday(date)} {dayNumber(date)}
                  </span>
                  <span
                    className={cn(
                      'text-[13px] font-medium leading-tight',
                      !day && 'text-muted-foreground font-normal',
                    )}
                  >
                    {day?.title || (day ? DAY_ROLE_LABEL[day.dayRole] : '+ plan this day')}
                  </span>
                  <span className="mt-auto text-[11px] text-muted-foreground">
                    {summary(day)}
                  </span>
                  <DayStatus day={day} />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
