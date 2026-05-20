'use client';

import type { DistanceCategory } from '@/lib/api';

function fmtPrice(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  const cur = currency || 'INR';
  if (cur === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${cur} ${amount.toLocaleString('en')}`;
}

function isActive(d: DistanceCategory): boolean {
  // Treat missing status as active. Match RaceDetailView's filter rules.
  if (d.status && d.status !== 'active') return false;
  return true;
}

export function pickActiveDistances(
  cats: DistanceCategory[],
): DistanceCategory[] {
  return cats.filter(isActive).filter((d) => d.id);
}

export function DistancePicker({
  distances,
  value,
  onChange,
  currency,
}: {
  distances: DistanceCategory[];
  value: string | null;
  onChange: (id: string) => void;
  currency: string | null;
}) {
  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet">
          Pick your distance
        </p>
        <p className="text-xs text-jet/60 mt-0.5">
          Choose one. Prices are inclusive of taxes.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {distances.map((d) => {
          const id = d.id!;
          const price = fmtPrice(d.discountedPrice ?? d.price, d.currency || currency);
          const wasPrice =
            d.discountedPrice != null && d.price != null && d.price !== d.discountedPrice
              ? fmtPrice(d.price, d.currency || currency)
              : null;
          const selected = value === id;
          return (
            <label
              key={id}
              className={`block cursor-pointer rounded-xl border p-4 transition-colors ${
                selected
                  ? 'border-signal ring-1 ring-signal/30 bg-signal/[0.03]'
                  : 'border-jet/10 hover:border-jet/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="distance"
                  value={id}
                  checked={selected}
                  onChange={() => onChange(id)}
                  className="mt-1 accent-signal"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display uppercase text-base font-bold text-jet">
                      {d.categoryName}
                    </span>
                    <span className="font-display uppercase text-sm font-bold text-jet whitespace-nowrap">
                      {price || 'Free'}
                      {wasPrice && (
                        <span className="ml-2 text-jet/40 line-through font-normal">
                          {wasPrice}
                        </span>
                      )}
                    </span>
                  </div>
                  {d.fullTitle && (
                    <p className="text-xs text-jet/60 mt-0.5">{d.fullTitle}</p>
                  )}
                  {d.inclusions && d.inclusions.length > 0 && (
                    <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1">
                      {d.inclusions.map((inc, i) => (
                        <li key={i} className="text-xs text-jet/70 flex items-baseline gap-1.5">
                          <span aria-hidden className="text-signal">•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
