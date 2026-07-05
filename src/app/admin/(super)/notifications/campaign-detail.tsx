'use client';

import { useEffect, useState } from 'react';
import { getCampaign, type CampaignDetail, type CampaignDelivery } from '@/lib/admin-api';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const STATUS_STYLES: Record<CampaignDelivery['status'], string> = {
  opened: 'bg-blue-50 text-blue-600',
  delivered: 'bg-green-50 text-green-600',
  sent: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-jet/5 text-jet/50',
  failed: 'bg-red-50 text-red-500',
};

function pct(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function Stage({ label, value, sub, color, bar, fill }: {
  label: string; value: number; sub: string; color: string; bar: string; fill: number;
}) {
  // Literal class strings only — Tailwind can't see runtime-built names.
  return (
    <div className="bg-white rounded-xl border border-jet/10 p-4">
      <div className="font-body text-[11px] font-semibold uppercase tracking-wide text-jet/40">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums mt-1 ${color}`}>{value.toLocaleString()}</div>
      <div className="font-body text-xs text-jet/50 mt-0.5 h-4">{sub}</div>
      <div className="h-1.5 rounded-full bg-jet/5 mt-3 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, fill))}%` }} />
      </div>
    </div>
  );
}

export function CampaignDetailView({ token, campaignId, onBack }: {
  token: string; campaignId: string; onBack: () => void;
}) {
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getCampaign(token, campaignId, { limit: 100 })
      .then((d) => { if (live) setData(d); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token, campaignId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
      </div>
    );
  }
  if (!data) return <p className="font-body text-sm text-jet/50">Campaign not found.</p>;

  const c = data.campaign;
  const aud = Math.max(c.audienceSize, 1);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 font-body text-sm text-jet/50 hover:text-jet mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </button>

      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-display text-xl font-bold text-jet">{c.title}</h2>
        <span className="font-body text-xs text-jet/40 uppercase tracking-wide">
          {c.status} · {c.sentAt ? new Date(c.sentAt).toLocaleString() : new Date(c.createdAt ?? '').toLocaleString()}
        </span>
      </div>
      <p className="font-body text-sm text-jet/60 mb-5">{c.body}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stage label="Audience" value={c.audienceSize} sub="" color="text-jet" bar="bg-jet" fill={100} />
        <Stage label="Sent" value={c.sentCount} sub={`${pct(c.sentCount, aud)} reachable`} color="text-jet" bar="bg-jet/50" fill={(c.sentCount / aud) * 100} />
        <Stage label="Delivered" value={c.deliveredCount} sub={`${pct(c.deliveredCount, c.sentCount)} of sent`} color="text-green-600" bar="bg-green-600" fill={c.sentCount ? (c.deliveredCount / c.sentCount) * 100 : 0} />
        <Stage label="Opened" value={c.openedCount} sub={`${pct(c.openedCount, c.deliveredCount)} of delivered`} color="text-blue-600" bar="bg-blue-600" fill={c.deliveredCount ? (c.openedCount / c.deliveredCount) * 100 : 0} />
      </div>
      {c.failedCount > 0 && (
        <p className="font-body text-xs text-red-500 -mt-6 mb-6">{c.failedCount.toLocaleString()} failed (expired tokens / send errors)</p>
      )}

      <div className="font-body text-[11px] font-semibold uppercase tracking-wide text-jet/40 mb-2">
        Delivery breakdown
      </div>
      <div className="overflow-x-auto rounded-xl border border-jet/10 bg-white">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-jet/40 border-b border-jet/10">
              <th className="px-4 py-3 font-semibold">Recipient</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Sent</th>
              <th className="px-4 py-3 font-semibold">Opened</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.map((d) => (
              <tr key={d.id} className="border-b border-jet/5 last:border-0">
                <td className="px-4 py-3 text-jet">{d.name || '—'}</td>
                <td className="px-4 py-3 text-jet/60">{d.city || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[d.status]}`}>
                    {d.status}
                  </span>
                  {d.errorDetail && <span className="ml-2 text-[11px] text-red-400">{d.errorDetail}</span>}
                </td>
                <td className="px-4 py-3 text-jet/60 tabular-nums">{d.sentAt ? new Date(d.sentAt).toLocaleTimeString() : '—'}</td>
                <td className="px-4 py-3 text-jet/60 tabular-nums">{d.openedAt ? new Date(d.openedAt).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
            {data.deliveries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-jet/40">No recipients (no one matched, or none reachable by push).</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data.total > data.deliveries.length && (
        <p className="font-body text-xs text-jet/40 mt-2">Showing {data.deliveries.length} of {data.total.toLocaleString()} recipients.</p>
      )}
    </div>
  );
}
