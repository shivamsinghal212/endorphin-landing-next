'use client';

import Link from 'next/link';
import { ErrorState, Skeleton } from '@/app/admin/studio/_components/ui';
import {
  useCoupons,
  useEventRegistrations,
  useEventStats,
} from '@/lib/studio/organiser-hooks';
import type {
  Coupon,
  EventStatsByDistance,
  OrganiserEvent,
  RegistrationRow,
} from '@/lib/organiser-api';
import {
  describeRunner,
  formatINR,
  relativeTime,
  runnerInitials,
  statusChip,
} from './_utils';

export function Overview({
  eventId,
  event,
}: {
  eventId: string;
  event: OrganiserEvent | null;
}) {
  const statsQ = useEventStats(eventId);
  const latestQ = useEventRegistrations(eventId, { limit: 4 });
  const couponsQ = useCoupons(eventId);
  const couponsById = new Map<string, Coupon>(
    (couponsQ.data ?? []).map((c) => [c.id, c]),
  );

  return (
    <>
      <StatRow loading={statsQ.isLoading} stats={statsQ.data} totalCap={getTotalCap(event)} />

      <DistanceCard
        loading={statsQ.isLoading}
        error={statsQ.isError ? String(statsQ.error) : null}
        rows={statsQ.data?.byDistance ?? null}
        distances={event?.distanceCategories ?? null}
        onRetry={() => statsQ.refetch()}
      />

      <LatestRegistrationsCard
        eventId={eventId}
        rows={latestQ.data?.items ?? null}
        total={latestQ.data?.total ?? null}
        loading={latestQ.isLoading}
        error={latestQ.isError ? String(latestQ.error) : null}
        onRetry={() => latestQ.refetch()}
        distances={event?.distanceCategories ?? null}
        couponsById={couponsById}
      />
    </>
  );
}

function getTotalCap(event: OrganiserEvent | null): number | null {
  if (!event) return null;
  let total = 0;
  let anyCap = false;
  for (const d of event.distanceCategories) {
    if (d.maxParticipants && d.maxParticipants > 0) {
      total += d.maxParticipants;
      anyCap = true;
    }
  }
  return anyCap ? total : null;
}

// ── Stat row ───────────────────────────────────────────────────────────────

function StatRow({
  loading,
  stats,
  totalCap,
}: {
  loading: boolean;
  stats: ReturnType<typeof useEventStats>['data'];
  totalCap: number | null;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[96px]" />
        ))}
      </div>
    );
  }
  if (!stats) return null;
  const verifyPending = Math.max(0, stats.paidCount - stats.verifiedCount);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Registrations"
        value={stats.registrationsCount.toLocaleString('en-IN')}
        hint={totalCap ? `of ${totalCap.toLocaleString('en-IN')} cap` : 'No cap set'}
      />
      <StatCard
        label="Revenue"
        value={formatINR(stats.revenuePaise)}
        hint={`${stats.paidCount.toLocaleString('en-IN')} paid`}
      />
      <StatCard
        label="Platform fee"
        value={stats.platformFeePaise > 0 ? `−${formatINR(stats.platformFeePaise)}` : '—'}
        hint="Razorpay + GST"
      />
      <StatCard
        label="Net payout"
        value={formatINR(stats.netPayoutPaise)}
        hint="Settled to you"
      />
      <StatCard
        label="Discount given"
        value={formatINR(stats.discountPaise)}
        hint={stats.discountPaise > 0 ? 'Coupons applied' : 'No coupons used'}
      />
      <StatCard
        label="Verified"
        value={stats.verifiedCount.toLocaleString('en-IN')}
        hint={verifyPending > 0 ? `${verifyPending} pending review` : 'No pending'}
      />
      <StatCard
        label="Medals shipped"
        value="—"
        hint="Coming soon"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-jet/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-jet/50">{label}</p>
      <p className="font-display text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-jet/40 mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Distance breakdown ─────────────────────────────────────────────────────

function DistanceCard({
  loading,
  error,
  rows,
  distances,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  rows: EventStatsByDistance[] | null;
  distances: OrganiserEvent['distanceCategories'] | null;
  onRetry: () => void;
}) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-display uppercase text-sm font-bold">By distance</p>
        <button
          type="button"
          disabled
          className="text-[11px] text-jet/30 cursor-not-allowed"
          title="Coming soon"
        >
          Export CSV ↓
        </button>
      </div>

      {error ? (
        <ErrorState title="Couldn't load stats" message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-xs text-jet/50">No registrations yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const cap = distances?.find((d) => d.id === r.distanceCategoryId)
              ?.maxParticipants;
            const capLabel =
              cap && cap > 0 ? `${r.count} / ${cap}` : `${r.count} · unlimited`;
            const pct = cap && cap > 0 ? Math.min(100, (r.count / cap) * 100) : 0;
            return (
              <div key={r.distanceCategoryId}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span>{r.name}</span>
                  <span className="text-jet/55">
                    {capLabel} · {formatINR(r.revenuePaise)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-jet/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-jet"
                    style={{ width: cap && cap > 0 ? `${pct}%` : '6%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Latest registrations ───────────────────────────────────────────────────

function LatestRegistrationsCard({
  eventId,
  rows,
  total,
  loading,
  error,
  onRetry,
  distances,
  couponsById,
}: {
  eventId: string;
  rows: RegistrationRow[] | null;
  total: number | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  distances: OrganiserEvent['distanceCategories'] | null;
  couponsById: Map<string, Coupon>;
}) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl">
      <div className="px-5 py-3 flex items-baseline justify-between border-b border-jet/5">
        <p className="font-display uppercase text-sm font-bold">Latest registrations</p>
        <Link
          href={`/admin/studio/organiser/events/${eventId}?tab=registrations`}
          className="text-[11px] text-jet/50 hover:text-jet"
        >
          See all {total != null ? `${total.toLocaleString('en-IN')} ` : ''}→
        </Link>
      </div>

      {error ? (
        <div className="p-5">
          <ErrorState
            title="Couldn't load registrations"
            message={error}
            onRetry={onRetry}
          />
        </div>
      ) : loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <p className="p-5 text-sm text-jet/50">No registrations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-b-2xl">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="text-[10px] uppercase tracking-wider text-jet/50 bg-jet/[0.02]">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Runner</th>
                <th className="text-left px-3 py-2.5 font-medium">Distance</th>
                <th className="text-left px-3 py-2.5 font-medium">Paid</th>
                <th className="text-left px-3 py-2.5 font-medium">Coupon</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jet/5">
              {rows.map((row) => (
                <RegistrationRowView
                  key={row.id}
                  row={row}
                  distances={distances}
                  couponsById={couponsById}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RegistrationRowView({
  row,
  distances,
  couponsById,
}: {
  row: RegistrationRow;
  distances: OrganiserEvent['distanceCategories'] | null;
  couponsById: Map<string, Coupon>;
}) {
  const distance =
    distances?.find((d) => d.id === row.distanceCategoryId)?.categoryName ?? '—';
  const chip = statusChip(row);
  // `amountPaid` is stored in paise to match the `revenuePaise` convention.
  const paidPaise = row.amountPaid ?? 0;
  const couponCode = row.couponId ? couponsById.get(row.couponId)?.code : null;
  return (
    <tr>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-jet text-bone grid place-items-center text-[10px] font-semibold flex-shrink-0">
            {runnerInitials(row.user?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium leading-tight truncate">
              {row.user?.name || 'Anonymous'}
            </p>
            <p className="text-[10px] text-jet/50 truncate">
              {describeRunner(row.user) || row.user?.email || '—'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[12px]">{distance}</td>
      <td className="px-3 py-2.5 text-[12px]">
        {row.amountPaid != null ? formatINR(paidPaise) : '—'}
      </td>

      <td className="px-3 py-2.5 text-[12px]">
        {couponCode ? (
          <code className="text-[11px]">{couponCode}</code>
        ) : (
          <span className="text-jet/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className={chip.className}>{chip.label}</span>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-jet/55">
        {relativeTime(row.createdAt)}
      </td>
    </tr>
  );
}

