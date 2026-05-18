'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Club } from '@/lib/admin-api';
import {
  describeError,
  useStudioEventRsvps,
  useStudioEvents,
  useStudioRsvpSummary,
} from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import {
  ClubAvatar,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../_components/ui';

export function RsvpsContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const eventsQ = useStudioEvents(slug);
  const summaryQ = useStudioRsvpSummary(slug);

  const upcoming = useMemo(() => {
    const list = eventsQ.data ?? [];
    const now = Date.now();
    return list
      .filter((e) => Date.parse(e.startTime) >= now)
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  }, [eventsQ.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to the first upcoming event when data lands.
  useEffect(() => {
    if (selectedId == null && upcoming.length > 0) {
      setSelectedId(upcoming[0].id);
    }
  }, [upcoming, selectedId]);

  const rsvpsQ = useStudioEventRsvps(slug, selectedId ?? '');

  const selectedEvent = upcoming.find((e) => e.id === selectedId) || null;
  const goingCount =
    summaryQ.data?.find((r) => r.eventId === selectedId)?.goingCount ??
    selectedEvent?.goingCount ??
    0;

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="People & runs"
      pageTitle="RSVPs"
    >
      {eventsQ.isError ? (
        <ErrorState
          title="Couldn't load events"
          message={describeError(eventsQ.error)}
          onRetry={() => eventsQ.refetch()}
        />
      ) : eventsQ.isLoading ? (
        <Skeleton className="h-12 w-full max-w-md mb-4" />
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          message="Schedule a run to start seeing RSVPs here."
          cta={{
            label: '+ New event',
            href: `/admin/studio/${encodeURIComponent(slug)}/events/new`,
          }}
        />
      ) : (
        <>
          <div className="bg-white border border-jet/10 rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap">
            <p className="text-[10px] uppercase tracking-wider text-jet/40">
              Event
            </p>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-jet/10 text-sm bg-white outline-none focus:border-jet flex-1 min-w-[200px]"
            >
              {upcoming.map((e) => {
                const d = new Date(e.startTime);
                return (
                  <option key={e.id} value={e.id}>
                    {e.title} ·{' '}
                    {d.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </option>
                );
              })}
            </select>
            <span className="text-sm text-jet/60">
              <span className="font-display text-lg font-bold tabular-nums">
                {goingCount}
              </span>{' '}
              going
            </span>
          </div>

          {!selectedId ? null : rsvpsQ.isError ? (
            <ErrorState
              title="Couldn't load attendees"
              message={describeError(rsvpsQ.error)}
              onRetry={() => rsvpsQ.refetch()}
            />
          ) : rsvpsQ.isLoading ? (
            <ListSkeleton />
          ) : (rsvpsQ.data ?? []).length === 0 ? (
            <EmptyState
              title="No-one's RSVPed yet"
              message="Share the event in your WhatsApp group to get the ball rolling."
            />
          ) : (
            <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
              {(rsvpsQ.data ?? []).map((r, i, arr) => (
                <div
                  key={r.userId}
                  className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center p-4 ${
                    i === arr.length - 1 ? '' : 'border-b border-jet/5'
                  }`}
                >
                  <ClubAvatar
                    src={r.pictureUrl ?? null}
                    name={r.name}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-jet/50 truncate">
                      {r.email || '—'}
                    </p>
                  </div>
                  <span className="text-[11px] text-jet/40 whitespace-nowrap">
                    RSVPed{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ManageShell>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-4 ${
            i === 2 ? '' : 'border-b border-jet/5'
          }`}
        >
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
