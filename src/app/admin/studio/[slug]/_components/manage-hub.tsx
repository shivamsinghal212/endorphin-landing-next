'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { Club } from '@/lib/admin-api';
import {
  describeError,
  useApproveJoinRequest,
  useRejectJoinRequest,
  useStudioClub,
  useStudioEvents,
  useStudioJoinRequests,
  useStudioRsvpSummary,
} from '@/lib/studio/hooks';
import {
  ClubAvatar,
  ErrorState,
  Skeleton,
  StudioTopBar,
} from '../../_components/ui';
import { QuickNav } from './quick-nav';

export function ManageHub({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const { data: clubData } = useStudioClub(slug);
  const club = clubData ?? initialClub;

  const eventsQ = useStudioEvents(slug);
  const requestsQ = useStudioJoinRequests(slug, 'pending');
  const rsvpSummaryQ = useStudioRsvpSummary(slug);

  const approveMut = useApproveJoinRequest(slug);
  const rejectMut = useRejectJoinRequest(slug);

  const events = eventsQ.data ?? [];
  const requests = requestsQ.data ?? [];
  const summary = rsvpSummaryQ.data ?? [];

  const { upcomingEvents } = useMemo(() => {
    const now = Date.now();
    return {
      upcomingEvents: events
        .filter((e) => Date.parse(e.startTime) >= now)
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
    };
  }, [events]);

  // Pending RSVPs aren't a backend concept yet (RSVPs are open) but the
  // summary tells us per-event going counts. We surface that here as "Up
  // next" but flag whenever a club requiresApproval and there are pending
  // join requests — those serve as the gating action right now.
  const pendingMembers = requests.length;
  const pendingRsvps = 0; // reserved for future per-event approval flow

  const adminsCount = club.admins?.length ?? 0;
  const eventsCount = events.length;

  const handleApprove = async (requestId: string, name: string) => {
    try {
      await approveMut.mutateAsync(requestId);
      toast.success(`${name} is in`);
    } catch (e) {
      toast.error('Could not approve', { description: describeError(e) });
    }
  };

  const handleReject = async (requestId: string, name: string) => {
    try {
      await rejectMut.mutateAsync({ requestId, reason: null });
      toast.success(`${name} declined`);
    } catch (e) {
      toast.error('Could not reject', { description: describeError(e) });
    }
  };

  const base = `/admin/studio/${encodeURIComponent(slug)}`;

  return (
    <>
      <StudioTopBar
        back={{ href: '/admin/studio/clubs', label: 'My clubs' }}
        title={
          <div className="flex items-center gap-2 min-w-0">
            <ClubAvatar src={club.logoUrl} name={club.name} size={28} />
            <p className="font-display uppercase text-sm font-bold truncate leading-tight text-jet">
              {club.name}
            </p>
          </div>
        }
        right={
          <Link
            href={`/clubs/${encodeURIComponent(slug)}`}
            target="_blank"
            className="hidden sm:inline text-xs px-3 py-1.5 rounded-lg border border-jet/10 hover:bg-jet/5 text-jet"
          >
            View public
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto md:flex text-jet">
        <QuickNav
          slug={slug}
          pendingMembers={pendingMembers}
          pendingRsvps={pendingRsvps}
          eventsCount={eventsCount}
          adminsCount={adminsCount}
        />

        <main className="flex-1 min-w-0 px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          {/* Mobile section card list — drill-down (Section B) */}
          <MobileSectionList
            base={base}
            club={club}
            pendingMembers={pendingMembers}
            eventsCount={eventsCount}
            adminsCount={adminsCount}
            summary={summary}
          />

          {/* Desktop bento (Section A) */}
          <DesktopBento
            base={base}
            club={club}
            pendingMembers={pendingMembers}
            upcomingEvents={upcomingEvents}
            requests={requests}
            requestsLoading={requestsQ.isLoading}
            requestsError={requestsQ.isError ? describeError(requestsQ.error) : null}
            onApprove={handleApprove}
            onReject={handleReject}
            approvingId={
              approveMut.isPending ? (approveMut.variables as string) : null
            }
            rejectingId={
              rejectMut.isPending
                ? (rejectMut.variables as { requestId: string })?.requestId ?? null
                : null
            }
          />
        </main>
      </div>
    </>
  );
}

// ─── Mobile drill-down list ───────────────────────────────────────────────

function MobileSectionList({
  base,
  club,
  pendingMembers,
  eventsCount,
  adminsCount,
  summary,
}: {
  base: string;
  club: Club;
  pendingMembers: number;
  eventsCount: number;
  adminsCount: number;
  summary: { eventId: string; goingCount: number }[];
}) {
  const totalGoing = summary.reduce((s, r) => s + (r.goingCount || 0), 0);

  return (
    <div className="md:hidden space-y-3">
      <div className="bg-white border border-jet/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <ClubAvatar src={club.logoUrl} name={club.name} size={48} />
          <div className="flex-1 min-w-0">
            <p className="font-display uppercase text-base font-bold truncate">
              {club.name}
            </p>
            <p className="text-xs text-jet/50">
              {(club.stats?.members ?? 0).toLocaleString('en-IN')} members ·{' '}
              {club.city}
            </p>
          </div>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase ${
              club.publishedAt
                ? 'bg-green-100 text-green-800'
                : 'bg-jet/5 text-jet/60'
            }`}
          >
            {club.publishedAt ? 'Live' : 'Draft'}
          </span>
        </div>
        <Link
          href={`/clubs/${encodeURIComponent(club.slug)}`}
          target="_blank"
          className="block w-full text-center bg-jet text-bone rounded-xl py-2.5 text-sm font-medium hover:bg-jet/90"
        >
          View public page
        </Link>
      </div>

      {pendingMembers > 0 && (
        <Link
          href={`${base}/members`}
          className="block bg-signal/5 border border-signal/15 rounded-xl p-3"
        >
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-signal text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              !
            </span>
            <p className="text-xs flex-1">
              <span className="font-medium">{pendingMembers} runners</span>{' '}
              waiting for your nod
            </p>
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-signal text-white font-medium">
              Review
            </span>
          </div>
        </Link>
      )}

      <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
        <DrillRow
          href={`${base}/about`}
          label="About"
          subtitle={club.subtitle || club.kicker || '—'}
        />
        <DrillRow
          href={`${base}/about`}
          label="Stats"
          subtitle={`${club.stats?.members ?? 0} · ${
            club.stats?.runsThisMonth ?? 0
          } runs · ${club.stats?.kmThisMonth ?? 0} km`}
        />
        <DrillRow
          href={`${base}/social`}
          label="Social & links"
          subtitle={[
            club.whatsappUrl ? 'WhatsApp ✓' : 'WhatsApp —',
            club.instagramUrl ? 'IG ✓' : 'IG —',
            club.stravaUrl ? 'Strava ✓' : 'Strava —',
          ].join(' · ')}
        />
        <DrillRow
          href={`${base}/members`}
          label="Members"
          subtitle={
            pendingMembers
              ? `${pendingMembers} pending request${pendingMembers > 1 ? 's' : ''}`
              : `${club.stats?.members ?? 0} active`
          }
          attention={pendingMembers > 0}
        />
        <DrillRow
          href={`${base}/events`}
          label="Events"
          subtitle={`${eventsCount} total · ${totalGoing} going`}
        />
        <DrillRow
          href={`${base}/rsvps`}
          label="RSVPs"
          subtitle="See who's going to your runs"
        />
        <DrillRow
          href={`${base}/admins`}
          label="Co-admins"
          subtitle={
            adminsCount ? `You + ${Math.max(0, adminsCount - 1)} others` : 'Just you'
          }
        />
        <DrillRow
          href={`${base}/join-form`}
          label="Join form"
          subtitle={`${
            club.requiresApproval ? 'Approval required' : 'Free to join'
          } · ${club.joinForm?.length ?? 0} questions`}
        />
        <DrillRow
          href={`${base}/collaborations`}
          label="Brand & Instagram"
          subtitle={`${club.collaborations?.length ?? 0} partner${
            (club.collaborations?.length ?? 0) === 1 ? '' : 's'
          } · sync from Instagram`}
        />
        <div className="flex items-center gap-3 px-4 py-3.5 opacity-60">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Insights</p>
            <p className="text-[11px] text-jet/40">Coming soon</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-jet/40 px-1">
        Owners can change anything but can&apos;t delete the club.
      </p>
    </div>
  );
}

function DrillRow({
  href,
  label,
  subtitle,
  attention = false,
  last = false,
}: {
  href: string;
  label: string;
  subtitle: string;
  attention?: boolean;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 ${
        last ? '' : 'border-b border-jet/5'
      } hover:bg-jet/[0.02]`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={`text-[11px] truncate ${
            attention ? 'text-signal font-medium' : 'text-jet/50'
          }`}
        >
          {subtitle}
        </p>
      </div>
      <span className="text-jet/30">›</span>
    </Link>
  );
}

// ─── Desktop bento ────────────────────────────────────────────────────────

function DesktopBento({
  base,
  club,
  pendingMembers,
  upcomingEvents,
  requests,
  requestsLoading,
  requestsError,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}: {
  base: string;
  club: Club;
  pendingMembers: number;
  upcomingEvents: { id: string; title: string; startTime: string; locationName: string | null; goingCount: number; distanceKm: number | null }[];
  requests: {
    id: string;
    user: { id: string; name: string; pictureUrl?: string | null };
    formData: Record<string, unknown> | null;
  }[];
  requestsLoading: boolean;
  requestsError: string | null;
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  approvingId: string | null;
  rejectingId: string | null;
}) {
  return (
    <div className="hidden md:block">
      {pendingMembers > 0 && (
        <Link
          href={`${base}/members`}
          className="bg-signal/5 border border-signal/15 rounded-xl p-3 mb-5 flex items-center gap-3 hover:bg-signal/10 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-signal text-white flex items-center justify-center font-bold text-sm">
            !
          </span>
          <p className="text-sm flex-1">
            <span className="font-medium">
              {pendingMembers} runner{pendingMembers > 1 ? 's' : ''}
            </span>{' '}
            want{pendingMembers > 1 ? '' : 's'} to join — take a look?
          </p>
          <span className="text-xs px-3 py-1.5 rounded-lg bg-signal text-white font-medium">
            Review
          </span>
        </Link>
      )}

      <div className="grid grid-cols-12 gap-4 auto-rows-[140px] [&>*]:min-w-0">
        {/* Identity hero */}
        <Link
          href={`${base}/about`}
          className="col-span-12 lg:col-span-7 row-span-2 rounded-3xl bg-jet text-bone p-6 overflow-hidden relative group hover:bg-jet/95 transition-colors"
        >
          <div className="relative h-full flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-bone/50">
              Your club
            </p>
            <p
              className="font-serif italic text-4xl lg:text-5xl leading-[0.95] mt-auto"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              {(club.stats?.members ?? 0).toLocaleString('en-IN')} humans
              <br />
              moving together.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-bone text-jet text-xs font-medium group-hover:bg-bone/90">
                Edit about →
              </span>
              <span className="text-[11px] text-bone/60">
                {club.city}
                {club.establishedYear ? ` · est. ${club.establishedYear}` : ''}
              </span>
            </div>
          </div>
        </Link>

        {/* KPI tiles */}
        <div className="col-span-6 lg:col-span-3 rounded-2xl bg-white border border-jet/10 p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-wider text-jet/40">Members</p>
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {(club.stats?.members ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-jet/50">total in club</p>
          </div>
        </div>
        <div className="col-span-6 lg:col-span-2 rounded-2xl bg-white border border-jet/10 p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-wider text-jet/40">Pending</p>
          <div>
            <p
              className={`font-display text-3xl font-bold tabular-nums ${
                pendingMembers ? 'text-signal' : ''
              }`}
            >
              {pendingMembers}
            </p>
            <p className="text-[11px] text-jet/50">requests</p>
          </div>
        </div>
        <div className="col-span-6 lg:col-span-3 rounded-2xl bg-white border border-jet/10 p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-wider text-jet/40">
            This month
          </p>
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {club.stats?.runsThisMonth ?? 0}
            </p>
            <p className="text-[11px] text-jet/50">runs</p>
          </div>
        </div>
        <div className="col-span-6 lg:col-span-2 rounded-2xl bg-white border border-jet/10 p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-wider text-jet/40">KMs</p>
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {club.stats?.kmThisMonth ?? 0}
            </p>
            <p className="text-[11px] text-jet/50">community</p>
          </div>
        </div>

        {/* Up next events */}
        <div className="col-span-12 lg:col-span-7 row-span-2 rounded-2xl bg-white border border-jet/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold">Up next</p>
            <Link
              href={`${base}/events`}
              className="text-xs text-signal hover:underline"
            >
              Manage all events →
            </Link>
          </div>
          <div className="space-y-2.5">
            {upcomingEvents.length === 0 ? (
              <Link
                href={`${base}/events/new`}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-jet/15 text-jet/50 hover:bg-jet/[0.02]"
              >
                <span className="w-12 h-12 rounded-lg bg-jet/5 flex items-center justify-center text-2xl">
                  +
                </span>
                <span className="text-sm">
                  No upcoming runs — schedule the next one
                </span>
              </Link>
            ) : (
              upcomingEvents.slice(0, 3).map((e) => {
                const d = new Date(e.startTime);
                return (
                  <Link
                    key={e.id}
                    href={`${base}/events/${e.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-jet/5 hover:bg-jet/[0.02]"
                  >
                    <div className="w-12 h-12 rounded-lg bg-jet text-bone flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[9px] uppercase tracking-wider">
                        {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                      <span className="font-display text-base font-bold leading-none">
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
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
                    <span className="text-xs text-jet/60">
                      <span className="font-medium tabular-nums">
                        {e.goingCount}
                      </span>{' '}
                      going
                    </span>
                  </Link>
                );
              })
            )}
            {upcomingEvents.length > 0 && (
              <Link
                href={`${base}/events/new`}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-jet/15 text-jet/50 hover:bg-jet/[0.02]"
              >
                <span className="w-12 h-12 rounded-lg bg-jet/5 flex items-center justify-center text-2xl">
                  +
                </span>
                <span className="text-sm">Add a new event</span>
              </Link>
            )}
          </div>
        </div>

        {/* People who want in */}
        <div className="col-span-12 lg:col-span-5 row-span-2 rounded-2xl bg-signal/5 border border-signal/15 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold text-signal">
              People who want in
            </p>
            <span className="text-xs text-signal">
              {pendingMembers} waiting
            </span>
          </div>
          {requestsError ? (
            <ErrorState
              title="Couldn't load requests"
              message={requestsError}
            />
          ) : requestsLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-3 flex items-center gap-3"
                >
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-xs text-jet/50">
              All caught up. Approve requests as they come in.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-3 flex items-center gap-3"
                >
                  <ClubAvatar
                    src={r.user.pictureUrl ?? null}
                    name={r.user.name}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.user.name}</p>
                    <p className="text-[10px] text-jet/50 truncate">
                      {formatFormSubtitle(r.formData) || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => onApprove(r.id, r.user.name)}
                    disabled={!!approvingId}
                    className="text-green-700 hover:bg-green-50 rounded-md w-8 h-8 flex items-center justify-center text-lg leading-none disabled:opacity-50"
                    title="Approve"
                  >
                    {approvingId === r.id ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      '✓'
                    )}
                  </button>
                  <button
                    onClick={() => onReject(r.id, r.user.name)}
                    disabled={!!rejectingId}
                    className="text-jet/40 hover:bg-jet/5 rounded-md w-8 h-8 flex items-center justify-center text-lg leading-none disabled:opacity-50"
                    title="Reject"
                  >
                    {rejectingId === r.id ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      '×'
                    )}
                  </button>
                </div>
              ))}
              {pendingMembers > 4 && (
                <Link
                  href={`${base}/members`}
                  className="block text-center text-xs font-medium text-signal hover:underline mt-2"
                >
                  See all {pendingMembers} →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* About preview */}
        <Link
          href={`${base}/about`}
          className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-jet/10 p-5 hover:border-jet/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-display uppercase text-sm font-bold">About</p>
            <span className="text-xs text-signal">Edit</span>
          </div>
          <p className="text-sm text-jet/70 line-clamp-3">
            {club.subtitle || club.kicker || 'Add a tagline so members know what to expect.'}
          </p>
          {club.tags && club.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {club.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8F6F3] border border-jet/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </Link>

        {/* Channels */}
        <Link
          href={`${base}/social`}
          className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-jet/10 p-5 hover:border-jet/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold">
              Where you live online
            </p>
            <span className="text-xs text-signal">Edit</span>
          </div>
          <ul className="text-sm space-y-1.5">
            <ChannelRow label="WhatsApp" linked={!!club.whatsappUrl} />
            <ChannelRow label="Instagram" linked={!!club.instagramUrl} />
            <ChannelRow label="Strava" linked={!!club.stravaUrl} />
            <ChannelRow label="Join URL" linked={!!club.joinUrl} />
          </ul>
        </Link>

        {/* Co-admins */}
        <Link
          href={`${base}/admins`}
          className="col-span-12 lg:col-span-4 rounded-2xl bg-white border border-jet/10 p-5 hover:border-jet/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold">
              Co-admins
            </p>
            <span className="text-xs text-signal">Manage</span>
          </div>
          {(club.admins?.length ?? 0) > 0 ? (
            <div className="flex -space-x-2 mb-2">
              {club.admins.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-jet to-signal text-white text-xs font-bold flex items-center justify-center ring-2 ring-white"
                  title={a.name}
                >
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-jet/50">
            {(club.admins?.length ?? 0) > 0
              ? `You + ${Math.max(0, (club.admins?.length ?? 0) - 1)} others can edit this club.`
              : 'Invite a co-admin so you can share the load.'}
          </p>
        </Link>

        {/* Join form preview */}
        <Link
          href={`${base}/join-form`}
          className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-jet/10 p-5 hover:border-jet/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold">
              How people join
            </p>
            <span className="text-xs text-signal">Customise</span>
          </div>
          <p className="text-sm text-jet/70 mb-2">
            <span className="font-medium">
              {club.requiresApproval ? 'Approval required' : 'Free to join'}
            </span>{' '}
            · {club.joinForm?.length ?? 0} question
            {(club.joinForm?.length ?? 0) === 1 ? '' : 's'} on the join form
          </p>
          {club.joinForm && club.joinForm.length > 0 && (
            <ul className="text-xs text-jet/50 space-y-0.5">
              {club.joinForm.slice(0, 3).map((f) => (
                <li key={f.id}>· {f.label}{f.required ? ' (required)' : ''}</li>
              ))}
            </ul>
          )}
        </Link>

        {/* Brand & Instagram */}
        <Link
          href={`${base}/collaborations`}
          className="col-span-12 lg:col-span-6 rounded-2xl bg-white border border-jet/10 p-5 hover:border-jet/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-display uppercase text-sm font-bold">
              Brand &amp; Instagram
            </p>
            <span className="text-xs text-signal">Open</span>
          </div>
          <p className="text-sm text-jet/70 mb-2">
            <span className="font-medium">
              {club.collaborations?.length ?? 0} brand partner
              {(club.collaborations?.length ?? 0) === 1 ? '' : 's'}
            </span>{' '}
            · sync events &amp; partners from Instagram
          </p>
          {club.collaborations && club.collaborations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {club.collaborations.slice(0, 4).map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#F8F6F3] border border-jet/10"
                >
                  {c.brandName}
                </span>
              ))}
            </div>
          )}
        </Link>

        {/* Insights placeholder */}
        <div className="col-span-12 lg:col-span-6 rounded-2xl bg-jet text-bone p-5 overflow-hidden relative">
          <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-1">
            Insights
          </p>
          <p
            className="text-2xl leading-tight mb-2 italic"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            Coming soon.
          </p>
          <p className="text-xs text-bone/60 max-w-xs">
            Member growth · attendance · drop-off · favourite distances. We&apos;ll
            turn this on once we have a few weeks of data.
          </p>
          <div className="mt-3 flex gap-1 items-end h-10 opacity-30">
            <div className="w-3 bg-bone/40 rounded-t" style={{ height: '30%' }} />
            <div className="w-3 bg-bone/50 rounded-t" style={{ height: '50%' }} />
            <div className="w-3 bg-bone/60 rounded-t" style={{ height: '40%' }} />
            <div className="w-3 bg-bone/70 rounded-t" style={{ height: '70%' }} />
            <div className="w-3 bg-bone rounded-t" style={{ height: '85%' }} />
            <div className="w-3 bg-signal rounded-t" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelRow({ label, linked }: { label: string; linked: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-jet/70">{label}</span>
      <span
        className={`text-xs ${linked ? 'text-green-700' : 'text-jet/40'}`}
      >
        {linked ? 'linked' : 'add link'}
      </span>
    </li>
  );
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

function formatFormSubtitle(formData: Record<string, unknown> | null): string {
  if (!formData) return '';
  const parts: string[] = [];
  for (const v of Object.values(formData)) {
    if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    if (typeof v === 'number') parts.push(String(v));
    if (parts.length >= 2) break;
  }
  return parts.join(' · ');
}
