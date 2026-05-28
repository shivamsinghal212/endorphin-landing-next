'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Star, BadgeCheck, RefreshCw, Download, Loader2, CheckCircle2, XCircle, AtSign, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  listAdminClubs,
  setClubFeatured,
  setClubPublished,
  triggerClubScrape,
  getClubScrapeHistory,
  AdminApiError,
  type Club,
  type ClubScrapeRun,
} from '@/lib/admin-api';

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`items-center gap-1 hover:text-jet transition-colors cursor-pointer ${active ? 'text-jet' : ''} ${className ?? 'inline-flex'}`}
    >
      <span>{label}</span>
      <Icon className="w-3 h-3" />
    </button>
  );
}

export function ClubsListContent() {
  const token = useAdminToken();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts' | 'featured'>('all');
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  type SortKey = 'updated' | 'lastScraped' | 'members';
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Instagram scrape state
  const [newClubIg, setNewClubIg] = useState('');
  const [newClubBusy, setNewClubBusy] = useState(false);
  const [newClubMsg, setNewClubMsg] = useState<string | null>(null);
  const [scrapingUsernames, setScrapingUsernames] = useState<Set<string>>(new Set());
  const [scrapeRuns, setScrapeRuns] = useState<ClubScrapeRun[]>([]);
  const hasPending = useMemo(() => scrapeRuns.some((r) => r.status === 'pending'), [scrapeRuns]);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminClubs(token);
      setClubs(list);
    } catch (e) {
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const { runs } = await getClubScrapeHistory(token, 30);
      setScrapeRuns(runs);
    } catch {
      // Non-fatal — the history panel just stays stale.
    }
  }, [token]);

  useEffect(() => {
    reload();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Poll history every 4s while any scrape is pending (or just after we
  // kicked one off). When the last pending row settles, do a final reload
  // of the club list so newly-scraped clubs / updated counts show up.
  const prevPendingRef = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (!hasPending && scrapingUsernames.size === 0) {
      if (prevPendingRef.current) {
        prevPendingRef.current = false;
        reload();
      }
      return;
    }
    prevPendingRef.current = true;
    const id = setInterval(loadHistory, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasPending, scrapingUsernames.size, loadHistory]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = clubs.filter((c) => {
      if (filter === 'published' && !c.publishedAt) return false;
      if (filter === 'drafts' && c.publishedAt) return false;
      if (filter === 'featured' && !c.isFeatured) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    });
    const valueOf = (c: Club): number => {
      if (sortKey === 'members') return c.stats?.members ?? 0;
      const iso = sortKey === 'lastScraped' ? c.lastScrapedAt : c.updatedAt;
      // Nulls sort to the bottom regardless of direction.
      return iso ? new Date(iso).getTime() : Number.NEGATIVE_INFINITY;
    };
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      // Keep nulls at the bottom no matter what direction is selected.
      if (av === Number.NEGATIVE_INFINITY && bv !== Number.NEGATIVE_INFINITY) return 1;
      if (bv === Number.NEGATIVE_INFINITY && av !== Number.NEGATIVE_INFINITY) return -1;
      return sign * (av - bv);
    });
  }, [clubs, query, filter, sortKey, sortDir]);

  const scrapeClub = async (instagramUrl: string | null, username?: string) => {
    if (!token || !instagramUrl) return;
    const key = username ?? instagramUrl;
    setScrapingUsernames((prev) => new Set(prev).add(key));
    try {
      await triggerClubScrape(token, instagramUrl);
      await loadHistory();
    } catch (e) {
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      // The polling loop takes over from here; clear the local "starting"
      // flag so the row reflects whatever the history row says.
      setScrapingUsernames((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const submitNewClubScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newClubIg.trim() || newClubBusy) return;
    setNewClubBusy(true);
    setNewClubMsg(null);
    try {
      const res = await triggerClubScrape(token, newClubIg.trim());
      if (res.existingClub) {
        setNewClubMsg(
          `Club "${res.existingClub.name}" already exists — rescraping in the background.`,
        );
      } else {
        setNewClubMsg(
          `Scraping @${res.instagramUsername}… it'll appear in the list when done.`,
        );
      }
      setNewClubIg('');
      await loadHistory();
    } catch (e) {
      setNewClubMsg(
        e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message,
      );
    } finally {
      setNewClubBusy(false);
    }
  };

  const latestRunByUsername = useMemo(() => {
    const m = new Map<string, ClubScrapeRun>();
    for (const r of scrapeRuns) {
      if (!m.has(r.instagramUsername)) m.set(r.instagramUsername, r);
    }
    return m;
  }, [scrapeRuns]);

  const usernameFromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const cleaned = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
    const last = cleaned.split('/').pop() || '';
    return last.replace(/^@/, '') || null;
  };

  const togglePublished = async (slug: string, next: boolean) => {
    if (!token) return;
    setPublishingSlug(slug);
    const nowIso = new Date().toISOString();
    // Optimistic: flip the badge immediately. Roll back on error.
    setClubs((prev) =>
      prev.map((c) =>
        c.slug === slug ? { ...c, publishedAt: next ? c.publishedAt ?? nowIso : null } : c,
      ),
    );
    try {
      const updated = await setClubPublished(token, slug, next);
      setClubs((prev) => prev.map((c) => (c.slug === slug ? updated : c)));
    } catch (e) {
      // Reload from server so optimistic state can't drift.
      await reload();
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setPublishingSlug(null);
    }
  };

  const cycleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir('desc');
        return key;
      }
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      return key;
    });
  };

  const toggleFeatured = async (slug: string, next: boolean) => {
    if (!token) return;
    setTogglingSlug(slug);
    setClubs((prev) => prev.map((c) => (c.slug === slug ? { ...c, isFeatured: next } : c)));
    try {
      await setClubFeatured(token, slug, next);
    } catch (e) {
      // Revert on failure.
      setClubs((prev) => prev.map((c) => (c.slug === slug ? { ...c, isFeatured: !next } : c)));
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setTogglingSlug(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-display text-xl font-bold uppercase text-jet">Clubs</h1>
        <form onSubmit={submitNewClubScrape} className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="relative min-w-0">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jet/40 pointer-events-none" />
            <input
              value={newClubIg}
              onChange={(e) => setNewClubIg(e.target.value)}
              placeholder="instagram.com/handle or @handle"
              className="pl-10 pr-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors bg-white w-full sm:w-[280px] max-w-full"
              disabled={newClubBusy}
            />
          </div>
          <button
            type="submit"
            disabled={newClubBusy || !newClubIg.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {newClubBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Scrape & add
          </button>
          <Link
            href="/admin/clubs/new"
            className="px-3 py-2 rounded-lg border border-jet/10 text-sm font-body text-jet/70 hover:bg-jet/5 transition-colors"
            title="Create a club manually without scraping"
          >
            Manual
          </Link>
        </form>
      </div>

      {newClubMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-body bg-blue-50 text-blue-900 border border-blue-200">
          {newClubMsg}
        </div>
      )}

      {scrapeRuns.length > 0 && (
        <div className="mb-5 bg-white rounded-xl border border-jet/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-jet/10">
            <span className="font-body text-xs font-medium text-jet/40 uppercase tracking-wider">
              Recent scrapes
            </span>
            {hasPending && (
              <span className="flex items-center gap-1.5 text-xs font-body text-blue-700">
                <Loader2 className="w-3 h-3 animate-spin" />
                Live
              </span>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {scrapeRuns.slice(0, 10).map((r) => {
              const isPending = r.status === 'pending';
              const isOk = r.status === 'success' || r.status === 'partial';
              const isFail = r.status === 'failed';
              const started = r.startedAt ? new Date(r.startedAt) : null;
              const finished = r.finishedAt ? new Date(r.finishedAt) : null;
              const durSec = started && finished ? Math.round((finished.getTime() - started.getTime()) / 1000) : null;
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-3 px-4 py-2 border-b border-jet/5 last:border-b-0 text-sm min-w-0"
                >
                  {isPending && <Loader2 className="w-4 h-4 mt-0.5 text-blue-600 animate-spin flex-shrink-0" />}
                  {isOk && <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />}
                  {isFail && <XCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-jet truncate">
                      {r.clubSlug ? (
                        <Link href={`/admin/clubs/${encodeURIComponent(r.clubSlug)}`} className="hover:underline">
                          {r.clubName || r.clubSlug}
                        </Link>
                      ) : (
                        <span>@{r.instagramUsername}</span>
                      )}
                      <span className="text-jet/40 font-body text-xs ml-2">@{r.instagramUsername}</span>
                    </div>
                    {isFail && r.errorMessage && (
                      <div
                        className="font-body text-xs text-red-700 break-words overflow-hidden"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                        title={r.errorMessage}
                      >
                        {r.errorMessage}
                      </div>
                    )}
                    {isOk && (
                      <div className="font-body text-xs text-jet/50">
                        {r.counts.events_persisted ?? 0} events · {r.counts.media_uploaded ?? 0} media
                        {durSec != null ? ` · ${durSec}s` : ''}
                      </div>
                    )}
                  </div>
                  <span className="font-body text-xs text-jet/40 whitespace-nowrap flex-shrink-0">
                    {started ? started.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jet/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug, city"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors bg-white"
          />
        </div>
        <div className="inline-flex rounded-lg bg-jet/5 p-0.5 text-xs font-body">
          {(['all', 'published', 'drafts', 'featured'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white text-jet shadow-sm' : 'text-jet/50 hover:text-jet'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-jet/5 transition-colors text-jet/50 disabled:opacity-50 cursor-pointer"
          aria-label="Reload"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-body bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
        <table className="w-full table-auto border-collapse">
          <colgroup>
            <col className="w-[80px]" />
            <col />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
            <col className="w-[1%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-jet/10 font-body text-xs font-medium text-jet/40 uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-medium">Cover</th>
              <th className="px-4 py-3 text-left font-medium">Club</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right font-medium">
                <SortHeader
                  label="Members"
                  active={sortKey === 'members'}
                  dir={sortDir}
                  onClick={() => cycleSort('members')}
                  className="inline-flex"
                />
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right font-medium">
                <SortHeader
                  label="Updated"
                  active={sortKey === 'updated'}
                  dir={sortDir}
                  onClick={() => cycleSort('updated')}
                  className="inline-flex"
                />
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right font-medium">
                <SortHeader
                  label="Scraped"
                  active={sortKey === 'lastScraped'}
                  dir={sortDir}
                  onClick={() => cycleSort('lastScraped')}
                  className="inline-flex"
                />
              </th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Featured</th>
              <th className="px-4 py-3 text-center font-medium">Scrape</th>
            </tr>
          </thead>
          <tbody>
            {loading && clubs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-jet/50">
                  Loading clubs…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-jet/50">
                  {clubs.length === 0 ? 'No clubs yet.' : 'No clubs match.'}
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const cover = c.headerImageUrl || c.logoUrl;
                const updated = c.updatedAt
                  ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—';
                const lastScraped = c.lastScrapedAt
                  ? new Date(c.lastScrapedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—';
                const lastScrapedTitle = c.lastScrapedAt
                  ? new Date(c.lastScrapedAt).toLocaleString('en-IN')
                  : 'Never scraped';
                const isPublished = !!c.publishedAt;
                const handle = usernameFromUrl(c.instagramUrl);
                const run = handle ? latestRunByUsername.get(handle) : null;
                const isStarting = handle ? scrapingUsernames.has(handle) : false;
                const isScrapePending = isStarting || run?.status === 'pending';
                const lastFinished = run?.finishedAt ? new Date(run.finishedAt) : null;
                const scrapeTitle = !c.instagramUrl
                  ? 'No Instagram URL set on this club'
                  : isScrapePending
                  ? `Scraping @${handle}…`
                  : run?.status === 'failed'
                  ? `Last scrape failed: ${run.errorMessage ?? 'unknown error'}`
                  : lastFinished
                  ? `Last scraped ${lastFinished.toLocaleString('en-IN')}`
                  : `Scrape @${handle}`;
                return (
                  <tr
                    key={c.slug}
                    className="border-b border-jet/5 last:border-b-0 hover:bg-jet/[0.015] transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/admin/clubs/${encodeURIComponent(c.slug)}`}
                        className="block w-16 h-10 rounded-md overflow-hidden bg-jet/5 border border-jet/10"
                      >
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-jet/30 text-[10px]">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle min-w-0">
                      <Link href={`/admin/clubs/${encodeURIComponent(c.slug)}`} className="block min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body text-sm font-medium text-jet truncate">{c.name}</span>
                          {c.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        </div>
                        <div className="font-body text-xs text-jet/50 truncate">
                          {c.slug} · {c.city}
                        </div>
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 align-middle text-right font-body text-sm text-jet/70 tabular-nums whitespace-nowrap">
                      {c.stats?.members?.toLocaleString('en-IN') ?? 0}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 align-middle text-right font-body text-xs text-jet/50 whitespace-nowrap">
                      {updated}
                    </td>
                    <td
                      className="hidden md:table-cell px-4 py-3 align-middle text-right font-body text-xs text-jet/50 whitespace-nowrap"
                      title={lastScrapedTitle}
                    >
                      {lastScraped}
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <button
                        onClick={() => togglePublished(c.slug, !isPublished)}
                        disabled={publishingSlug === c.slug}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wide transition-colors disabled:opacity-50 cursor-pointer ${
                          isPublished
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-jet/5 text-jet/60 hover:bg-jet/10'
                        }`}
                        aria-label={isPublished ? 'Unpublish' : 'Publish'}
                        title={isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
                      >
                        {publishingSlug === c.slug ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isPublished ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <button
                        onClick={() => toggleFeatured(c.slug, !c.isFeatured)}
                        disabled={togglingSlug === c.slug}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer ${
                          c.isFeatured
                            ? 'text-yellow-500 hover:bg-yellow-50'
                            : 'text-jet/30 hover:text-jet hover:bg-jet/5'
                        }`}
                        aria-label={c.isFeatured ? 'Unfeature' : 'Feature'}
                        title={c.isFeatured ? 'Featured — click to unfeature' : 'Click to feature'}
                      >
                        <Star className={`w-4 h-4 ${c.isFeatured ? 'fill-current' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <button
                        onClick={() => scrapeClub(c.instagramUrl, handle ?? undefined)}
                        disabled={!c.instagramUrl || isScrapePending}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                          run?.status === 'failed'
                            ? 'text-red-500 hover:bg-red-50'
                            : isScrapePending
                            ? 'text-blue-500'
                            : 'text-jet/40 hover:text-jet hover:bg-jet/5'
                        }`}
                        aria-label="Scrape Instagram"
                        title={scrapeTitle}
                      >
                        {isScrapePending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-body text-xs text-jet/40">
        Showing {visible.length} of {clubs.length}
      </p>
    </div>
  );
}
