'use client';

import Link from 'next/link';
import { ErrorState, Skeleton } from '@/app/admin/studio/_components/ui';
import { useCoupons, useOrganiserEvent } from '@/lib/studio/organiser-hooks';
import type { Coupon } from '@/lib/organiser-api';
import { formatShortDate } from './_utils';

export function Coupons({ eventId }: { eventId: string }) {
  const couponsQ = useCoupons(eventId);
  const eventQ = useOrganiserEvent(eventId);

  const editHref = `/admin/studio/organiser/events/${eventId}/edit?step=coupons`;

  return (
    <div className="bg-white border border-jet/10 rounded-2xl">
      <div className="px-5 py-3 flex items-baseline justify-between border-b border-jet/5">
        <div>
          <p className="font-display uppercase text-sm font-bold">Coupons</p>
          <p className="text-[11px] text-jet/50 mt-0.5">
            Promo codes that runners enter at checkout. Manage in the event editor.
          </p>
        </div>
        <Link
          href={editHref}
          className="text-xs px-3 py-1.5 rounded-lg bg-jet text-bone whitespace-nowrap"
        >
          Edit in wizard ↗
        </Link>
      </div>

      {couponsQ.isError ? (
        <div className="p-5">
          <ErrorState
            title="Couldn't load coupons"
            message={String(couponsQ.error)}
            onRetry={() => couponsQ.refetch()}
          />
        </div>
      ) : couponsQ.isLoading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !couponsQ.data || couponsQ.data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-display uppercase text-sm font-bold text-jet/50">
            No coupons yet
          </p>
          <p className="text-xs text-jet/40 mt-1 max-w-sm mx-auto">
            Spin up an early-bird or club-specific code from the editor.
          </p>
          <Link
            href={editHref}
            className="inline-block mt-4 text-xs px-3 py-1.5 rounded-lg border border-jet/15 hover:bg-jet/5"
          >
            Add coupon
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-jet/5">
          {couponsQ.data.map((c) => (
            <CouponRow
              key={c.id}
              coupon={c}
              distanceNames={
                eventQ.data?.distanceCategories
                  .filter((d) => c.appliesToDistanceIds?.includes(d.id ?? ''))
                  .map((d) => d.categoryName) ?? []
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CouponRow({
  coupon,
  distanceNames,
}: {
  coupon: Coupon;
  distanceNames: string[];
}) {
  const validFrom = formatShortDate(coupon.validFrom);
  const validUntil = formatShortDate(coupon.validUntil);
  const validity =
    validFrom && validUntil
      ? `${validFrom} → ${validUntil}`
      : validUntil
        ? `Until ${validUntil}`
        : validFrom
          ? `From ${validFrom}`
          : 'No window';

  const statusClass =
    coupon.status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : coupon.status === 'paused'
        ? 'bg-gold/20 text-gold'
        : 'bg-jet/10 text-jet/60';

  return (
    <li className="px-5 py-3 flex items-center gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-semibold tracking-wide">{coupon.code}</code>
          <span className="text-[11px] text-jet/60">{coupon.discountPercent}% off</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium ${statusClass}`}
          >
            {coupon.status}
          </span>
        </div>
        <p className="text-[11px] text-jet/50 mt-0.5">
          {coupon.usedCount} used
          {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''} · {validity}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {distanceNames.length === 0 ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-jet/[0.06] text-jet/60 uppercase tracking-wider font-medium">
            All distances
          </span>
        ) : (
          distanceNames.map((name) => (
            <span
              key={name}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-jet/[0.06] text-jet/60 uppercase tracking-wider font-medium"
            >
              {name}
            </span>
          ))
        )}
      </div>
    </li>
  );
}
