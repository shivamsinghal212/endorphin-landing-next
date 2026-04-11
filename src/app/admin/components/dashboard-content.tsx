'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import { getStats, type DashboardStats, runScraper, getScraperSources } from '@/lib/admin-api';
import {
  Calendar,
  Users,
  Heart,
  Tent,
  RefreshCw,
  Play,
} from 'lucide-react';

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-jet/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-body font-medium text-jet/50 uppercase tracking-wider">
          {label}
        </span>
        <Icon className="w-4 h-4 text-jet/30" />
      </div>
      <p className="text-2xl font-display font-bold text-jet">{value}</p>
      {sub && <p className="text-xs font-body text-jet/40 mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardContent() {
  const token = useAdminToken();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([getStats(token), getScraperSources(token)])
      .then(([s, src]) => {
        setStats(s);
        setSources(src.sources);
      })
      .catch((e) => console.error('Failed to fetch stats:', e))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRunScraper = async (source?: string) => {
    if (!token) return;
    setScraping(source || 'all');
    try {
      await runScraper(token, source);
    } finally {
      setTimeout(() => setScraping(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-white rounded-xl border border-jet/10 p-6">
        <h2 className="font-display text-lg font-bold text-jet mb-2">Backend Token Missing</h2>
        <p className="font-body text-sm text-jet/60">
          Could not obtain a backend JWT. Make sure <code className="bg-jet/5 px-1 rounded">ADMIN_EMAILS</code> is set on Railway
          and includes your Google account email. Then sign out and sign in again.
        </p>
      </div>
    );
  }

  if (!stats) return <p className="font-body text-jet/50">Failed to load stats.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Events" value={stats.totalEvents} icon={Calendar} />
        <KpiCard label="Total Users" value={stats.totalUsers} icon={Users} sub={`+${stats.usersToday} today`} />
        <KpiCard label="Total RSVPs" value={stats.totalRsvps} icon={Heart} sub={`+${stats.rsvpsToday} today`} />
        <KpiCard label="Community Runs" value={stats.communityEvents} icon={Tent} />
      </div>

      {/* Source breakdown + Scraper controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Events by source */}
        <div className="bg-white rounded-xl border border-jet/10 p-5">
          <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4">
            Events by Source
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.eventsBySource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="font-body text-sm text-jet capitalize">{source}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm font-medium text-jet">{count}</span>
                    <div className="w-24 h-2 bg-jet/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-signal rounded-full"
                        style={{ width: `${(count / stats.totalEvents) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Scraper controls */}
        <div className="bg-white rounded-xl border border-jet/10 p-5">
          <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4">
            Scraper Controls
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleRunScraper()}
              disabled={!!scraping}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {scraping === 'all' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run All Scrapers
            </button>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => handleRunScraper(src)}
                  disabled={!!scraping}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-jet/10 text-xs font-body text-jet/70 hover:bg-jet/5 disabled:opacity-50 transition-colors cursor-pointer capitalize"
                >
                  {scraping === src ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  {src}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
