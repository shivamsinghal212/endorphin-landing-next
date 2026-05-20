'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMyRegistrations } from '@/lib/runner-hooks';
import type { MyRegistrationItem } from '@/lib/runner-api';

const IST = 'Asia/Kolkata';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
}

export function statusChip(reg: MyRegistrationItem): {
  label: string;
  tone: 'positive' | 'pending' | 'warning' | 'neutral';
} {
  if (reg.paymentStatus === 'failed') return { label: 'Payment failed', tone: 'warning' };
  if (reg.paymentStatus === 'refunded') return { label: 'Refunded', tone: 'neutral' };
  if (reg.paymentStatus === 'pending') return { label: 'Payment pending', tone: 'pending' };
  if (reg.registrationStatus === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (reg.resultStatus === 'verified') return { label: 'Verified', tone: 'positive' };
  if (reg.resultStatus === 'rejected') return { label: 'Result rejected', tone: 'warning' };
  if (reg.resultStatus === 'submitted') return { label: 'Result in review', tone: 'pending' };
  if (reg.medalStatus === 'delivered') return { label: 'Medal delivered', tone: 'positive' };
  if (reg.medalStatus === 'dispatched') return { label: 'Medal shipped', tone: 'pending' };
  return { label: 'Registered', tone: 'positive' };
}

const TONE_CLS: Record<ReturnType<typeof statusChip>['tone'], string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  warning: 'bg-signal/10 text-signal border-signal/30',
  neutral: 'bg-jet/5 text-jet/70 border-jet/10',
};

export function MyRegistrationsView() {
  const q = useMyRegistrations();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight text-jet mb-2">
        My events
      </h1>
      <p className="text-sm text-jet/60 mb-8">
        Everything you&rsquo;ve registered for — race day details, results, and medals
        in one place.
      </p>

      {q.isLoading && (
        <div className="bg-white border border-jet/10 rounded-2xl p-6 text-sm text-jet/60">
          Loading…
        </div>
      )}

      {q.error && (
        <div className="bg-white border border-signal/30 rounded-2xl p-6 text-sm text-signal">
          Couldn&rsquo;t load your registrations. Please refresh.
        </div>
      )}

      {q.data && q.data.items.length === 0 && (
        <div className="bg-white border border-jet/10 rounded-2xl p-8 text-center">
          <p className="font-display uppercase text-base font-bold text-jet mb-2">
            No registrations yet
          </p>
          <p className="text-sm text-jet/60 mb-4">
            When you sign up for a race, it&rsquo;ll show up here.
          </p>
          <Link
            href="/races"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90"
          >
            Find a race
          </Link>
        </div>
      )}

      {q.data && q.data.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {q.data.items.map((r) => {
            const chip = statusChip(r);
            return (
              <li
                key={r.id}
                className="bg-white border border-jet/10 rounded-2xl p-4 md:p-5 flex items-center gap-4"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-jet/5 relative">
                  {r.event.coverImageUrl ? (
                    <Image
                      src={r.event.coverImageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-jet/30 text-xs">
                      —
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display uppercase text-sm md:text-base font-bold text-jet truncate">
                    {r.event.title}
                  </p>
                  <p className="text-xs text-jet/60 mt-0.5">
                    {r.distance?.fullTitle ?? r.distance?.categoryName ?? 'Distance —'}
                    {r.bibNumber ? ` · Bib ${r.bibNumber}` : ''}
                  </p>
                  <p className="text-[11px] text-jet/50 mt-1">
                    Registered {fmtDate(r.createdAt)}
                  </p>
                </div>
                <div className="hidden md:block">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${TONE_CLS[chip.tone]}`}
                  >
                    {chip.label}
                  </span>
                </div>
                <Link
                  href={`/me/registrations/${r.id}`}
                  className="ml-2 inline-flex items-center px-3 py-1.5 rounded-lg border border-jet/15 text-jet text-xs hover:bg-jet/5"
                >
                  View →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
