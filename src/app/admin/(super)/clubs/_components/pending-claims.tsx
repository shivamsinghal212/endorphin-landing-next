'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, RefreshCw } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  AdminApiError,
  approveClubClaim,
  listPendingClubClaims,
  rejectClubClaim,
  type ClubClaimRequest,
} from '@/lib/admin-api';

type ClaimGroup = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  claims: ClubClaimRequest[];
};

function groupByClub(claims: ClubClaimRequest[]): ClaimGroup[] {
  const map = new Map<string, ClaimGroup>();
  for (const c of claims) {
    let g = map.get(c.clubId);
    if (!g) {
      g = { clubId: c.clubId, clubSlug: c.clubSlug, clubName: c.clubName, claims: [] };
      map.set(c.clubId, g);
    }
    g.claims.push(c);
  }
  for (const g of map.values()) {
    g.claims.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return Array.from(map.values()).sort((a, b) => a.clubName.localeCompare(b.clubName));
}

export function PendingClaimsSection() {
  const token = useAdminToken();
  const [claims, setClaims] = useState<ClubClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listPendingClubClaims(token);
      setClaims(list);
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

  const groups = useMemo(() => groupByClub(claims), [claims]);

  const act = async (id: string, action: 'approve' | 'reject', claimantName: string) => {
    if (!token) return;
    setActingId(id);
    setError(null);
    setNotice(null);
    try {
      if (action === 'approve') {
        await approveClubClaim(token, id);
        setNotice(`Approved claim from ${claimantName}.`);
      } else {
        await rejectClubClaim(token, id);
        setNotice(`Rejected claim from ${claimantName}.`);
      }
      await reload();
    } catch (e) {
      setError(e instanceof AdminApiError ? `${e.status} — ${e.message}` : (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  if (!loading && claims.length === 0 && !error) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold uppercase text-jet tracking-wider">
            Pending claims
          </h2>
          {claims.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium uppercase tracking-wide bg-amber-100 text-amber-800">
              {claims.length}
            </span>
          )}
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-jet/5 transition-colors text-jet/50 disabled:opacity-50 cursor-pointer"
          aria-label="Reload pending claims"
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

      {loading && claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-jet/10 px-4 py-8 text-center font-body text-sm text-jet/50">
          Loading pending claims…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
          {groups.map((g, gi) => (
            <div
              key={g.clubId}
              className={gi > 0 ? 'border-t border-jet/10' : ''}
            >
              <div className="px-4 py-2.5 bg-jet/[0.02] border-b border-jet/5 flex items-center justify-between">
                <Link
                  href={`/admin/clubs/${encodeURIComponent(g.clubSlug)}`}
                  className="font-body text-sm font-medium text-jet hover:underline"
                >
                  {g.clubName}
                </Link>
                {g.claims.length > 1 && (
                  <span className="font-body text-xs text-jet/50">
                    {g.claims.length} claimants
                  </span>
                )}
              </div>
              {g.claims.map((c) => {
                const created = new Date(c.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                });
                const busy = actingId === c.id;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-3 border-b border-jet/5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-body text-sm text-jet truncate">
                        {c.claimantName}
                      </div>
                      <div className="font-body text-xs text-jet/50 truncate">
                        {c.claimantEmail} · {created}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => act(c.id, 'approve', c.claimantName)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-body font-medium hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => act(c.id, 'reject', c.claimantName)}
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
          ))}
        </div>
      )}
    </section>
  );
}
