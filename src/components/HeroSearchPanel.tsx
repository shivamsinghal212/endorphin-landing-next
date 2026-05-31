'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DISCOVER_BASE = 'https://api.endorfin.run/api/v1';

// ─── /discover response shapes (copied from the API spec) ───────────────
type DiscoverKind = 'club' | 'race' | 'club_event';

interface ClubEventPreview {
  id: string;
  title: string;
  startTime: string;
  locationName: string | null;
  distanceKm: number | null;
  eventType: string | null;
}

export interface DiscoverHit {
  kind: DiscoverKind;
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  city: string | null;
  locationName: string | null;
  startTime: string | null;
  endTime: string | null;
  distanceKm: number | null;
  eventType: string | null;
  clubId: string | null;
  clubSlug: string | null;
  clubName: string | null;
  // Only populated for kind=club (read from the server's join on
  // clubs.stats / clubs.* / a batched next-event lookup).
  members: number | null;
  tags: string[];
  isVerified: boolean;
  establishedYear: number | null;
  nextEvent: ClubEventPreview | null;
  score: number;
  matchingEvents: ClubEventPreview[];
}

interface SmartParsed {
  q: string | null;
  kind: DiscoverKind | 'all';
  city: string | null;
  eventsWindow: 'today' | 'tomorrow' | 'this_weekend' | 'next_7d' | 'this_month' | null;
  dateFrom: string | null;
  dateTo: string | null;
  distanceMin: number | null;
  distanceMax: number | null;
  eventTypes: string[];
  tags: string[];
  sort: string | null;
  confidence: number;
  offTopic: boolean;
  notes: string | null;
}

// One response shape now — the backend collapsed /discover and /discover/smart
// into a single endpoint that returns parsed=null when no q was sent.
interface DiscoverResponse {
  items: DiscoverHit[];
  total: number;
  limit: number;
  offset: number;
  parsed: SmartParsed | null;
  facets: null | {
    kinds: { value: string; count: number }[];
    cities: { value: string; count: number }[];
  };
}

// ─── Filter state ──────────────────────────────────────────────────────
type EventsWindow = 'this_weekend' | 'tomorrow' | 'today' | 'next_7d' | 'this_month';
type KindFilter = 'all' | DiscoverKind;

interface FilterState {
  q: string;
  kind: KindFilter;
  city: string;
  tags: string[];
  eventsWindow: EventsWindow | '';
  // dateFrom/dateTo mirror the eventsWindow but apply to races + club_events.
  // We send both because eventsWindow ONLY filters club rows (and attaches
  // matchingEvents); without dateFrom/To, races leak through unfiltered.
  dateFrom: string;
  dateTo: string;
  distanceMin: number | null;
  distanceMax: number | null;
}

const INITIAL_FILTERS: FilterState = {
  q: '',
  kind: 'all',
  city: '',
  tags: [],
  eventsWindow: '',
  dateFrom: '',
  dateTo: '',
  distanceMin: null,
  distanceMax: null,
};

// Compute UTC ISO bounds for a window relative to "now" in the runner's
// local timezone (IST for the typical Endorfin user). Sent alongside the
// eventsWindow shortcut so all three kinds get filtered, not just clubs.
function windowBounds(w: EventsWindow): { from: string; to: string } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  let from: Date;
  let to: Date;
  if (w === 'today') {
    from = startOfDay(now);
    to = addDays(from, 1);
  } else if (w === 'tomorrow') {
    from = addDays(startOfDay(now), 1);
    to = addDays(from, 1);
  } else if (w === 'this_weekend') {
    // Saturday 00:00 → Monday 00:00 (covers Sat + Sun).
    // The (6-day+7)%7 trick silently skipped to *next* Saturday on Sundays
    // because (6-0+7)%7=6. Special-case Sat/Sun so "this weekend" means
    // the weekend we're currently in, not the next one.
    const day = now.getDay(); // 0=Sun .. 6=Sat
    if (day === 0) {
      // Sunday — show today (the remaining Sunday). Saturday already passed.
      from = startOfDay(now);
      to = addDays(from, 1);
    } else if (day === 6) {
      // Saturday — show today + tomorrow.
      from = startOfDay(now);
      to = addDays(from, 2);
    } else {
      // Weekday — jump to upcoming Saturday.
      from = addDays(startOfDay(now), 6 - day);
      to = addDays(from, 2);
    }
  } else if (w === 'next_7d') {
    from = startOfDay(now);
    to = addDays(from, 7);
  } else {
    // this_month — to end of current calendar month (exclusive)
    from = startOfDay(now);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function applyWindow(w: EventsWindow): Partial<FilterState> {
  const { from, to } = windowBounds(w);
  return { eventsWindow: w, dateFrom: from, dateTo: to };
}

function clearWindow(): Partial<FilterState> {
  return { eventsWindow: '', dateFrom: '', dateTo: '' };
}

// Mirror the backend's merge rule on the client so the UI controls (kind
// tab, city dropdown, chip toggles) reflect what the search actually used.
// Each slot: if the user set something explicit, keep it; otherwise let
// the parser fill in. The backend does the same merge — this just makes
// the UI state match what was sent over the wire.
function mergeParsedIntoFilters(prev: FilterState, parsed: SmartParsed): FilterState {
  // Resolve window → local date bounds when filling in from parsed, so
  // chip de-activation works (isChipActive compares eventsWindow).
  const inferredWindow = prev.eventsWindow || parsed.eventsWindow || '';
  const dateBounds = inferredWindow && !prev.dateFrom
    ? windowBounds(inferredWindow as EventsWindow)
    : { from: prev.dateFrom || parsed.dateFrom || '', to: prev.dateTo || parsed.dateTo || '' };
  return {
    ...prev,
    // `q` always becomes the residual free-text from the parser (may be null)
    q: parsed.q ?? '',
    kind: prev.kind !== 'all' ? prev.kind : (parsed.kind === 'all' ? 'all' : parsed.kind),
    city: prev.city || parsed.city || '',
    tags: prev.tags.length > 0 ? prev.tags : (parsed.tags ?? []),
    eventsWindow: inferredWindow,
    dateFrom: dateBounds.from,
    dateTo: dateBounds.to,
    distanceMin: prev.distanceMin !== null ? prev.distanceMin : parsed.distanceMin,
    distanceMax: prev.distanceMax !== null ? prev.distanceMax : parsed.distanceMax,
  };
}

// Quick chips — mapped to the structured filters where possible, free text where not.
// Each chip is exclusive within its group so toggling stays predictable.
export type QuickChip = {
  key: string;
  label: string;
  group: 'when' | 'distance' | 'tag' | 'city';
  apply: (s: FilterState) => Partial<FilterState>;
};

// Default chip set used when no custom set is passed. Tailored for the
// homepage (mixed-kind) experience. Listing pages (e.g. /clubs) pass a
// kind-appropriate chip set via the quickChips prop.
const DEFAULT_QUICK_CHIPS: QuickChip[] = [
  { key: 'weekend', label: 'This weekend', group: 'when', apply: () => applyWindow('this_weekend') },
  { key: 'tomorrow', label: 'Tomorrow', group: 'when', apply: () => applyWindow('tomorrow') },
  { key: '5k', label: '5K', group: 'distance', apply: () => ({ distanceMin: 5, distanceMax: 5 }) },
  { key: '10k', label: '10K', group: 'distance', apply: () => ({ distanceMin: 10, distanceMax: 10 }) },
  { key: 'half', label: 'Half marathon', group: 'distance', apply: () => ({ distanceMin: 21, distanceMax: 21 }) },
  { key: 'women', label: 'Women only', group: 'tag', apply: (s) => ({ tags: toggleTag(s.tags, 'women-only') }) },
  { key: 'beginner', label: 'Beginner friendly', group: 'tag', apply: (s) => ({ tags: toggleTag(s.tags, 'beginner-friendly') }) },
];

// Useful when callers want to compose their own chip set from familiar
// pieces (e.g. /clubs uses TAG_CHIPS but skips the time/distance chips).
export const TAG_CHIPS: QuickChip[] = [
  DEFAULT_QUICK_CHIPS[5]!, // women only
  DEFAULT_QUICK_CHIPS[6]!, // beginner friendly
];

// Build a city chip on the fly — useful when the caller wants top-N
// cities from facet data driving the chip rail.
export function cityChip(city: string, label?: string): QuickChip {
  return {
    key: `city:${city.toLowerCase()}`,
    label: label ?? city,
    group: 'city',
    apply: () => ({ city }),
  };
}

const KIND_TABS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'club', label: 'Run clubs' },
  { key: 'race', label: 'Races' },
  { key: 'club_event', label: 'Club events' },
];

// City options for the results-section location dropdown. Canonical names
// match TOP_CITIES from src/lib/cities so the city param the API receives
// lines up with what it returns in facets.
const CITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All India' },
  { value: 'Delhi/NCR', label: 'Delhi/NCR' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
];

function toggleTag(tags: string[], t: string) {
  return tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
}

const PAGE_SIZE = 24;

// When no explicit time chip is active, fall back to "now onward" so events
// that already started today don't surface as upcoming results.
function defaultDateFloor(): { from: string; to: string } {
  const now = new Date();
  const oneYearOut = new Date(now);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  return { from: now.toISOString(), to: oneYearOut.toISOString() };
}

// Single endpoint: GET /discover/smart accepts text + structured filters
// together. When q is present, the backend runs Kip first to fill in
// anything not explicitly set; explicit params always beat parsed values.
// When q is empty, the backend skips Kip and runs a pure structured search.
function buildUrl(f: FilterState, offset: number): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.kind !== 'all') params.set('kind', f.kind);
  if (f.city) params.set('city', f.city);
  for (const t of f.tags) params.append('tags', t);
  if (f.eventsWindow) params.set('eventsWindow', f.eventsWindow);
  // dateFrom/dateTo are sent as a pair when set (server requires it). When
  // the user hasn't picked a time chip, default to "now onward" so past
  // events get filtered out.
  const bounds = f.dateFrom && f.dateTo ? { from: f.dateFrom, to: f.dateTo } : defaultDateFloor();
  params.set('dateFrom', bounds.from);
  params.set('dateTo', bounds.to);
  if (f.distanceMin != null) params.set('distanceMin', String(f.distanceMin));
  if (f.distanceMax != null) params.set('distanceMax', String(f.distanceMax));
  params.set('sort', 'upcoming');
  params.set('limit', String(PAGE_SIZE));
  if (offset > 0) params.set('offset', String(offset));
  // Facets only matter on page 1 — they're query-scoped, not page-scoped,
  // so re-requesting on every offset wastes bytes.
  if (offset === 0) params.set('includeFacets', 'true');
  return `${DISCOVER_BASE}/discover/smart?${params.toString()}`;
}

function hasAnyInput(f: FilterState): boolean {
  return (
    f.q.trim().length > 0 ||
    f.kind !== 'all' ||
    !!f.city ||
    f.tags.length > 0 ||
    !!f.eventsWindow ||
    f.distanceMin != null
  );
}

// ─── Component ─────────────────────────────────────────────────────────

export interface HeroSearchPanelProps {
  // Lock the search to a single kind. /clubs passes 'club', /running-events
  // passes 'race'. When set, kind tabs in results are hidden and initial
  // filters start pre-locked. Backend's explicit-wins merge means typed NL
  // queries also stay within this kind.
  kindLock?: DiscoverKind;
  // Placeholder text for the search input. Defaults adapt to kindLock.
  placeholder?: string;
  // Auto-focus the input on mount — useful when this panel lives inside
  // an overlay (header search) so the user can start typing immediately.
  autoFocus?: boolean;
  // Called when search state transitions between "no commit yet" and
  // "active commit". Parents (/clubs, /running-events) use this to hide
  // their static carousels/grids while a search is active.
  onSearchActiveChange?: (active: boolean) => void;
  // Optional close handler. When provided, renders a "Close search" link
  // below the chips — useful inside overlays. Omit on listing pages
  // where the search is permanently embedded.
  onClose?: () => void;
  // Override the chip set. /clubs passes top-cities + Women only +
  // Beginner friendly because club rows don't have a start time or
  // distance — the default "5K / This weekend" chips are nonsensical.
  quickChips?: QuickChip[];
  // Override how each result hit gets rendered. Lets listing pages
  // use their own card design (e.g. /clubs uses the rich ClubCard
  // with Join CTA + members + next-event) instead of the generic
  // v1-discover-card. When omitted, falls back to the generic card.
  renderCard?: (hit: DiscoverHit) => React.ReactNode;
}

function defaultPlaceholder(kindLock?: DiscoverKind): string {
  if (kindLock === 'club') return "Try 'women-only run clubs in delhi'…";
  if (kindLock === 'race') return "Try '5K races in Mumbai this weekend'…";
  if (kindLock === 'club_event') return "Try 'club runs this weekend'…";
  return "Try 'women-only run clubs in delhi' or '5K races this weekend'…";
}

const HeroSearchPanel = ({
  kindLock,
  placeholder,
  autoFocus = false,
  onSearchActiveChange,
  onClose,
  quickChips,
  renderCard,
}: HeroSearchPanelProps) => {
  const chips = quickChips ?? DEFAULT_QUICK_CHIPS;
  // Initial filters honor the kindLock if set, so even before the user
  // submits anything we know to scope by kind.
  const initialFilters = useMemo<FilterState>(
    () => ({ ...INITIAL_FILTERS, ...(kindLock ? { kind: kindLock } : {}) }),
    [kindLock],
  );

  // filters = in-progress selection the user is composing
  // committedFilters = the snapshot last submitted to the API
  // Splitting these enforces "explicit submit" semantics: typing in the
  // input updates filters but does NOT fire a fetch. Pressing Enter, clicking
  // the → button, or clicking a chip commits filters → committedFilters.
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [committedFilters, setCommittedFilters] = useState<FilterState | null>(null);
  const [results, setResults] = useState<DiscoverHit[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [parsed, setParsed] = useState<SmartParsed | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'error'>('idle');
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Live facet counts for the current query, fetched alongside page 1.
  // Drives the kind tabs and city dropdown so the UI only surfaces
  // options that actually have results.
  const [kindFacets, setKindFacets] = useState<Record<string, number>>({});
  // The API omits city facets when the caller already filtered by city
  // (would always be a single bucket). Cache the last known set so the
  // dropdown can still offer other cities to switch to.
  const [cityFacets, setCityFacets] = useState<{ value: string; count: number }[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const update = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  // Patch the filters AND commit in one go — used by chip and tab clicks.
  // Computing `next` from `prev` inside the setter avoids the classic
  // setState→read closure bug. Also resets pagination so we start from
  // page 1 on every new search.
  const commitWithUpdate = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      setOffset(0);
      setCommittedFilters(next);
      return next;
    });
  }, []);

  // Submit whatever's currently in `filters`. Wired to the form's onSubmit
  // (Enter key) and the → button's onClick.
  const submit = useCallback(() => {
    setOffset(0);
    setCommittedFilters({ ...filters });
  }, [filters]);

  // Bump offset by PAGE_SIZE to fetch the next page. Results get appended,
  // not replaced — see the fetch effect below.
  const loadMore = useCallback(() => {
    setOffset((o) => o + PAGE_SIZE);
  }, []);

  const resetAll = useCallback(() => {
    setFilters(initialFilters);
    setCommittedFilters(null);
    setResults(null);
    setParsed(null);
    setStatus('idle');
    setOffset(0);
    setKindFacets({});
    setCityFacets([]);
  }, [initialFilters]);

  // Auto-focus on mount when caller wants it (overlays / "/" keyboard
  // shortcut). Two RAFs to let the input mount and any parent transitions
  // settle first.
  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      });
    }
  }, [autoFocus]);

  // Notify parent when search transitions between idle and active so they
  // can hide/show their own static UI (carousels, featured strips).
  useEffect(() => {
    onSearchActiveChange?.(committedFilters !== null && hasAnyInput(committedFilters));
  }, [committedFilters, onSearchActiveChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ESC clears an active search; with no active search, bubbles to
      // onClose (so overlays can close themselves).
      const target = e.target as HTMLElement | null;
      const insideInput = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key !== 'Escape') return;
      if (insideInput && target !== inputRef.current) return; // foreign field
      if (hasAnyInput(filters)) {
        e.preventDefault();
        resetAll();
      } else if (onClose) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filters, resetAll, onClose]);

  // Fire the search whenever (committedFilters, offset) changes. Typing in
  // the input updates `filters` but never reaches this effect — the user
  // has to commit explicitly via Enter, →, or a chip click. AbortController
  // guards against stale responses when commits happen back-to-back.
  useEffect(() => {
    if (!committedFilters) return;
    if (!hasAnyInput(committedFilters)) {
      setResults(null);
      setParsed(null);
      setStatus('idle');
      return;
    }

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    // First page → full skeleton loader. Load more → just disable the
    // button via loadingMore; keep existing results visible.
    if (offset === 0) setStatus('loading');
    else setLoadingMore(true);

    const url = buildUrl(committedFilters, offset);

    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as DiscoverResponse;
      })
      .then((data) => {
        // Server already returns items in ascending startTime order via
        // sort=upcoming, which is the natural reading order for upcoming
        // events. No client-side resort — that broke pagination because
        // "Load more" would shuffle the grid around.
        setResults((prev) => {
          if (offset === 0) return data.items;
          // Server pagination overlaps when several items share startTime
          // (sort=upcoming isn't stable). Dedupe by id so the same event
          // never lands in the grid twice.
          const seen = new Set((prev ?? []).map((h) => h.id));
          return [...(prev ?? []), ...data.items.filter((h) => !seen.has(h.id))];
        });
        setTotal(data.total);
        setParsed(data.parsed);
        // When the server parsed an NL query, mirror its merge into local
        // filters so the kind tab / city dropdown / quick chips reflect
        // what the search actually used. The backend's merge rule is
        // explicit-wins — mergeParsedIntoFilters mirrors that here.
        // Mutating only `filters` (not committedFilters) keeps the fetch
        // effect from re-firing.
        if (data.parsed && offset === 0) {
          setFilters((prev) => mergeParsedIntoFilters(prev, data.parsed!));
        }
        // Capture facets on page 1 so the kind tabs + city dropdown can
        // hide options with zero results. City facets get cached only
        // when the caller hadn't already narrowed by city.
        if (offset === 0 && data.facets) {
          const kindMap: Record<string, number> = {};
          for (const k of data.facets.kinds) kindMap[k.value] = k.count;
          setKindFacets(kindMap);
          if (!committedFilters.city && data.facets.cities.length > 0) {
            setCityFacets(data.facets.cities);
          }
        }
        setStatus(offset === 0 && data.items.length === 0 ? 'empty' : 'ok');
        setLoadingMore(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setStatus('error');
        setLoadingMore(false);
      });
  }, [committedFilters, offset]);

  // Scroll the results section into view on every commit — initial Enter/→
  // submit, chip click, tab change, or city dropdown change. Runs in an
  // effect (after the section has rendered) so the ref is populated by the
  // time we read it.
  useEffect(() => {
    if (committedFilters && hasAnyInput(committedFilters)) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [committedFilters]);

  const toggleChip = useCallback(
    (chip: QuickChip) => {
      // Chip clicks ARE explicit actions — toggle the filter and commit
      // immediately so the result list updates without a second tap.
      const isActive = isChipActive(chip, filters);
      let patch: Partial<FilterState>;
      if (isActive) {
        if (chip.group === 'when') patch = clearWindow();
        else if (chip.group === 'distance') patch = { distanceMin: null, distanceMax: null };
        else if (chip.group === 'city') patch = { city: '' };
        else patch = chip.apply(filters); // tag — toggle removes it
      } else {
        patch = chip.apply(filters);
      }
      commitWithUpdate(patch);
    },
    [filters, commitWithUpdate],
  );

  const setCity = useCallback(
    (city: string) => {
      commitWithUpdate({ city });
    },
    [commitWithUpdate],
  );

  const setKind = useCallback(
    (kind: KindFilter) => {
      commitWithUpdate({ kind });
    },
    [commitWithUpdate],
  );

  const appliedChips = useMemo(() => buildAppliedChips(filters), [filters]);
  const effectivePlaceholder = placeholder ?? defaultPlaceholder(kindLock);

  // When kindLock is set, dropping a kind chip resets to the locked kind
  // (not 'all'). Same for the kind tab — but we hide the tab strip entirely
  // since there's nothing to switch between.
  const onDropChip = useCallback(
    (chip: AppliedChip) => {
      if (chip.group === 'q') commitWithUpdate({ q: '' });
      else if (chip.group === 'kind') commitWithUpdate({ kind: kindLock ?? 'all' });
      else if (chip.group === 'city') commitWithUpdate({ city: '' });
      else if (chip.group === 'when') commitWithUpdate(clearWindow());
      else if (chip.group === 'distance') commitWithUpdate({ distanceMin: null, distanceMax: null });
      else if (chip.group === 'tag') commitWithUpdate({ tags: filters.tags.filter((t) => t !== chip.value) });
    },
    [commitWithUpdate, kindLock, filters.tags],
  );

  return (
    <>
      <div className="v1-hero-search is-expanded">
        <div className="v1-hero-search-panel">
          <SearchPanel
            filters={filters}
            update={update}
            inputRef={inputRef}
            onClose={onClose}
            onSubmit={submit}
            onChipToggle={toggleChip}
            placeholder={effectivePlaceholder}
            chips={chips}
          />
        </div>
      </div>

      {/* Results appear after the first explicit submit */}
      {committedFilters && hasAnyInput(committedFilters) && (
        <ResultsSection
          sectionRef={resultsRef}
          filters={filters}
          total={total}
          status={status}
          results={results}
          parsed={parsed}
          appliedChips={appliedChips}
          onTabChange={setKind}
          onCityChange={setCity}
          onLoadMore={loadMore}
          isLoadingMore={loadingMore}
          kindFacets={kindFacets}
          cityFacets={cityFacets}
          // Hide the kind tab strip when locked to a single kind — there's
          // nothing for the user to toggle between.
          hideKindTabs={Boolean(kindLock)}
          renderCard={renderCard}
          onDropChip={onDropChip}
          onReset={resetAll}
        />
      )}
    </>
  );
};

export default HeroSearchPanel;

// ─── Sub-components ────────────────────────────────────────────────────

function SearchPanel({
  filters,
  update,
  inputRef,
  onClose,
  onSubmit,
  onChipToggle,
  placeholder,
  chips,
}: {
  filters: FilterState;
  update: (patch: Partial<FilterState>) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onClose?: () => void;
  onSubmit: () => void;
  onChipToggle: (chip: QuickChip) => void;
  placeholder: string;
  chips: QuickChip[];
}) {
  return (
    <>
      {/* Single full-width input with an inline submit. Wrapping in a <form>
          gets us free Enter-to-submit without manual key handlers. */}
      <form
        className="v1-hero-search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="v1-hero-search-input-wrap">
          <SearchIcon />
          <input
            ref={inputRef}
            className="v1-hero-search-input"
            type="text"
            value={filters.q}
            placeholder={placeholder}
            onChange={(e) => update({ q: e.target.value })}
            aria-label="Search clubs, races and events"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>
        <button type="submit" className="v1-hero-search-submit" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </form>

      {/* Quick filters — time window, distance, tags. */}
      <div className="v1-hero-search-chip-group">
        <div className="v1-hero-search-chip-group-label">Quick filters</div>
        <div className="v1-hero-search-chip-row" role="group" aria-label="Quick filters">
          {chips.map((chip) => {
            const active = isChipActive(chip, filters);
            return (
              <button
                key={chip.key}
                type="button"
                className={`v1-chip on-dark ${active ? 'is-active' : ''}`}
                onClick={() => onChipToggle(chip)}
                aria-pressed={active}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {onClose && (
        <button type="button" className="v1-hero-search-close-link" onClick={onClose}>
          Close search ✕
        </button>
      )}
    </>
  );
}

interface AppliedChip {
  group: 'q' | 'kind' | 'city' | 'when' | 'distance' | 'tag';
  label: string;
  value: string;
}

// Applied-chips strip just reads from `filters` — which mergeParsedIntoFilters
// keeps in sync with whatever the search actually applied. No dual-mode
// rendering needed.
function buildAppliedChips(f: FilterState): AppliedChip[] {
  const chips: AppliedChip[] = [];
  if (f.q.trim()) chips.push({ group: 'q', label: `"${f.q.trim()}"`, value: f.q.trim() });
  if (f.city) chips.push({ group: 'city', label: f.city, value: f.city });
  if (f.kind !== 'all') {
    const kindLabel = f.kind === 'club' ? 'Run clubs' : f.kind === 'race' ? 'Races' : 'Club events';
    chips.push({ group: 'kind', label: kindLabel, value: f.kind });
  }
  if (f.eventsWindow) chips.push({ group: 'when', label: formatWindow(f.eventsWindow), value: f.eventsWindow });
  if (f.distanceMin != null && f.distanceMax != null) {
    chips.push({
      group: 'distance',
      label: `${f.distanceMin === f.distanceMax ? f.distanceMin : `${f.distanceMin}–${f.distanceMax}`} KM`,
      value: 'd',
    });
  }
  for (const t of f.tags) chips.push({ group: 'tag', label: t, value: t });
  return chips;
}

function formatWindow(w: string) {
  switch (w) {
    case 'this_weekend': return 'This weekend';
    case 'tomorrow': return 'Tomorrow';
    case 'today': return 'Today';
    case 'next_7d': return 'Next 7 days';
    case 'this_month': return 'This month';
    default: return w;
  }
}

function isChipActive(chip: QuickChip, f: FilterState): boolean {
  if (chip.group === 'when') {
    // Compare eventsWindow only — dateFrom/dateTo in the patch will differ
    // every render because windowBounds() reads `new Date()`.
    const patch = chip.apply(f);
    return f.eventsWindow === patch.eventsWindow;
  }
  if (chip.group === 'distance') {
    const patch = chip.apply(f);
    return f.distanceMin === patch.distanceMin && f.distanceMax === patch.distanceMax;
  }
  if (chip.group === 'city') {
    const patch = chip.apply(f);
    return f.city === patch.city;
  }
  if (chip.group === 'tag') {
    // chip.apply toggles, so check the input would be present in current state
    const tag = chip.key === 'women' ? 'women-only' : chip.key === 'beginner' ? 'beginner-friendly' : '';
    return tag ? f.tags.includes(tag) : false;
  }
  return false;
}

// ─── Results section ───────────────────────────────────────────────────

function ResultsSection({
  filters,
  total,
  status,
  results,
  parsed,
  appliedChips,
  onDropChip,
  onReset,
  onTabChange,
  onCityChange,
  onLoadMore,
  isLoadingMore,
  kindFacets,
  cityFacets,
  hideKindTabs = false,
  renderCard,
  sectionRef,
}: {
  filters: FilterState;
  total: number;
  status: 'idle' | 'loading' | 'ok' | 'empty' | 'error';
  results: DiscoverHit[] | null;
  parsed: SmartParsed | null;
  appliedChips: AppliedChip[];
  onDropChip: (chip: AppliedChip) => void;
  onReset: () => void;
  onTabChange: (kind: KindFilter) => void;
  onCityChange: (city: string) => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  kindFacets: Record<string, number>;
  cityFacets: { value: string; count: number }[];
  hideKindTabs?: boolean;
  renderCard?: (hit: DiscoverHit) => React.ReactNode;
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Hide a kind tab if its facet count is 0. The "All" tab always renders.
  // If facets haven't loaded yet (kindFacets empty) we render everything
  // so the UI doesn't blink on first paint.
  const facetsLoaded = Object.keys(kindFacets).length > 0;
  const visibleKindTabs = KIND_TABS.filter((tab) => {
    if (tab.key === 'all') return true;
    if (!facetsLoaded) return true;
    return (kindFacets[tab.key] ?? 0) > 0;
  });

  // City dropdown options come from facets when present, otherwise fall
  // back to the canonical TOP_CITIES list. "All India" always heads it.
  const cityOptions: { value: string; label: string; count?: number }[] = [
    { value: '', label: 'All India' },
    ...(cityFacets.length > 0
      ? cityFacets.map((c) => ({ value: c.value, label: c.value, count: c.count }))
      : CITY_OPTIONS.slice(1)),
  ];
  return (
    <section className="v1-discover-results" ref={sectionRef}>
        <div className="container">
          <div className="v1-discover-head">
            <div>
              <span className="v1-discover-state-tag">
                {status === 'loading' ? 'Searching' : status === 'empty' ? 'No results' : 'Results'}
              </span>
              <h2 className="v1-discover-title">
                {status === 'empty'
                  ? <>0 matches.</>
                  : status === 'loading'
                    ? <>Searching the directory…</>
                    : <><b>{total.toLocaleString('en-IN')}</b> {total === 1 ? 'match' : 'matches'}.</>
                }
              </h2>
            </div>
            <button type="button" className="v1-btn v1-btn-ghost" onClick={onReset}>
              Clear search
            </button>
          </div>

          {/* parsed.notes is the parser's debug breadcrumb ("Tag
              identified but kind and city are ambiguous…") — useful in
              dev, jarring for users. Keep the off-topic guard (real
              user-facing message) but hide the verbose notes. */}
          {parsed && parsed.offTopic && (
            <p className="v1-discover-note">
              That doesn&rsquo;t look like a running query. Try &ldquo;run clubs in Bangalore&rdquo; or &ldquo;5K races this weekend&rdquo;.
            </p>
          )}

          {appliedChips.length > 0 && (
            <div className="v1-discover-applied">
              <span className="v1-discover-applied-lbl">Filters</span>
              {appliedChips.map((chip, i) => (
                <span key={`${chip.group}-${chip.value}-${i}`} className="v1-discover-applied-chip">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label}`}
                    onClick={() => onDropChip(chip)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Toolbar: kind tabs on the left, location select on the right.
              Both refine the current result set, so they sit together.
              Tabs and city options are data-driven from facets — anything
              with zero results gets hidden so the UI never offers a dead
              filter. */}
          <div className={`v1-discover-toolbar ${hideKindTabs ? 'is-no-tabs' : ''}`}>
            {!hideKindTabs && (
              <div className="v1-discover-tabs" role="tablist" aria-label="Result kind">
                {visibleKindTabs.map((tab) => {
                  const count = tab.key === 'all'
                    ? Object.values(kindFacets).reduce((a, b) => a + b, 0)
                    : (kindFacets[tab.key] ?? 0);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`v1-discover-tab ${filters.kind === tab.key ? 'is-active' : ''}`}
                      onClick={() => onTabChange(tab.key)}
                      role="tab"
                      aria-selected={filters.kind === tab.key}
                    >
                      {tab.label}
                      {facetsLoaded && <span className="v1-discover-tab-count">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <label className="v1-discover-city">
              <span className="v1-discover-city-lbl">Location</span>
              <span className="v1-discover-city-val">
                {cityOptions.find((c) => c.value === filters.city)?.label ?? 'All India'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
              <select
                value={filters.city}
                onChange={(e) => onCityChange(e.target.value)}
                aria-label="Filter by city"
              >
                {cityOptions.map((c) => (
                  <option key={c.value || 'all'} value={c.value}>
                    {c.label}{c.count != null ? ` · ${c.count}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {status === 'loading' && (
            <div className="v1-discover-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="v1-discover-card is-skeleton" aria-hidden="true" />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="v1-discover-empty">
              <h3>Something went wrong.</h3>
              <p>We couldn&rsquo;t reach the directory right now. Try again in a moment.</p>
            </div>
          )}

          {status === 'empty' && !parsed?.offTopic && (
            <div className="v1-discover-empty">
              <span className="v1-discover-empty-kic">Nothing on the calendar</span>
              <h3>Looks empty over here.</h3>
              <p>No matches for these filters. Drop one or two and try again.</p>
              <div className="v1-discover-empty-actions">
                {appliedChips.slice(0, 3).map((chip, i) => (
                  <button key={i} type="button" className="v1-chip" onClick={() => onDropChip(chip)}>
                    Drop · {chip.label}
                  </button>
                ))}
                {/* Reset All shares the chip size/shape — using a full
                    v1-btn made it tower over the drop chips. The .is-reset
                    modifier tints it red so it's still clearly "the action"
                    rather than another filter chip. */}
                <button
                  type="button"
                  className="v1-chip v1-chip-reset"
                  onClick={onReset}
                >
                  ↺ Reset all
                </button>
              </div>
            </div>
          )}

          {status === 'ok' && results && (
            // Caller-provided card renderer? Use a layout class the caller
            // can target (`.v1-discover-grid-custom`) and React expects
            // the rendered nodes to carry their own keys. Falls back to
            // the generic ResultCard otherwise.
            <div className={renderCard ? 'v1-discover-grid-custom' : 'v1-discover-grid'}>
              {results.map((hit) =>
                renderCard
                  ? renderCard(hit)
                  : <ResultCard key={`${hit.kind}-${hit.id}`} hit={hit} />,
              )}
            </div>
          )}

          {status === 'ok' && (results?.length ?? 0) > 0 && (
            <div className="v1-discover-more">
              <span className="v1-discover-more-count">
                Showing {(results?.length ?? 0).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
              </span>
              {total > (results?.length ?? 0) && (
                <button
                  type="button"
                  className="v1-btn v1-btn-ghost"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
  );
}

// ─── Single result card ────────────────────────────────────────────────

function ResultCard({ hit }: { hit: DiscoverHit }) {
  const href =
    hit.kind === 'club' && hit.slug
      ? `/clubs/${hit.slug}`
      : hit.kind === 'race' && hit.slug
        ? `/running-events/${hit.slug}`
        : hit.clubSlug
          ? `/clubs/${hit.clubSlug}`
          : '#';
  const kindLabel = hit.kind === 'club' ? 'Run club' : hit.kind === 'race' ? 'Race' : 'Club event';
  const initials = pickInitials(hit.title);
  // Safe to call Date.now() here — ResultCard only renders inside
  // ResultsSection which is gated behind expanded + hasAnyInput, so it
  // never reaches SSR and can't cause a hydration mismatch.
  const isPast = hit.startTime ? new Date(hit.startTime).getTime() < Date.now() : false;

  return (
    <Link className="v1-discover-card" href={href}>
      <div className="v1-discover-card-header">
        <div className="v1-discover-card-fallback">{initials}</div>
        {hit.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.imageUrl} alt="" loading="lazy" />
        )}
        {isPast && <span className="v1-discover-card-past">Past event</span>}
      </div>
      <div className="v1-discover-card-body">
        <div className="v1-discover-card-kind">{kindLabel}{hit.city ? ` · ${hit.city}` : ''}</div>
        <h3 className="v1-discover-card-title">{hit.title}</h3>
        {hit.subtitle && <p className="v1-discover-card-sub">{hit.subtitle}</p>}
        <div className="v1-discover-card-meta">
          {hit.startTime && <span>{formatDateShort(hit.startTime)}</span>}
          {hit.distanceKm != null && <span>{hit.distanceKm}K</span>}
          {hit.locationName && <span>{hit.locationName}</span>}
          {hit.clubName && hit.kind === 'club_event' && <span>{hit.clubName}</span>}
        </div>
        {hit.kind === 'club' && hit.matchingEvents.length > 0 && (
          <div className="v1-discover-card-events">
            {hit.matchingEvents.length} event{hit.matchingEvents.length === 1 ? '' : 's'} in window
          </div>
        )}
      </div>
    </Link>
  );
}

function pickInitials(name: string) {
  const words = (name || '').trim().split(/\s+/);
  return ((words[0] || '')[0] || '').toUpperCase() + ((words[1] || '')[0] || '').toUpperCase();
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function SearchIcon() {
  return (
    <svg className="v1-hero-search-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

