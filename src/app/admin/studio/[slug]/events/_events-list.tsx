'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Club, ClubEvent } from '@/lib/admin-api';
import { describeError, useStudioEvents } from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import { EmptyState, ErrorState, Skeleton } from '../../_components/ui';

type Tab = 'upcoming' | 'past';

const SITE = 'https://www.endorfin.run';

/** Public, shareable URL for an event — UTM-tagged for the Instagram-bio
 *  use case so bio clicks are attributable. Falls back to the UUID id when
 *  the slug hasn't been backfilled yet. */
function shareUrl(clubSlug: string, event: ClubEvent): string {
  const base = `${SITE}/clubs/${clubSlug}/events/${event.slug || event.id}`;
  return `${base}?utm_source=instagram_bio&utm_medium=bio&utm_campaign=club_event`;
}

/** Copy-link affordance for the events list. Sits above the row's navigation
 *  overlay (z-10) and swallows the click so copying never opens the editor. */
function CopyLinkButton({ url }: { url: string }) {
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied — paste it in your Instagram bio');
    } catch {
      toast.error('Couldn’t copy the link');
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy shareable event link"
      title="Copy shareable link"
      className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-jet/15 text-jet/70 hover:bg-jet/5 hover:text-jet"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

export function EventsListContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const [tab, setTab] = useState<Tab>('upcoming');
  const eventsQ = useStudioEvents(slug);

  const { upcoming, past } = useMemo(() => {
    const list = eventsQ.data ?? [];
    const now = Date.now();
    const u = list
      .filter((e) => Date.parse(e.startTime) >= now)
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
    const p = list
      .filter((e) => Date.parse(e.startTime) < now)
      .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
    return { upcoming: u, past: p };
  }, [eventsQ.data]);

  const visible = tab === 'upcoming' ? upcoming : past;
  const base = `/admin/studio/${encodeURIComponent(slug)}`;

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="People & runs"
      pageTitle="Events"
      rightAction={
        <Link
          href={`${base}/events/new`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
        >
          + New event
        </Link>
      }
    >
      <div className="inline-flex rounded-lg bg-white border border-jet/10 p-0.5 text-xs mb-5">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            tab === 'upcoming' ? 'bg-jet text-bone' : 'text-jet/60 hover:text-jet'
          }`}
        >
          Upcoming{' '}
          <span
            className={
              tab === 'upcoming' ? 'text-bone/70' : 'text-jet/40'
            }
          >
            ({upcoming.length})
          </span>
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            tab === 'past' ? 'bg-jet text-bone' : 'text-jet/60 hover:text-jet'
          }`}
        >
          Past{' '}
          <span
            className={tab === 'past' ? 'text-bone/70' : 'text-jet/40'}
          >
            ({past.length})
          </span>
        </button>
      </div>

      {eventsQ.isError ? (
        <ErrorState
          title="Couldn't load events"
          message={describeError(eventsQ.error)}
          onRetry={() => eventsQ.refetch()}
        />
      ) : eventsQ.isLoading ? (
        <ListSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
          message={
            tab === 'upcoming'
              ? 'Schedule the next run so members know when to show up.'
              : 'Past runs will appear here once they happen.'
          }
          cta={
            tab === 'upcoming'
              ? { label: '+ New event', href: `${base}/events/new` }
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
          {visible.map((e, i) => {
            const d = new Date(e.startTime);
            const isLast = i === visible.length - 1;
            return (
              <div
                key={e.id}
                className={`relative grid grid-cols-[64px_1fr_auto_auto] gap-3 items-center px-4 py-3 ${
                  isLast ? '' : 'border-b border-jet/5'
                } hover:bg-jet/[0.015]`}
              >
                {/* Full-row navigation overlay — keeps the row a single click
                    target without nesting a button inside an anchor. */}
                <Link
                  href={`${base}/events/${e.id}`}
                  aria-label={`Edit ${e.title}`}
                  className="absolute inset-0"
                />
                <div className="w-12 h-12 rounded-lg bg-jet text-bone flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[9px] uppercase tracking-wider">
                    {d.toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="font-display text-base font-bold leading-none">
                    {d.getDate()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-jet/50 truncate">
                    {d.toLocaleString('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    {e.locationName ? ` · ${e.locationName}` : ''}
                    {e.distanceKm != null ? ` · ${e.distanceKm}K` : ''}
                  </p>
                </div>
                <span className="text-xs text-jet/60 whitespace-nowrap">
                  <span className="font-medium tabular-nums">{e.goingCount}</span>{' '}
                  going
                </span>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {e.eventType !== 'race_event' && (
                    <CopyLinkButton url={shareUrl(slug, e)} />
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                      e.recap
                        ? 'bg-blue-100 text-blue-800'
                        : e.eventType === 'race_event'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-jet/5 text-jet/60'
                    }`}
                  >
                    {e.recap
                      ? 'Recapped'
                      : e.eventType === 'race_event'
                        ? 'Race'
                        : 'Run'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
          className={`flex items-center gap-3 px-4 py-3 ${
            i === 2 ? '' : 'border-b border-jet/5'
          }`}
        >
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-56" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
