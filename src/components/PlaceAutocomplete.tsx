'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { PlaceSuggestion } from '@/app/api/places/route';

export interface PickedPlace {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Location field backed by Google Places, via our own `/api/places` proxy.
 *
 * Free text always wins: if the key isn't configured, the request fails, or
 * the place simply isn't on Google ("the bench by the third gate"), whatever
 * was typed is kept as the location name. Picking a suggestion additionally
 * fills the address and coordinates.
 */
export function PlaceAutocomplete({
  value,
  onChange,
  onPick,
  placeholder = 'Search a place, or type your own',
  id,
  theme = 'light',
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PickedPlace) => void;
  placeholder?: string;
  id?: string;
  /** Palette of the surface this sits on. Defaults to the light studio
   *  theme; the public /create composer is dark. */
  theme?: 'light' | 'dark';
}) {
  const reactId = useId();
  const inputId = id ?? `place-${reactId}`;
  const dark = theme === 'dark';
  const cls = {
    input: dark
      ? 'cx-input w-full px-3 py-2 rounded-xl text-sm outline-none'
      : 'w-full px-3 py-2 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none',
    spinner: dark
      ? 'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-bone/60'
      : 'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-jet/30',
    menu: dark
      ? 'absolute z-30 left-0 right-0 mt-1 bg-[#16151A] border border-bone/15 rounded-xl shadow-[0_18px_50px_rgba(0,0,0,.6)] overflow-hidden max-h-64 overflow-y-auto'
      : 'absolute z-30 left-0 right-0 mt-1 bg-white border border-jet/10 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto',
    optionActive: dark ? 'bg-bone/[0.08]' : 'bg-jet/[0.05]',
    optionSub: dark ? 'block text-xs text-bone/68 truncate' : 'block text-xs text-jet/45 truncate',
  };
  const listId = `${inputId}-listbox`;

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  /** Set when we write the input ourselves, so picking doesn't re-search. */
  const skipNextSearch = useRef(false);
  /** Only search once the person has actually typed. Without this the
   *  effect fires for the value we were seeded with — editing an existing
   *  event, or restoring a draft — and the list springs open unprompted. */
  const hasTyped = useRef(false);

  // Debounced lookup. The abort controller means a slow early keystroke
  // can't land after a fast later one and repopulate a stale list.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!hasTyped.current) return;
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setSuggestions(data?.suggestions ?? []);
        if ((data?.suggestions ?? []).length > 0) setOpen(true);
      } catch {
        // Aborted or offline — leave the last list alone, keep typing usable.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  // Click-outside closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = async (s: PlaceSuggestion) => {
    skipNextSearch.current = true;
    onChange(s.mainText);
    setOpen(false);
    setActive(-1);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/places?placeId=${encodeURIComponent(s.placeId)}`);
      const data = await res.json();
      if (data?.place) {
        onPick({
          name: data.place.name || s.mainText,
          address: data.place.address || '',
          latitude: data.place.latitude,
          longitude: data.place.longitude,
        });
        return;
      }
    } catch {
      // Details lookup failed — fall through and keep what we know.
    }
    onPick({
      name: s.mainText,
      address: [s.mainText, s.secondaryText].filter(Boolean).join(', '),
      latitude: null,
      longitude: null,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      // Only swallow Enter when a suggestion is highlighted, so Enter still
      // submits normally for someone typing a place Google doesn't know.
      e.preventDefault();
      void choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          hasTyped.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={cls.input}
      />

      {loading && (
        <span
          className={cls.spinner}
          aria-hidden
        >
          …
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className={cls.menu}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Pointer-down beats the input's blur, so the click lands.
              onPointerDown={(e) => {
                e.preventDefault();
                void choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 cursor-pointer ${
                i === active ? cls.optionActive : ''
              }`}
            >
              <span className="block text-sm truncate">{s.mainText}</span>
              {s.secondaryText && (
                <span className={cls.optionSub}>
                  {s.secondaryText}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
