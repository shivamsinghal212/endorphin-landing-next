'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ErrorState, Skeleton, StudioTopBar } from '@/app/admin/studio/_components/ui';
import {
  describeOrganiserError,
  useEventStats,
  useOrganiserEvent,
  useUpdateOrganiserEvent,
} from '@/lib/studio/organiser-hooks';
import type { EventStatus, OrganiserEvent } from '@/lib/organiser-api';
import { Overview } from './overview';
import { Registrations } from './registrations';
import { VerificationsStub } from './verifications-stub';
import { Coupons } from './coupons';
import { CommunicationsStub } from './communications-stub';
import { SettingsStub } from './settings-stub';
import { formatShortDate } from './_utils';

type TabKey =
  | 'overview'
  | 'registrations'
  | 'verifications'
  | 'coupons'
  | 'communications'
  | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'verifications', label: 'Verifications' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'communications', label: 'Communications' },
  { key: 'settings', label: 'Settings' },
];

function isTabKey(v: string | null): v is TabKey {
  return !!v && TABS.some((t) => t.key === v);
}

export function EventShell({ eventId }: { eventId: string }) {
  const params = useSearchParams();
  const rawTab = params.get('tab');
  const tab: TabKey = isTabKey(rawTab) ? rawTab : 'overview';

  const eventQ = useOrganiserEvent(eventId);
  const statsQ = useEventStats(eventId);

  return (
    <>
      <StudioTopBar
        back={{ href: '/admin/studio/organiser', label: 'Home' }}
        title={null}
      />
      <EventHeader
        eventId={eventId}
        event={eventQ.data ?? null}
        loading={eventQ.isLoading}
      />
      <SubTabs
        eventId={eventId}
        activeTab={tab}
        registrations={statsQ.data?.registrationsCount ?? null}
        verifications={
          statsQ.data
            ? Math.max(0, statsQ.data.paidCount - statsQ.data.verifiedCount)
            : null
        }
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {eventQ.isError ? (
          <ErrorState
            title="Couldn't load event"
            message={String(eventQ.error)}
            onRetry={() => eventQ.refetch()}
          />
        ) : tab === 'overview' ? (
          <Overview eventId={eventId} event={eventQ.data ?? null} />
        ) : tab === 'registrations' ? (
          <Registrations eventId={eventId} event={eventQ.data ?? null} />
        ) : tab === 'verifications' ? (
          <VerificationsStub />
        ) : tab === 'coupons' ? (
          <Coupons eventId={eventId} />
        ) : tab === 'communications' ? (
          <CommunicationsStub />
        ) : (
          <SettingsStub />
        )}
      </main>
    </>
  );
}

// ── Event header ───────────────────────────────────────────────────────────

const STATUS_PILL: Record<EventStatus, { label: string; className: string }> = {
  live: {
    label: 'Live',
    className: 'bg-signal text-bone',
  },
  pending_review: {
    label: 'Pending review',
    className: 'bg-gold/20 text-gold',
  },
  draft: {
    label: 'Draft',
    className: 'bg-jet/10 text-jet/60',
  },
  closed: {
    label: 'Closed',
    className: 'bg-jet/15 text-jet/60',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-jet/15 text-jet/60',
  },
};

function EventHeader({
  eventId,
  event,
  loading,
}: {
  eventId: string;
  event: OrganiserEvent | null;
  loading: boolean;
}) {
  const dateLine = useMemo(() => {
    if (!event) return null;
    const startISO = event.distanceCategories
      .map((d) => d.startDate)
      .filter(Boolean)[0] ?? null;
    const endISO = event.distanceCategories
      .map((d) => d.endDate)
      .filter(Boolean)
      .slice(-1)[0] ?? null;
    const start = formatShortDate(startISO);
    const end = formatShortDate(endISO);
    const distancesCount = event.distanceCategories.length;
    const formatLabel = event.eventFormat === 'virtual' ? 'Virtual' : 'In person';
    const closes = formatShortDate(event.registrationCloseAt);

    const bits: string[] = [];
    if (start && end) bits.push(`${start} → ${end}`);
    else if (start) bits.push(start);
    bits.push(`${distancesCount} distance${distancesCount === 1 ? '' : 's'}`);
    bits.push(formatLabel);
    if (closes) bits.push(`Closes ${closes}`);
    return bits.join(' · ');
  }, [event]);

  return (
    <header className="bg-white border-b border-jet/10 px-4 sm:px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center gap-3 sm:gap-4 flex-wrap">
        {loading || !event ? (
          <>
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          </>
        ) : (
          <>
            <CoverThumb url={event.coverImageUrl ?? event.imageUrl ?? null} accent={event.accentColor} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate min-w-0">{event.title}</p>
                <StatusPill status={event.eventStatus} />
                <AcceptingRegistrationsToggle event={event} />
              </div>
              {dateLine && (
                <p className="text-[11px] text-jet/50 mt-0.5">{dateLine}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {event.slug && (
                <Link
                  href={`/races/${event.slug}`}
                  target="_blank"
                  className="text-xs px-3 py-1.5 rounded-lg border border-jet/15 hover:bg-jet/5 whitespace-nowrap"
                >
                  View public ↗
                </Link>
              )}
              <Link
                href={`/admin/studio/organiser/events/${eventId}/edit`}
                className="text-xs px-3 py-1.5 rounded-lg bg-jet text-bone whitespace-nowrap"
              >
                Edit
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: EventStatus }) {
  const meta = STATUS_PILL[status] ?? STATUS_PILL.draft;
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium shrink-0 ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

/**
 * Click-to-flip control for `event.acceptingRegistrations` — runtime master
 * switch for new signups. Renders inline next to the StatusPill in the
 * event header so the organiser can pause registrations from any sub-tab
 * without entering the edit wizard.
 *
 * UI reads the latest value straight from the cached event (React Query
 * does an in-place update on mutation success, so no manual optimistic
 * dance is needed — the new value lands before the toast clears).
 */
function AcceptingRegistrationsToggle({ event }: { event: OrganiserEvent }) {
  const mut = useUpdateOrganiserEvent(event.id);
  const accepting = event.acceptingRegistrations;
  const disabled = mut.isPending;

  const flip = async () => {
    const next = !accepting;
    try {
      await mut.mutateAsync({ acceptingRegistrations: next });
      toast.success(
        next ? 'Registrations resumed' : 'Registrations paused',
        { description: next ? 'New signups can come in.' : 'Existing registrations stay valid.' },
      );
    } catch (err) {
      toast.error('Could not update', { description: describeOrganiserError(err) });
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      disabled={disabled}
      aria-pressed={accepting}
      title={accepting ? 'Click to pause new registrations' : 'Click to resume new registrations'}
      className={`group inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium shrink-0 transition disabled:opacity-50 ${
        accepting
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-jet/10 text-jet/60 hover:bg-jet/15'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          accepting ? 'bg-emerald-600' : 'bg-jet/40'
        }`}
        aria-hidden
      />
      {accepting ? 'Accepting' : 'Paused'}
    </button>
  );
}

function CoverThumb({ url, accent }: { url: string | null; accent: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-signal to-[#8B0F14]"
      style={accent ? { background: `linear-gradient(135deg, ${accent}, #8B0F14)` } : undefined}
      aria-hidden
    />
  );
}

// ── Sub-tabs ───────────────────────────────────────────────────────────────

function SubTabs({
  eventId,
  activeTab,
  registrations,
  verifications,
}: {
  eventId: string;
  activeTab: TabKey;
  registrations: number | null;
  verifications: number | null;
}) {
  return (
    <div className="bg-white border-b border-jet/10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const isActive = t.key === activeTab;
            const count =
              t.key === 'registrations'
                ? registrations
                : t.key === 'verifications'
                  ? verifications
                  : null;
            const href =
              t.key === 'overview'
                ? `/admin/studio/organiser/events/${eventId}`
                : `/admin/studio/organiser/events/${eventId}?tab=${t.key}`;
            return (
              <Link
                key={t.key}
                href={href}
                className={`px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-b-2 border-jet text-jet font-medium'
                    : 'text-jet/60 hover:text-jet'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {t.label}
                {count != null && count > 0 ? ` · ${count.toLocaleString('en-IN')}` : ''}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
