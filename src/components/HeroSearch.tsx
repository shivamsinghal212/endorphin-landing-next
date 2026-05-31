'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';

const RIBBON_ITEMS = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail', 'Run', 'Connect', 'Train', 'Repeat'];

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

interface DiscoverHit {
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
const QUICK_CHIPS: Array<{
  key: string;
  label: string;
  group: 'when' | 'distance' | 'tag';
  apply: (s: FilterState) => Partial<FilterState>;
}> = [
  { key: 'weekend', label: 'This weekend', group: 'when', apply: () => applyWindow('this_weekend') },
  { key: 'tomorrow', label: 'Tomorrow', group: 'when', apply: () => applyWindow('tomorrow') },
  { key: '5k', label: '5K', group: 'distance', apply: () => ({ distanceMin: 5, distanceMax: 5 }) },
  { key: '10k', label: '10K', group: 'distance', apply: () => ({ distanceMin: 10, distanceMax: 10 }) },
  { key: 'half', label: 'Half marathon', group: 'distance', apply: () => ({ distanceMin: 21, distanceMax: 21 }) },
  { key: 'women', label: 'Women only', group: 'tag', apply: (s) => ({ tags: toggleTag(s.tags, 'women-only') }) },
  { key: 'beginner', label: 'Beginner friendly', group: 'tag', apply: (s) => ({ tags: toggleTag(s.tags, 'beginner-friendly') }) },
];

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

interface HeroStats {
  clubs: number;
  races: number;
  clubEvents: number;
  cities: number;
}

interface HeroSearchProps {
  stats?: HeroStats;
}

// Round down to a clean "X+" floor so 47 reads as "40+" — feels honest
// without putting an exact moving number in the marquee.
function formatStat(n: number): string {
  if (n >= 1000) {
    const k = Math.floor(n / 100) / 10; // e.g. 12345 → 12.3
    return `${k}K+`;
  }
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10) return `${Math.floor(n / 10) * 10}+`;
  return `${n}`;
}

const HeroSearch = ({ stats }: HeroSearchProps) => {
  const [expanded, setExpanded] = useState(false);
  // filters = in-progress selection the user is composing
  // committedFilters = the snapshot last submitted to the API
  // Splitting these enforces "explicit submit" semantics: typing in the
  // input updates filters but does NOT fire a fetch. Pressing Enter, clicking
  // the → button, or clicking a chip commits filters → committedFilters.
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
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
    setFilters(INITIAL_FILTERS);
    setCommittedFilters(null);
    setResults(null);
    setParsed(null);
    setStatus('idle');
    setOffset(0);
    setKindFacets({});
    setCityFacets([]);
  }, []);

  // Expand the search panel and focus the input. `/` keyboard shortcut wires
  // the same behavior so power users don't have to click the pill.
  const expand = useCallback(() => {
    setExpanded(true);
    // wait for the input to mount/transition before focusing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't trigger when the user is typing in another field
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === '/' && !expanded) {
        e.preventDefault();
        expand();
      }
      if (e.key === 'Escape' && expanded) {
        if (hasAnyInput(filters)) {
          resetAll();
        } else {
          setExpanded(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, expand, filters, resetAll]);

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
    (chip: (typeof QUICK_CHIPS)[number]) => {
      // Chip clicks ARE explicit actions — toggle the filter and commit
      // immediately so the result list updates without a second tap.
      const isActive = isChipActive(chip, filters);
      let patch: Partial<FilterState>;
      if (isActive) {
        if (chip.group === 'when') patch = clearWindow();
        else if (chip.group === 'distance') patch = { distanceMin: null, distanceMax: null };
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

  return (
    <>
      <section className="v1-hero">
        <div className="v1-hero-bg" aria-hidden="true" />
        <div className="container">
          <div className="v1-hero-topline">
            <span className="v1-hero-kicker">Powering India&apos;s running landscape</span>
            <span className="v1-hero-meta">Est. 2025 · Made in India</span>
          </div>

          <h1 className="v1-hero-title">
            Find Running events, clubs and more<span className="accent">..</span>
          </h1>

          {/* ─── Search ───
              Both the trigger pill AND the expanded panel are always
              mounted. The .is-expanded class on the outer div crossfades
              them via opacity + max-height. Rendering both keeps the
              transition smooth instead of swapping JSX in/out, and lets
              the input keep focus state across collapse-then-expand. */}
          <div className={`v1-hero-search ${expanded ? 'is-expanded' : ''}`}>
            <button
              type="button"
              className="v1-hero-search-trigger"
              onClick={expand}
              aria-label="Search clubs, races and events"
              aria-hidden={expanded}
              tabIndex={expanded ? -1 : 0}
            >
              <SearchIcon />
              <span className="v1-hero-search-trigger-text">
                Search 870+ clubs, races and community runs
              </span>
              <span className="v1-hero-search-kbd" aria-hidden="true">/</span>
            </button>
            <div
              className="v1-hero-search-panel"
              aria-hidden={!expanded}
              // `inert` is the modern way to take an entire subtree out of
              // the tab order and accessibility tree. React 19 supports it
              // as a real boolean prop.
              inert={!expanded}
            >
              <SearchPanel
                filters={filters}
                update={update}
                inputRef={inputRef}
                onClose={() => {
                  setExpanded(false);
                  resetAll();
                }}
                onSubmit={submit}
                onChipToggle={toggleChip}
              />
            </div>
          </div>

          <div className="v1-hero-stats-bar">
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.clubs) : '50+'}</span>
              <span className="v1-hero-stat-l">Run Clubs</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.races) : '500+'}</span>
              <span className="v1-hero-stat-l">Races</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.clubEvents) : '100+'}</span>
              <span className="v1-hero-stat-l">Club Events</span>
            </span>
            <span className="v1-hero-stat">
              <span className="v1-hero-stat-n">{stats ? formatStat(stats.cities) : '25+'}</span>
              <span className="v1-hero-stat-l">Cities Covered</span>
            </span>
          </div>

          <div className="v1-hero-cta-row" id="download">
            <Link href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-primary">
              <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"/></svg>
              Google Play
            </Link>
            <Link href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-ghost">
              <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"/></svg>
              App Store
            </Link>
          </div>
        </div>
      </section>

      <div className="v1-ribbon" aria-hidden="true">
        <div className="v1-ribbon-track">
          {[...Array(4)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex' }}>
              {RIBBON_ITEMS.map((item, j) => (
                <span key={`${i}-${j}`}>{item} ·</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Results appear after the first explicit submit ─── */}
      {expanded && committedFilters && hasAnyInput(committedFilters) && (
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
          onDropChip={(chip) => {
            // Dropping a chip is itself an explicit action → re-commit
            // immediately so results update without a second click.
            if (chip.group === 'q') commitWithUpdate({ q: '' });
            else if (chip.group === 'kind') commitWithUpdate({ kind: 'all' });
            else if (chip.group === 'city') commitWithUpdate({ city: '' });
            else if (chip.group === 'when') commitWithUpdate(clearWindow());
            else if (chip.group === 'distance') commitWithUpdate({ distanceMin: null, distanceMax: null });
            else if (chip.group === 'tag') commitWithUpdate({ tags: filters.tags.filter((t) => t !== chip.value) });
          }}
          onReset={resetAll}
        />
      )}
    </>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────

function SearchPanel({
  filters,
  update,
  inputRef,
  onClose,
  onSubmit,
  onChipToggle,
}: {
  filters: FilterState;
  update: (patch: Partial<FilterState>) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSubmit: () => void;
  onChipToggle: (chip: (typeof QUICK_CHIPS)[number]) => void;
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
            placeholder="Try ‘women-only run clubs in delhi’ or ‘5K races this weekend’…"
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
          {QUICK_CHIPS.map((chip) => {
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

      <button type="button" className="v1-hero-search-close-link" onClick={onClose}>
        Close search ✕
      </button>
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

function isChipActive(chip: (typeof QUICK_CHIPS)[number], f: FilterState): boolean {
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

          {parsed && parsed.notes && (
            <p className="v1-discover-note">{parsed.notes}</p>
          )}
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
          <div className="v1-discover-toolbar">
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
                <button type="button" className="v1-btn v1-btn-ghost" onClick={onReset}>
                  ↺ Reset all
                </button>
              </div>
            </div>
          )}

          {status === 'ok' && results && (
            <div className="v1-discover-grid">
              {results.map((hit) => (
                <ResultCard key={`${hit.kind}-${hit.id}`} hit={hit} />
              ))}
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

export default HeroSearch;
