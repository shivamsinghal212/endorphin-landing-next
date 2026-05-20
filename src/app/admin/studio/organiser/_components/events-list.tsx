'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  describeOrganiserError,
  useOrganiserEvents,
} from '@/lib/studio/organiser-hooks';
import type { OrganiserEventListItem } from '@/lib/organiser-api';
import { ErrorState, Skeleton } from '../../_components/ui';

type Tab = 'live' | 'upcoming' | 'past' | 'drafts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'drafts', label: 'Drafts' },
];

function eventBucket(ev: OrganiserEventListItem, now = Date.now()): Tab {
  if (ev.eventStatus === 'draft' || ev.eventStatus === 'pending_review') {
    return 'drafts';
  }
  const open = ev.registrationOpenAt ? Date.parse(ev.registrationOpenAt) : null;
  const close = ev.registrationCloseAt ? Date.parse(ev.registrationCloseAt) : null;

  // We use `registrationCloseAt` as the "ended" boundary because
  // `resultWindowEnd` isn't on the list shape.
  if (ev.eventStatus === 'closed' || ev.eventStatus === 'cancelled') return 'past';
  if (close !== null && now > close) return 'past';

  if (ev.eventStatus === 'live') {
    if (open !== null && now < open) return 'upcoming';
    return 'live';
  }
  return 'past';
}

function inrFromPaise(paise: number): string {
  // Convert paise → rupees, show as Indian rupee with grouping. Round
  // to whole rupees because the dashboard surface doesn't show decimals.
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function formatIstDate(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
  });
}

function dateLine(ev: OrganiserEventListItem): string {
  const open = formatIstDate(ev.registrationOpenAt);
  const close = formatIstDate(ev.registrationCloseAt);
  const fmt =
    ev.eventFormat === 'in_person' ? 'Physical' : 'Virtual';
  if (open && close) return `${open} → ${close} · ${fmt}`;
  if (open) return `${open} · ${fmt}`;
  if (close) return `Closes ${close} · ${fmt}`;
  return fmt;
}

function StatusPill({ status }: { status: OrganiserEventListItem['eventStatus'] }) {
  const map: Record<OrganiserEventListItem['eventStatus'], string> = {
    live: 'bg-signal text-bone',
    draft: 'bg-jet/10 text-jet/60',
    pending_review: 'bg-gold/20 text-jet',
    closed: 'bg-jet/10 text-jet/60',
    cancelled: 'bg-jet/10 text-jet/60',
  };
  const label: Record<OrganiserEventListItem['eventStatus'], string> = {
    live: 'Live',
    draft: 'Draft',
    pending_review: 'In review',
    closed: 'Closed',
    cancelled: 'Cancelled',
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium shrink-0 ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

function EventRow({ ev, accent }: { ev: OrganiserEventListItem; accent: string | null }) {
  const titleShort = ev.title.split(/[·:]/)[0]?.trim().slice(0, 10) || ev.title.slice(0, 10);
  const coverBg = accent
    ? { backgroundColor: accent }
    : undefined;
  const showImage = !!ev.coverImageUrl;

  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-jet/20 transition">
      <div
        className={`w-16 sm:w-20 h-16 sm:h-20 rounded-xl flex-shrink-0 relative overflow-hidden ${
          showImage ? '' : accent ? '' : 'bg-gradient-to-br from-jet to-slate'
        }`}
        style={showImage ? undefined : coverBg}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ev.coverImageUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <span className="absolute bottom-1.5 left-2 text-bone font-display text-xs uppercase font-bold drop-shadow">
          {titleShort}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="font-medium text-sm truncate">{ev.title}</p>
          <StatusPill status={ev.eventStatus} />
        </div>
        <p className="text-[12px] text-jet/55">{dateLine(ev)}</p>
        <p className="text-[11px] text-jet/55 md:hidden mt-0.5">
          {ev.totalRegistrations} regs · {inrFromPaise(ev.totalRevenuePaise)}
        </p>
      </div>
      <div className="hidden md:block text-right pr-2">
        <p className="text-[10px] uppercase tracking-wider text-jet/50">Registrations</p>
        <p className="text-sm font-medium">{ev.totalRegistrations}</p>
      </div>
      <div className="hidden md:block text-right pr-2">
        <p className="text-[10px] uppercase tracking-wider text-jet/50">Revenue</p>
        <p className="text-sm font-medium">{inrFromPaise(ev.totalRevenuePaise)}</p>
      </div>
      <Link
        href={`/admin/studio/organiser/events/${ev.id}`}
        className="text-xs px-3 py-1.5 rounded-lg border border-jet/15 hover:bg-jet/5 shrink-0"
      >
        Manage
      </Link>
    </div>
  );
}

export function EventsList() {
  const [tab, setTab] = useState<Tab>('live');
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useOrganiserEvents({});

  const items = data?.items ?? [];

  const buckets = useMemo(() => {
    const now = Date.now();
    const result: Record<Tab, OrganiserEventListItem[]> = {
      live: [],
      upcoming: [],
      past: [],
      drafts: [],
    };
    for (const ev of items) result[eventBucket(ev, now)].push(ev);
    return result;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = buckets[tab];
    if (!q) return rows;
    return rows.filter((ev) => ev.title.toLowerCase().includes(q));
  }, [buckets, tab, query]);

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your events"
        message={describeOrganiserError(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 mb-4 border-b border-jet/10 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const count = buckets[t.id].length;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap ${
                  active
                    ? 'font-medium border-b-2 border-jet text-jet'
                    : 'text-jet/60 hover:text-jet border-b-2 border-transparent'
                }`}
              >
                {t.label}
                <span className={active ? 'text-jet/50 ml-1' : 'text-jet/40 ml-1'}>
                  · {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto pl-3 flex items-center gap-2 shrink-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            className="px-3 py-1.5 text-xs border border-jet/10 rounded-lg outline-none focus:border-jet w-36 sm:w-48 bg-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-jet/15 rounded-2xl p-8 text-center">
            <p className="font-display uppercase text-sm font-bold text-jet/50 mb-1">
              {query ? 'No matches' : `No ${tab} events`}
            </p>
            <p className="text-xs text-jet/40">
              {query
                ? 'Try a different search term.'
                : tab === 'drafts'
                  ? 'Drafts you start will appear here.'
                  : 'Once you publish events, they’ll show up here.'}
            </p>
          </div>
        ) : (
          filtered.map((ev) => (
            <EventRow key={ev.id} ev={ev} accent={null} />
          ))
        )}
      </div>
    </>
  );
}
