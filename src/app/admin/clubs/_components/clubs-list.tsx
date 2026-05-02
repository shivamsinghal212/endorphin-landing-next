'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Star, BadgeCheck, RefreshCw } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import { listAdminClubs, setClubFeatured, AdminApiError, type Club } from '@/lib/admin-api';

export function ClubsListContent() {
  const token = useAdminToken();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts' | 'featured'>('all');
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

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

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
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
  }, [clubs, query, filter]);

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
        <Link
          href="/admin/clubs/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New club
        </Link>
      </div>

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
        <div className="grid grid-cols-[80px_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 border-b border-jet/10 font-body text-xs font-medium text-jet/40 uppercase tracking-wider">
          <span>Cover</span>
          <span>Club</span>
          <span className="hidden sm:inline">Members</span>
          <span className="hidden md:inline">Updated</span>
          <span>Status</span>
          <span>Featured</span>
        </div>
        {loading && clubs.length === 0 ? (
          <div className="px-4 py-12 text-center font-body text-sm text-jet/50">
            Loading clubs…
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center font-body text-sm text-jet/50">
            {clubs.length === 0 ? 'No clubs yet.' : 'No clubs match.'}
          </div>
        ) : (
          visible.map((c) => {
            const cover = c.headerImageUrl || c.logoUrl;
            const updated = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
            return (
              <div
                key={c.slug}
                className="grid grid-cols-[80px_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-jet/5 last:border-b-0 hover:bg-jet/[0.015] transition-colors"
              >
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
                <Link href={`/admin/clubs/${encodeURIComponent(c.slug)}`} className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-body text-sm font-medium text-jet truncate">{c.name}</span>
                    {c.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                  </div>
                  <div className="font-body text-xs text-jet/50 truncate">
                    {c.slug} · {c.city}
                  </div>
                </Link>
                <span className="hidden sm:block font-body text-sm text-jet/70 tabular-nums">
                  {c.stats?.members?.toLocaleString('en-IN') ?? 0}
                </span>
                <span className="hidden md:block font-body text-xs text-jet/50">{updated}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wide ${
                    c.publishedAt
                      ? 'bg-green-100 text-green-800'
                      : 'bg-jet/5 text-jet/60'
                  }`}
                >
                  {c.publishedAt ? 'Published' : 'Draft'}
                </span>
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
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 font-body text-xs text-jet/40">
        Showing {visible.length} of {clubs.length}
      </p>
    </div>
  );
}
