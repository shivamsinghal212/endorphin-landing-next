'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { EQUIPMENT, KIT_PRESETS } from '@/lib/coach-api';

/**
 * Equipment selection.
 *
 * Twenty-nine checkboxes is the slowest part of setting up an athlete, and on a
 * phone it is twenty-nine separate taps down a list. The cohort actually falls
 * into three profiles, so a preset is one tap and the full list stays available
 * behind "Customise" — progressive disclosure rather than a wall of choices.
 *
 * Rare race equipment (SkiErg, sled, rower) sits in its own group at the bottom,
 * because mixing "yoga mat" and "sled" in one alphabetical list makes both
 * harder to find.
 */
export function KitPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (kit: string[]) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const selected = React.useMemo(() => new Set(value), [value]);

  const activePreset = KIT_PRESETS.find(
    (p) =>
      p.kit.length === value.length && p.kit.every((k) => selected.has(k)),
  );

  const toggle = (slug: string) => {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange([...next]);
  };

  const common = EQUIPMENT.filter((e) => !e.rare);
  const rare = EQUIPMENT.filter((e) => e.rare);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {KIT_PRESETS.map((preset) => {
          const active = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange([...preset.kit])}
              aria-pressed={active}
              className={cn(
                // 44px+ target, and the whole card is the target on a phone.
                'relative rounded-lg border p-3 text-left min-h-16 transition-colors',
                'hover:border-primary/60 active:bg-accent',
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-inset ring-primary'
                  : 'border-input',
              )}
            >
              {active ? (
                <Check className="absolute top-2.5 right-2.5 size-4 text-primary" />
              ) : null}
              <span className="block text-sm font-semibold pr-6">{preset.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {preset.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-normal">
          {value.length} item{value.length === 1 ? '' : 's'} selected
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-9 px-2"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide the full list' : 'Customise'}
          <ChevronDown
            className={cn('ml-1 size-4 transition-transform', expanded && 'rotate-180')}
          />
        </Button>
      </div>

      {expanded ? (
        <div className="rounded-lg border p-3 space-y-4">
          <fieldset className="space-y-1">
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Common
            </legend>
            <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {common.map((e) => (
                <KitRow
                  key={e.slug}
                  slug={e.slug}
                  label={e.label}
                  checked={selected.has(e.slug)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1">
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Race equipment · most athletes don&apos;t have these
            </legend>
            <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
              {rare.map((e) => (
                <KitRow
                  key={e.slug}
                  slug={e.slug}
                  label={e.label}
                  checked={selected.has(e.slug)}
                  onToggle={toggle}
                />
              ))}
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            Anything they don&apos;t have gets swapped for something they do —
            a sled becomes an incline treadmill march, a SkiErg becomes band work.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function KitRow({
  slug,
  label,
  checked,
  onToggle,
}: {
  slug: string;
  label: string;
  checked: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    // The label wraps the checkbox so the whole 44px row is tappable.
    <Label
      htmlFor={`kit-${slug}`}
      className="flex items-center gap-2.5 min-h-11 cursor-pointer font-normal text-sm"
    >
      <Checkbox
        id={`kit-${slug}`}
        checked={checked}
        onCheckedChange={() => onToggle(slug)}
      />
      {label}
    </Label>
  );
}
