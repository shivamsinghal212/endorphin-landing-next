'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, MoreVertical, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ROUND_SCORED,
  SECTION_LABEL,
  UNIT_LABEL,
  type QuantityUnit,
  type Section,
} from '@/lib/coach-api';
import type { DraftActivity, DraftLine } from './day-draft';

const SECTIONS: Section[] = ['warmup', 'main', 'finisher', 'cooldown', 'test'];

/**
 * One activity in the day editor.
 *
 * Reorder and delete are deliberately separated: on a phone the ↑ ↓ buttons sit
 * next to each other and a fat-finger tap next to a red × deletes a line the
 * coach meant to move. Destructive actions live in an overflow menu instead.
 */
export function ActivityCard({
  activity,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  onAddExercise,
}: {
  activity: DraftActivity;
  index: number;
  count: number;
  onChange: (next: DraftActivity) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onAddExercise?: () => void;
}) {
  const isCustom = activity.workoutId === null;
  const takesRounds = ROUND_SCORED.includes(activity.scoreType as never);

  const setLine = (i: number, patch: Partial<DraftLine>) => {
    const lines = activity.lines.map((l, n) => (n === i ? { ...l, ...patch } : l));
    onChange({ ...activity, lines });
  };

  const moveLine = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= activity.lines.length) return;
    const lines = [...activity.lines];
    [lines[i], lines[j]] = [lines[j], lines[i]];
    onChange({ ...activity, lines });
  };

  const removeLine = (i: number) =>
    onChange({ ...activity, lines: activity.lines.filter((_, n) => n !== i) });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 border-b flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          {SECTION_LABEL[activity.section]}
        </span>

        {isCustom ? (
          <>
            <Input
              value={activity.title}
              onChange={(e) => onChange({ ...activity, title: e.target.value })}
              placeholder="Name this block"
              className="h-9 w-40 md:w-52"
              aria-label="Block name"
            />
            <Badge variant="outline" className="text-[10px] border-amber-600/40 text-amber-700">
              Built by you
            </Badge>
          </>
        ) : (
          <span className="text-sm font-semibold min-w-0 truncate">{activity.title}</span>
        )}

        <div className="ms-auto flex items-center gap-1">
          {takesRounds ? (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={activity.rounds ?? 1}
                onChange={(e) =>
                  onChange({ ...activity, rounds: Number(e.target.value) || 1 })
                }
                className="h-9 w-14 text-right tabular-nums"
                aria-label="Rounds"
              />
              rounds
            </label>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move this workout earlier in the day"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move this workout later in the day"
          >
            <ArrowDown className="size-4" />
          </Button>

          {/* Destructive actions sit behind a menu so they can't be hit while
              reordering on a phone. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 md:size-9"
                aria-label="More options for this workout"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isCustom ? (
                <div className="p-1">
                  <Select
                    value={activity.section}
                    onValueChange={(v) => onChange({ ...activity, section: v as Section })}
                  >
                    <SelectTrigger className="h-9" aria-label="Where in the day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SECTION_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <DropdownMenuItem
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Remove from this day
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-3">
        {activity.description ? (
          <p className="text-xs text-muted-foreground mb-2.5">{activity.description}</p>
        ) : null}

        <ul className="divide-y">
          {activity.lines.map((line, i) => (
            <li key={`${line.workoutItemId ?? 'x'}-${line.exerciseId ?? 'x'}-${i}`}>
              <LineRow
                line={line}
                index={i}
                count={activity.lines.length}
                showSets={isCustom || activity.scoreType === 'for-load'}
                onChange={(patch) => setLine(i, patch)}
                onMove={(dir) => moveLine(i, dir)}
                onRemove={isCustom ? () => removeLine(i) : undefined}
              />
            </li>
          ))}
        </ul>

        {isCustom && onAddExercise ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-11 md:h-9"
            onClick={onAddExercise}
          >
            <Plus className="size-4 mr-1" />
            Add an exercise
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LineRow({
  line,
  index,
  count,
  showSets,
  onChange,
  onMove,
  onRemove,
}: {
  line: DraftLine;
  index: number;
  count: number;
  showSets: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="py-2 flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:min-w-[9rem]">
        <span className="block text-sm">{line.name}</span>
        {line.substitutedFor ? (
          <span className="block text-xs text-amber-700">
            swapped in — they don&apos;t have {line.substitutedFor}
          </span>
        ) : null}
      </div>

      {showSets ? (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={line.sets ?? 1}
            onChange={(e) => onChange({ sets: Number(e.target.value) || 1 })}
            className="h-11 md:h-9 w-14 text-right tabular-nums"
            aria-label={`Sets of ${line.name}`}
          />
          sets
        </label>
      ) : null}

      <QtyField
        value={line.qty1}
        unit={line.qty1Unit}
        options={line.units1}
        name={line.name}
        slot={1}
        onValue={(qty1) => onChange({ qty1 })}
        onUnit={(qty1Unit) => onChange({ qty1Unit })}
      />
      <QtyField
        value={line.qty2}
        unit={line.qty2Unit}
        options={line.units2}
        name={line.name}
        slot={2}
        onValue={(qty2) => onChange({ qty2 })}
        onUnit={(qty2Unit) => onChange({ qty2Unit })}
      />

      <div className="flex items-center gap-1 ms-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`Move ${line.name} up`}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label={`Move ${line.name} down`}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 md:size-8 text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${line.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** A number plus its unit. `inputMode="numeric"` so a phone shows a number pad
 *  rather than the full keyboard — this is the most-typed control in the tool. */
function QtyField({
  value,
  unit,
  options,
  name,
  slot,
  onValue,
  onUnit,
}: {
  value: number | null;
  unit: QuantityUnit | null;
  options: QuantityUnit[];
  name: string;
  slot: 1 | 2;
  onValue: (v: number | null) => void;
  onUnit: (u: QuantityUnit) => void;
}) {
  if (!unit && !options.length) return null;
  const active = unit ?? options[0];

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value ?? ''}
        onChange={(e) => onValue(e.target.value === '' ? null : Number(e.target.value))}
        className={cn('h-11 md:h-9 w-20 text-right tabular-nums')}
        aria-label={`${name} amount ${slot}`}
      />
      {options.length > 1 ? (
        <Select value={active} onValueChange={(v) => onUnit(v as QuantityUnit)}>
          <SelectTrigger
            className="h-11 md:h-9 w-[7.5rem]"
            aria-label={`${name} unit ${slot}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((u) => (
              <SelectItem key={u} value={u}>
                {UNIT_LABEL[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-xs text-muted-foreground w-[4.5rem]">
          {UNIT_LABEL[active]}
        </span>
      )}
    </div>
  );
}
