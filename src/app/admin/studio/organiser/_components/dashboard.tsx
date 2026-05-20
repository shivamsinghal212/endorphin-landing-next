'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Organiser, OrganiserEventListItem } from '@/lib/organiser-api';
import { useOrganiserEvents } from '@/lib/studio/organiser-hooks';
import { EventsList } from './events-list';
import { ResumeDraftBanner } from './resume-draft-banner';

function inrFromPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function isLiveNow(ev: OrganiserEventListItem, now: number): boolean {
  if (ev.eventStatus !== 'live') return false;
  const open = ev.registrationOpenAt ? Date.parse(ev.registrationOpenAt) : null;
  const close = ev.registrationCloseAt ? Date.parse(ev.registrationCloseAt) : null;
  if (open !== null && now < open) return false;
  if (close !== null && now > close) return false;
  return true;
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
      <p className="font-display text-3xl font-bold mt-1 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-jet/40 mt-0.5">{hint}</p> : null}
    </div>
  );
}

export function Dashboard({ organiser }: { organiser: Organiser }) {
  // Pull events once; tabs in EventsList re-use the same query via React
  // Query's cache so this is a single network hit, not two.
  const eventsQ = useOrganiserEvents({});
  const items = eventsQ.data?.items ?? [];

  const year = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const yearStart = new Date(`${year}-01-01T00:00:00+05:30`).getTime();
    const liveCount = items.filter((ev) => isLiveNow(ev, now)).length;
    // Year-scoped registrations/revenue need a per-registration timestamp
    // which the list shape doesn't carry. We deliberately show "—" rather
    // than mix lifetime and year-to-date numbers.
    const yearRegistrations = items
      .filter((ev) => {
        const open = ev.registrationOpenAt ? Date.parse(ev.registrationOpenAt) : null;
        return open !== null && open >= yearStart;
      })
      .reduce((s, ev) => s + ev.totalRegistrations, 0);
    const yearRevenuePaise = items
      .filter((ev) => {
        const open = ev.registrationOpenAt ? Date.parse(ev.registrationOpenAt) : null;
        return open !== null && open >= yearStart;
      })
      .reduce((s, ev) => s + ev.totalRevenuePaise, 0);
    return { liveCount, yearRegistrations, yearRevenuePaise };
  }, [items, year]);

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-1">
            {organiser.displayName}
          </p>
          <h1 className="font-display uppercase text-2xl sm:text-3xl font-bold">
            Organiser home
          </h1>
        </div>
        <Link
          href="/admin/studio/organiser/events/new"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 shrink-0"
        >
          <span className="text-base leading-none">+</span> New event
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Live events"
          value={String(stats.liveCount)}
          hint={
            stats.liveCount === 0
              ? 'Nothing publishing right now'
              : `${stats.liveCount} accepting registrations`
          }
        />
        <StatCard
          label={`Registrations · ${year}`}
          value={
            stats.yearRegistrations > 0
              ? stats.yearRegistrations.toLocaleString('en-IN')
              : '—'
          }
        />
        <StatCard
          label={`Revenue · ${year}`}
          value={stats.yearRevenuePaise > 0 ? inrFromPaise(stats.yearRevenuePaise) : '—'}
          hint={stats.yearRevenuePaise > 0 ? 'Settled by Endorfin' : undefined}
        />
        <StatCard label="Discount given" value="—" />
      </div>

      <ResumeDraftBanner />

      <EventsList />
    </div>
  );
}
