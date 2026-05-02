'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import { listClubEvents, AdminApiError, type ClubEvent } from '@/lib/admin-api';

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventsListContent({
  slug,
  clubName,
}: {
  slug: string;
  clubName: string;
}) {
  const token = useAdminToken();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listClubEvents(token, slug);
      setEvents(list);
    } catch (e) {
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, slug]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const u: ClubEvent[] = [];
    const p: ClubEvent[] = [];
    for (const e of events) {
      const t = Date.parse(e.startTime);
      if (Number.isFinite(t) && t >= now) u.push(e);
      else p.push(e);
    }
    u.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
    p.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
    return { upcoming: u, past: p };
  }, [events]);

  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/admin/clubs/${encodeURIComponent(slug)}`}
            className="p-2 rounded-lg hover:bg-jet/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold uppercase text-jet truncate">
              Events · {clubName}
            </h1>
            <p className="font-body text-xs text-jet/50">/{slug}</p>
          </div>
        </div>
        <Link
          href={`/admin/clubs/${encodeURIComponent(slug)}/events/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New event
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex rounded-lg bg-jet/5 p-0.5 text-xs font-body">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                tab === t ? 'bg-white text-jet shadow-sm' : 'text-jet/50 hover:text-jet'
              }`}
            >
              {t} ({t === 'upcoming' ? upcoming.length : past.length})
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

      <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="px-4 py-12 text-center font-body text-sm text-jet/50">Loading events…</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center font-body text-sm text-jet/50">
            No {tab} events.{' '}
            {tab === 'upcoming' && (
              <Link
                href={`/admin/clubs/${encodeURIComponent(slug)}/events/new`}
                className="text-signal hover:underline"
              >
                Create one
              </Link>
            )}
          </div>
        ) : (
          visible.map((e) => (
            <Link
              key={e.id}
              href={`/admin/clubs/${encodeURIComponent(slug)}/events/${e.id}`}
              className="grid grid-cols-[80px_1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-jet/5 last:border-b-0 hover:bg-jet/[0.015] transition-colors"
            >
              <div className="w-16 h-10 rounded-md overflow-hidden bg-jet/5 border border-jet/10">
                {e.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.coverImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-jet/30 text-[10px]">
                    {e.eventType === 'race_event' ? 'RACE' : 'RUN'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-body text-sm font-medium text-jet truncate">{e.title}</div>
                <div className="font-body text-xs text-jet/50 truncate">
                  {fmtDateTime(e.startTime)}
                  {e.locationName ? ` · ${e.locationName}` : ''}
                  {e.distanceKm != null ? ` · ${e.distanceKm}K` : ''}
                </div>
              </div>
              <span className="font-body text-xs text-jet/60">
                <span className="font-medium tabular-nums">{e.goingCount}</span> going
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wide ${
                  e.recap ? 'bg-blue-100 text-blue-800' : 'bg-jet/5 text-jet/60'
                }`}
              >
                {e.recap ? 'Recapped' : e.eventType === 'race_event' ? 'Race' : 'Run'}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
