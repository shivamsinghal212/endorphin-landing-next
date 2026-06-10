'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import { getAnalytics, type AnalyticsOverview } from '@/lib/admin-api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Users,
  CalendarDays,
  Building2,
  BadgeCheck,
  Heart,
  BellRing,
  UserPlus,
  Flame,
  Handshake,
  RefreshCw,
} from 'lucide-react';

const nf = new Intl.NumberFormat('en-IN');

// Slice palette for the brand collaboration donut. Distinct hues so segments
// stay legible; "Other" always uses the trailing neutral grey.
const BRAND_COLORS = [
  '#E6232A', // signal
  '#1A1A1A', // jet
  '#E08A00', // amber
  '#2E7D6B', // teal
  '#6B4FA0', // violet
  '#0A6CB0', // blue
];
const OTHER_COLOR = '#B8B2AA';
const MAX_SLICES = 6;

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl border border-jet/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-body font-medium text-jet/50 uppercase tracking-wider">
          {label}
        </span>
        <Icon className="w-4 h-4 text-jet/30" />
      </div>
      <p className="text-3xl font-display font-bold text-jet tabular-nums">
        {nf.format(value)}
      </p>
    </div>
  );
}

export function DashboardContent() {
  const token = useAdminToken();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getAnalytics(token)
      .then(setData)
      .catch((e) => {
        console.error('Failed to fetch analytics:', e);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

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
          Could not obtain a backend JWT. Make sure{' '}
          <code className="bg-jet/5 px-1 rounded">ADMIN_EMAILS</code> is set on Railway and
          includes your Google account email. Then sign out and sign in again.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return <p className="font-body text-jet/50">Failed to load analytics.</p>;
  }

  // Build the brand donut data: keep the top N brands, fold the long tail into
  // a single "Other" slice so the chart stays readable (≤6 slices).
  const totalCollabs = data.brandCollaborations.reduce((sum, b) => sum + b.count, 0);
  const head = data.brandCollaborations.slice(0, MAX_SLICES);
  const tail = data.brandCollaborations.slice(MAX_SLICES);
  const tailTotal = tail.reduce((sum, b) => sum + b.count, 0);

  const brandSlices: { name: string; value: number; color: string }[] = head.map(
    (b, i) => ({ name: b.brandName, value: b.count, color: BRAND_COLORS[i % BRAND_COLORS.length] }),
  );
  if (tailTotal > 0) {
    brandSlices.push({ name: `Other (${tail.length})`, value: tailTotal, color: OTHER_COLOR });
  }
  const pct = (v: number) => (totalCollabs > 0 ? (v / totalCollabs) * 100 : 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Analytics</h1>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Registered Users" value={data.totalUsers} icon={Users} />
        <KpiCard label="Events Tracked" value={data.totalEvents} icon={CalendarDays} />
        <KpiCard label="Clubs Tracked" value={data.totalClubs} icon={Building2} />
        <KpiCard label="Clubs Claimed" value={data.claimedClubs} icon={BadgeCheck} />
        <KpiCard label="Total RSVPs" value={data.totalRsvps} icon={Heart} />
        <KpiCard label="Reminders Set" value={data.totalReminders} icon={BellRing} />
        <KpiCard label="Join Requests" value={data.totalJoinRequests} icon={UserPlus} />
      </div>

      {/* Spotlight + brand breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Hottest club */}
        <div className="lg:col-span-2 bg-jet rounded-xl border border-jet p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-signal" />
            <span className="text-[11px] font-body font-medium text-bone/60 uppercase tracking-wider">
              Hottest Club
            </span>
          </div>
          {data.hottestClub ? (
            <div className="flex flex-col flex-1 justify-center">
              <a
                href={`/clubs/${data.hottestClub.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-2xl font-bold text-bone leading-tight hover:text-signal transition-colors"
              >
                {data.hottestClub.name}
              </a>
              <p className="mt-3 font-body text-sm text-bone/60">
                <span className="text-signal font-semibold tabular-nums">
                  {nf.format(data.hottestClub.requestCount)}
                </span>{' '}
                join {data.hottestClub.requestCount === 1 ? 'request' : 'requests'}
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-bone/50 flex-1 flex items-center">
              No join requests yet.
            </p>
          )}
        </div>

        {/* Brand collaborations */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-jet/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="w-4 h-4 text-jet/40" />
            <h2 className="font-display text-sm font-semibold uppercase text-jet/70">
              Brand Collaborations
            </h2>
            <span className="ml-auto font-body text-xs text-jet/40 tabular-nums">
              {nf.format(totalCollabs)} total
            </span>
          </div>

          {brandSlices.length === 0 ? (
            <p className="font-body text-sm text-jet/50 py-12 text-center">
              No brand collaborations tracked yet.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="w-[200px] h-[200px] shrink-0"
                role="img"
                aria-label={`Brand collaboration share: ${brandSlices
                  .map((s) => `${s.name} ${pct(s.value).toFixed(0)} percent`)
                  .join(', ')}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {brandSlices.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const v = Number(value);
                        return [`${nf.format(v)} (${pct(v).toFixed(1)}%)`, name];
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid rgba(10,10,10,0.1)',
                        fontSize: 12,
                        fontFamily: 'var(--font-poppins)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend doubles as the accessible data table */}
              <ul className="flex-1 w-full space-y-2 self-stretch">
                {brandSlices.map((s) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-body text-sm text-jet truncate flex-1">{s.name}</span>
                    <span className="font-body text-xs text-jet/40 tabular-nums">
                      {nf.format(s.value)}
                    </span>
                    <span className="font-body text-sm font-medium text-jet tabular-nums w-12 text-right">
                      {pct(s.value).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
