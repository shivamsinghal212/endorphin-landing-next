'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getScraperSources, getLastRunsPerSource, getScraperRuns,
  runScraper, type ScraperRun,
} from '@/lib/admin-api';
import {
  Play, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react';

export function ScrapersContent() {
  const token = useAdminToken();
  const [sources, setSources] = useState<string[]>([]);
  const [lastRuns, setLastRuns] = useState<Record<string, ScraperRun>>({});
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [src, last, history] = await Promise.all([
        getScraperSources(token),
        getLastRunsPerSource(token),
        getScraperRuns(token, 30),
      ]);
      setSources(src.sources);
      setLastRuns(last);
      setRuns(history.runs);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRun = async (source?: string) => {
    if (!token) return;
    setRunning(source || 'all');
    try {
      await runScraper(token, source);
      // Poll for completion
      setTimeout(() => fetchData(), 5000);
      setTimeout(() => fetchData(), 15000);
      setTimeout(() => fetchData(), 30000);
    } finally {
      setTimeout(() => setRunning(null), 3000);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-jet/30" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold uppercase text-jet">Scrapers</h1>
        <button
          onClick={() => handleRun()}
          disabled={!!running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {running === 'all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run All Scrapers
        </button>
      </div>

      {/* Source cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sources.map((source) => {
          const last = lastRuns[source];
          return (
            <div key={source} className="bg-white rounded-xl border border-jet/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-body text-sm font-medium text-jet capitalize">{source}</span>
                {last && statusIcon(last.status)}
              </div>

              {last ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-body text-xs text-jet/40">Last run</span>
                    <span className="font-body text-xs text-jet/60">{formatTime(last.startedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-xs text-jet/40">Fetched</span>
                    <span className="font-body text-xs font-medium text-jet">{last.eventsFetched}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-xs text-jet/40">Upserted</span>
                    <span className="font-body text-xs font-medium text-green-600">{last.eventsUpserted}</span>
                  </div>
                  {last.errorMessage && (
                    <p className="font-body text-xs text-red-500 mt-1 line-clamp-2">{last.errorMessage}</p>
                  )}
                </div>
              ) : (
                <p className="font-body text-xs text-jet/30">No runs yet</p>
              )}

              <button
                onClick={() => handleRun(source)}
                disabled={!!running}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-jet/10 text-xs font-body text-jet/60 hover:bg-jet/5 disabled:opacity-50 transition-colors cursor-pointer capitalize"
              >
                {running === source ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Run {source}
              </button>
            </div>
          );
        })}
      </div>

      {/* Run history */}
      <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-jet/5">
          <h2 className="font-display text-sm font-semibold uppercase text-jet/70 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Run History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-jet/10">
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Fetched</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Upserted</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Started</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-jet/40">
                    No scraper runs recorded yet. Run a scraper to see history.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const duration = run.startedAt && run.finishedAt
                    ? `${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                    : '—';
                  return (
                    <tr key={run.id} className="border-b border-jet/5 hover:bg-jet/[0.02]">
                      <td className="px-4 py-2.5 font-body text-sm text-jet capitalize">{run.source}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(run.status)}
                          <span className="font-body text-xs text-jet/60">{run.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-body text-sm text-jet">{run.eventsFetched}</td>
                      <td className="px-4 py-2.5 font-body text-sm text-green-600">{run.eventsUpserted}</td>
                      <td className="px-4 py-2.5 font-body text-xs text-jet/50">{formatTime(run.startedAt)}</td>
                      <td className="px-4 py-2.5 font-body text-xs text-jet/50">{duration}</td>
                      <td className="px-4 py-2.5 font-body text-xs text-red-500 max-w-[200px] truncate">
                        {run.errorMessage || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
