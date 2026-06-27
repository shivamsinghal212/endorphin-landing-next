'use client';

import { useEffect, useState } from 'react';
import { getUsers, type AdminUser } from '@/lib/admin-api';
import { useAdminToken } from '@/lib/use-admin-token';
import { ClubAvatar } from './ui';

/** Switch into / out of "view as user" mode. The cookie lives server-side, so
 *  both actions full-reload to re-resolve the studio identity everywhere. */
async function startImpersonation(userId: string) {
  const res = await fetch('/api/studio/impersonate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
  window.location.assign('/admin/studio');
}

export async function stopImpersonation() {
  await fetch('/api/studio/impersonate', { method: 'DELETE' });
  window.location.reload();
}

/** Super-admin-only: search users and enter the studio as one of them. */
export function ImpersonationPicker() {
  const token = useAdminToken();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!token || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await getUsers(token, { search: q, limit: 8 });
        if (!cancelled) setResults(data.users);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, token]);

  async function pick(u: AdminUser) {
    setBusyId(u.id);
    setError(null);
    try {
      await startImpersonation(u.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusyId(null);
    }
  }

  return (
    <div className="mt-10 border-t border-jet/10 pt-6">
      <p className="text-[10px] uppercase tracking-wider text-signal mb-1">
        Super-admin · view as user
      </p>
      <p className="text-sm text-jet/60 mb-3">
        Open the studio from any user&apos;s point of view — their clubs and
        organiser events.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users by name or email…"
        className="w-full max-w-md bg-white border border-jet/15 rounded-lg px-3 py-2.5 text-sm text-jet outline-none focus:border-jet/40"
        autoComplete="off"
      />
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {(loading || results.length > 0) && (
        <ul className="mt-3 max-w-md flex flex-col gap-1.5">
          {loading && results.length === 0 && (
            <li className="text-xs text-jet/40 px-1">Searching…</li>
          )}
          {results.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => pick(u)}
                disabled={!!busyId}
                className="w-full flex items-center gap-3 text-left bg-white border border-jet/10 rounded-lg px-3 py-2 hover:border-jet/30 transition-colors disabled:opacity-50"
              >
                <ClubAvatar src={u.pictureUrl} name={u.name || u.email} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-jet truncate">
                    {u.name || u.email.split('@')[0]}
                  </span>
                  <span className="block text-xs text-jet/50 truncate">{u.email}</span>
                </span>
                <span className="text-xs text-signal flex-shrink-0">
                  {busyId === u.id ? 'Opening…' : 'View →'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Persistent banner shown across the studio while impersonating. */
export function ImpersonationBanner({ name, email }: { name: string; email: string }) {
  const [exiting, setExiting] = useState(false);
  return (
    <div className="sticky top-0 z-30 bg-signal text-white text-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-2 flex items-center justify-center gap-3 flex-wrap text-center">
        <span>
          Viewing as <strong>{name || email.split('@')[0]}</strong>{' '}
          <span className="opacity-80">({email})</span>
        </span>
        <button
          onClick={() => {
            setExiting(true);
            stopImpersonation();
          }}
          disabled={exiting}
          className="underline underline-offset-2 font-medium hover:opacity-80 disabled:opacity-60"
        >
          {exiting ? 'Exiting…' : 'Exit'}
        </button>
      </div>
    </div>
  );
}
