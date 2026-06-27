'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, RefreshCw } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  AdminApiError,
  approveEvent,
  listPendingEvents,
  rejectEvent,
  type ReviewEvent,
} from '@/lib/admin-api';

export function PendingEventsSection() {
  const token = useAdminToken();
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setEvents(await listPendingEvents(token));
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

  const act = async (e: ReviewEvent, action: 'approve' | 'reject') => {
    if (!token) return;
    setActingId(e.id);
    setError(null);
    setNotice(null);
    try {
      if (action === 'approve') {
        await approveEvent(token, e.id);
        setNotice(`Published “${e.title}”.`);
      } else {
        await rejectEvent(token, e.id);
        setNotice(`Rejected “${e.title}”.`);
      }
      await reload();
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.status} — ${err.message}` : (err as Error).message);
    } finally {
      setActingId(null);
    }
  };

  if (!loading && events.length === 0 && !error) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold uppercase text-jet tracking-wider">
            Events awaiting review
          </h2>
          {events.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wide bg-amber-100 text-amber-800">
              {events.length}
            </span>
          )}
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-jet/5 transition-colors text-jet/50 disabled:opacity-50 cursor-pointer"
          aria-label="Reload pending events"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notice && (
        <div className="mb-3 px-4 py-2 rounded-lg text-sm font-body bg-green-50 text-green-800 border border-green-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg text-sm font-body bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="bg-white rounded-xl border border-jet/10 px-4 py-8 text-center font-body text-sm text-jet/50">
          Loading events…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
          {events.map((e, i) => {
            const when = new Date(e.startTime).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const busy = actingId === e.id;
            return (
              <div
                key={e.id}
                className={`grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-3 ${
                  i > 0 ? 'border-t border-jet/5' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {e.slug ? (
                      <Link
                        href={`/running-events/${encodeURIComponent(e.slug)}`}
                        target="_blank"
                        className="font-body text-sm font-medium text-jet truncate hover:underline"
                      >
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-body text-sm font-medium text-jet truncate">{e.title}</span>
                    )}
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-body uppercase tracking-wide bg-jet/5 text-jet/60">
                      {e.eventStatus}
                    </span>
                  </div>
                  <div className="font-body text-xs text-jet/50 truncate">
                    {e.organizerName ? `${e.organizerName} · ` : ''}{when}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => act(e, 'approve')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-body font-medium hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve &amp; publish
                  </button>
                  <button
                    onClick={() => act(e, 'reject')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-jet/15 text-jet/70 text-xs font-body font-medium hover:bg-jet/5 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
