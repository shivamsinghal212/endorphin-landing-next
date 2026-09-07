'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { eventPath } from '@/lib/event-path';
import type { Organiser, OrganiserEvent } from '@/lib/organiser-api';
import {
  describeOrganiserError,
  useMyOrganiser,
  useOrganiserEvent,
  useSubmitEventForReview,
  useUpdateOrganiserEvent,
} from '@/lib/studio/organiser-hooks';
import { useMyClubs } from '@/lib/studio/hooks';
import {
  ClubAvatar,
  ErrorState,
  Skeleton,
  StudioTopBar,
} from '../../_components/ui';
import { ClubSheet } from './_club-sheet';
import { OrganiserSheet } from './_organiser-sheet';
import { SectionEditor, type SectionId } from './_section-editors';
import { CouponsSheet } from './_coupons-sheet';

/** One thing still to do (or already done) before an event can go out. */
interface Task {
  id: string;
  label: string;
  /** Shown when done — what the answer turned out to be. */
  done?: string;
  /** Shown when not done — why it matters / what's being asked. */
  todo: string;
  complete: boolean;
  href?: string;
  onClick?: () => void;
  cta: string;
  /** Optional tasks never gate publishing. */
  optional?: boolean;
  /** Only true for the payout row, which is styled as the one hard blocker. */
  emphasis?: boolean;
  /** Not actionable yet — rendered inert with a muted "Coming soon" tag. */
  soon?: boolean;
}

function words(md: string | null | undefined): number {
  return (md ?? '').trim() ? (md ?? '').trim().split(/\s+/).length : 0;
}

/** Tier prices are stored in RUPEES (legacy `EventDistanceCategory.price`),
 *  unlike the `*Paise` fields on the dashboard list. Don't divide. */
function inr(rupees: number): string {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventHome({ eventId }: { eventId: string }) {
  const eventQ = useOrganiserEvent(eventId);
  const submitMut = useSubmitEventForReview(eventId);
  const [clubSheetOpen, setClubSheetOpen] = useState(false);
  const [organiserSheetOpen, setOrganiserSheetOpen] = useState(false);
  const [section, setSection] = useState<SectionId | null>(null);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const organiserQ = useMyOrganiser();
  // Only to name the attached club — the event carries just `clubId`, and
  // the clubs a user admins is already cached for the club picker.
  const clubsQ = useMyClubs('admin');

  const event = eventQ.data;
  const hostClub = (clubsQ.data ?? []).find((c) => c.id === event?.clubId);

  const paidTiers = useMemo(
    () => (event?.distanceCategories ?? []).filter((d) => (d.price ?? 0) > 0),
    [event],
  );
  const isPaid = paidTiers.length > 0;

  const tasks: Task[] = useMemo(() => {
    if (!event) return [];
    const tiers = event.distanceCategories ?? [];
    const cheapest = tiers.length
      ? Math.min(...tiers.map((t) => t.price ?? 0))
      : 0;

    const list: Task[] = [
      {
        id: 'details',
        label: 'Event details',
        complete: !!event.coverImageUrl,
        done: [fmtDate(event.startTime), event.locationName]
          .filter(Boolean)
          .join(' · '),
        todo: 'Name, cover image, when it runs and where people meet.',
        onClick: () => setSection('details'),
        cta: event.coverImageUrl ? 'Edit' : 'Finish →',
      },
      {
        id: 'description',
        label: 'Description',
        complete: words(event.descriptionMd) > 0,
        done: `${words(event.descriptionMd)} words`,
        todo: 'Pace groups, the route, what happens after.',
        onClick: () => setSection('description'),
        cta: event.descriptionMd ? 'Edit' : 'Write →',
      },
      {
        id: 'tickets',
        label: 'Tickets',
        complete: tiers.length > 0,
        done: `${tiers.length} ${tiers.length === 1 ? 'ticket' : 'tickets'}${
          tiers.length ? ` · ${cheapest > 0 ? inr(cheapest) : 'Free'}` : ''
        }`,
        todo: 'At least one ticket, free or paid.',
        onClick: () => setSection('tickets'),
        cta: tiers.length ? 'Edit' : 'Add →',
      },
    ];

    list.push(
      // Optional: both fields fall back to a standard house policy when the
      // organiser leaves them blank, so an event is publishable without
      // touching this. It stays on the list because the organiser should
      // know what is being shown in their name.
      {
        id: 'policies',
        label: 'Refunds & terms',
        complete: !!event.refundPolicyMd?.trim() && !!event.termsMd?.trim(),
        done: 'Both written',
        todo: 'Standard no-refund policy and terms apply unless you change them.',
        onClick: () => setSection('policies'),
        cta: event.refundPolicyMd?.trim() ? 'Edit' : 'Review →',
        optional: true,
      } satisfies Task,
      // Only a priced ticket surfaces payouts at all. Nothing to do here
      // yet — ticket money is collected centrally and settled by hand — so
      // this row exists to say so rather than to ask for anything.
      ...(isPaid
        ? [
            {
              id: 'payouts',
              label: 'Payouts',
              complete: false,
              todo:
                'We collect ticket money and settle it with you directly. Self-serve payouts are on the way.',
              cta: 'Coming soon',
              optional: true,
              soon: true,
            } satisfies Task,
          ]
        : []),
      {
        id: 'schedule',
        label: 'Schedule the opening',
        complete: !!event.registrationOpenAt,
        done: `Opens ${fmtDate(event.registrationOpenAt)}`,
        todo: 'Open registrations at a set time instead of straight away.',
        onClick: () => setSection('schedule'),
        cta: event.registrationOpenAt ? 'Edit' : 'Set →',
        optional: true,
      },
      {
        id: 'charity',
        label: 'Charity partner',
        complete: !!event.ngoName,
        done: event.ngoName ?? '',
        todo: 'Route a share of every entry to an NGO.',
        onClick: () => setSection('charity'),
        cta: 'Add →',
        optional: true,
      },
      {
        id: 'coupons',
        label: 'Coupons',
        complete: false,
        todo: 'Discount codes for members, partners or early birds.',
        onClick: () => setCouponsOpen(true),
        cta: 'Manage →',
        optional: true,
      },
      {
        id: 'questions',
        label: 'Registration questions',
        complete: (event.registrationForm?.length ?? 0) > 0,
        done: `${event.registrationForm?.length} added`,
        todo: 'T-shirt size, emergency contact, anything else you need.',
        onClick: () => setSection('questions'),
        cta: (event.registrationForm?.length ?? 0) > 0 ? 'Edit' : 'Add →',
        optional: true,
      },
    );

    return list;
  }, [event, eventId, isPaid]);

  const required = tasks.filter((t) => !t.optional);
  const optional = tasks.filter((t) => t.optional);
  const doneCount = required.filter((t) => t.complete).length;
  const blockers = required.filter((t) => !t.complete);
  const isDraft = event?.eventStatus === 'draft';

  const onPublish = async () => {
    try {
      await submitMut.mutateAsync();
      toast.success('Sent for review', {
        description: 'We usually get through these within a day.',
      });
    } catch (e) {
      toast.error('Could not publish', { description: describeOrganiserError(e) });
    }
  };

  // ── loading / error ──────────────────────────────────────────────────
  if (eventQ.isError) {
    return (
      <>
        <StudioTopBar back={{ href: '/admin/studio', label: 'Studio' }} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-16">
          <ErrorState
            title="Couldn't load this event"
            message={describeOrganiserError(eventQ.error)}
            onRetry={() => eventQ.refetch()}
          />
        </main>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <StudioTopBar back={{ href: '/admin/studio', label: 'Studio' }} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-16">
          <Skeleton className="h-9 w-72 mb-6" />
          <Skeleton className="h-11 w-full mb-6" />
          <div className="flex gap-8">
            <Skeleton className="h-96 flex-1" />
            <Skeleton className="h-64 w-[344px] hidden lg:block" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <StudioTopBar
        back={{ href: '/admin/studio', label: 'Studio' }}
        right={
          <div className="flex items-center gap-2">
            <Link
              href={`${eventPath(event)}?preview=1`}
              target="_blank"
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-jet/15 text-xs hover:bg-jet/5"
            >
              Preview ↗
            </Link>
            {isDraft && (
              <button
                type="button"
                onClick={onPublish}
                disabled={blockers.length > 0 || submitMut.isPending}
                title={
                  blockers.length
                    ? `Still to do: ${blockers.map((b) => b.label).join(', ')}`
                    : undefined
                }
                className="px-4 py-1.5 rounded-lg bg-jet text-bone text-xs font-medium hover:bg-jet/90 disabled:bg-jet/10 disabled:text-jet/40 disabled:cursor-not-allowed"
              >
                {submitMut.isPending ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
        <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-1">
          Event
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="font-display uppercase text-2xl md:text-[32px] font-bold tracking-tight">
            {event.title}
          </h1>
          <StatusPill status={event.eventStatus} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="flex-1 min-w-0 w-full">
            {isDraft ? (
              <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-display uppercase text-sm font-bold">
                      Before you publish
                    </p>
                    <p className="text-[13px] font-medium tabular-nums">
                      {doneCount}{' '}
                      <span className="text-jet/40">of {required.length}</span>
                    </p>
                  </div>
                  <p className="text-xs text-jet/50 mb-3">
                    Do these in any order. Nothing is public until you publish.
                  </p>
                  <div
                    className="h-1.5 rounded-full bg-jet/[0.08] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={doneCount}
                    aria-valuemin={0}
                    aria-valuemax={required.length}
                    aria-label="Setup progress"
                  >
                    <div
                      className="h-full bg-jet rounded-full transition-[width] duration-300"
                      style={{
                        width: `${(doneCount / Math.max(1, required.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="border-t border-jet/[0.07]">
                  {required.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>

                <div className="bg-jet/[0.02] border-t border-jet/[0.07] px-5 pt-3.5 pb-1">
                  <p className="text-[10px] uppercase tracking-wider text-jet/40">
                    Optional — can wait until after it’s live
                  </p>
                </div>
                <div className="bg-jet/[0.02]">
                  {optional.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </div>
            ) : (
              <LivePanel event={event} eventId={eventId} tasks={tasks} />
            )}
          </div>

          {/* ── rail ── */}
          <aside className="w-full lg:w-[344px] lg:flex-shrink-0 flex flex-col gap-4">
            <RegistrationsCard event={event} />

            <HostCard
              event={event}
              clubName={hostClub?.name ?? null}
              clubLogoUrl={hostClub?.logoUrl ?? null}
              organiser={organiserQ.data ?? null}
              onChangeHost={() => setClubSheetOpen(true)}
              onEditDetails={() => setOrganiserSheetOpen(true)}
            />

            <EventPageCard event={event} isDraft={isDraft} />

            {isDraft && (
              <div className="bg-white border border-jet/10 rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-3">
                  When you hit publish
                </p>
                <ol className="flex flex-col gap-2.5 list-none p-0 m-0">
                  {[
                    'We review it — usually within a day.',
                    'It lists on Endorfin and, if you attached one, the club’s page.',
                    'Registrations open on your window.',
                  ].map((line, i) => (
                    <li key={line} className="flex gap-2.5">
                      <span className="font-display text-[11px] text-jet/35 w-3.5 flex-shrink-0 pt-px">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-jet/70 leading-relaxed">
                        {line}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </main>

      <CouponsSheet
        open={couponsOpen}
        onClose={() => setCouponsOpen(false)}
        event={event}
      />

      <SectionEditor
        section={section}
        event={event}
        onClose={() => setSection(null)}
      />

      <OrganiserSheet
        open={organiserSheetOpen}
        onClose={() => setOrganiserSheetOpen(false)}
      />

      <ClubSheet
        open={clubSheetOpen}
        onClose={() => setClubSheetOpen(false)}
        eventId={eventId}
        currentClubId={event.clubId}
      />
    </>
  );
}

function TaskRow({ task }: { task: Task }) {
  const body = (
    <>
      <Marker complete={task.complete} optional={task.optional} emphasis={task.emphasis} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{task.label}</span>
        <span className="block text-xs text-jet/45 mt-px">
          {task.complete && task.done ? task.done : task.todo}
        </span>
      </span>
      {task.soon ? (
        <span className="text-[10px] flex-shrink-0 font-display uppercase tracking-wider px-2 py-1 rounded-full bg-jet/[0.06] text-jet/45">
          {task.cta}
        </span>
      ) : (
        <span
          className={`text-xs flex-shrink-0 ${
            task.complete
              ? 'text-jet/45'
              : task.emphasis
                ? 'font-display uppercase tracking-wider font-medium text-signal'
                : task.optional
                  ? 'text-jet/50'
                  : 'font-display uppercase tracking-wider font-medium text-signal'
          }`}
        >
          {task.cta}
        </span>
      )}
    </>
  );

  const cls = `w-full text-left flex items-center gap-3.5 px-5 py-3.5 border-b border-jet/[0.07] last:border-b-0 ${
    task.soon ? '' : 'hover:bg-jet/[0.02] transition-colors'
  } ${task.emphasis && !task.complete ? 'bg-signal/[0.035]' : ''}`;

  // Nothing to click yet — render it as plain content, not a dead link.
  if (task.soon) {
    return <div className={cls}>{body}</div>;
  }

  if (task.onClick) {
    return (
      <button type="button" onClick={task.onClick} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <Link href={task.href ?? '#'} className={cls}>
      {body}
    </Link>
  );
}

function Marker({
  complete,
  optional,
  emphasis,
}: {
  complete: boolean;
  optional?: boolean;
  emphasis?: boolean;
}) {
  if (complete) {
    return (
      <span className="w-[22px] h-[22px] rounded-full bg-jet flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F5F0EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex-shrink-0 ${
        emphasis
          ? 'border-signal/40'
          : optional
            ? 'border-dashed border-jet/25'
            : 'border-jet/25'
      }`}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const live = status === 'live';
  const review = status === 'pending_review';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-medium ${
        live
          ? 'bg-signal/10 text-signal'
          : review
            ? 'bg-amber-100 text-amber-800'
            : 'bg-jet/10 text-jet/60'
      }`}
    >
      {live && <span className="w-1.5 h-1.5 rounded-full bg-signal" />}
      {live ? 'Live' : review ? 'In review' : status.replace(/_/g, ' ')}
    </span>
  );
}



const SITE = 'https://www.endorfin.run';

/** The event's public link, with the two things you actually do with it.
 *
 *  Copy works even on a draft — people pre-stage captions — but sharing is
 *  held back until the link resolves, since posting a dead URL to a group
 *  chat is worse than waiting. */
function EventPageCard({
  event,
  isDraft,
}: {
  event: OrganiserEvent;
  isDraft: boolean;
}) {
  const path = eventPath(event);
  const url = `${SITE}${path}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Couldn’t copy — select the link and copy it manually');
    }
  };

  const share = async () => {
    const text = `${event.title} — ${url}`;
    // Native sheet on mobile (and Safari); WhatsApp is the fallback because
    // it's where Indian run clubs actually organise.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.title, url });
        return;
      } catch {
        // Dismissed, or blocked — fall through to WhatsApp.
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2.5">
        Event page
      </p>
      <p className="bg-jet/[0.04] rounded-xl px-3 py-2.5 text-xs text-jet/60 break-all leading-relaxed">
        endorfin.run{path}
      </p>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-jet/15 text-xs font-medium hover:bg-jet/5 transition-colors"
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy link
            </>
          )}
        </button>

        <button
          type="button"
          onClick={share}
          disabled={isDraft}
          title={isDraft ? 'Publish it first — the link doesn’t resolve yet' : 'Share'}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-jet text-bone text-xs font-medium hover:bg-jet/90 disabled:bg-jet/10 disabled:text-jet/40 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          Share
        </button>
      </div>

      <p className="text-[11px] text-jet/40 mt-2.5 leading-relaxed">
        {isDraft
          ? 'The link starts working the moment it goes live.'
          : 'Live — share it anywhere.'}
      </p>
    </div>
  );
}

/** The pause switch, out of the sheet and onto the page.
 *
 *  It's the one control here that's operational rather than editorial — the
 *  thing you reach for when a run fills up or the weather turns — so it
 *  shouldn't be two clicks deep inside a form. */
function RegistrationsCard({ event }: { event: OrganiserEvent }) {
  const mut = useUpdateOrganiserEvent(event.id);
  const on = event.acceptingRegistrations;

  const toggle = async () => {
    try {
      await mut.mutateAsync({ acceptingRegistrations: !on });
    } catch (e) {
      toast.error("Couldn't change that", {
        description: describeOrganiserError(e),
      });
    }
  };

  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-1">
            Registrations
          </p>
          <p className="text-sm font-medium">{on ? 'Active' : 'Paused'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Accepting registrations"
          disabled={mut.isPending}
          onClick={toggle}
          className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors p-0.5 disabled:opacity-50 ${
            on ? 'bg-signal' : 'bg-jet/20'
          }`}
        >
          <span
            className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
            style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>
      <p className="text-[11px] text-jet/45 leading-relaxed mt-2.5">
        {on
          ? event.registrationOpenAt &&
            Date.parse(event.registrationOpenAt) > Date.now()
            ? `Scheduled to open ${fmtDate(event.registrationOpenAt)}.`
            : 'Runners can sign up until the event starts.'
          : 'Nobody can sign up. Flip it back any time.'}
      </p>
    </div>
  );
}

/** Who fronts this event, in three states.
 *
 *  Previously this said "Just you" and nothing else, which told the user
 *  neither what runners would see nor how to change it. Now it shows the
 *  real host — club, organiser profile, or the signed-in user as the
 *  fallback — and both routes out are editable.
 */
function HostCard({
  event,
  clubName,
  clubLogoUrl,
  organiser,
  onChangeHost,
  onEditDetails,
}: {
  event: OrganiserEvent;
  clubName: string | null;
  clubLogoUrl: string | null;
  organiser: Organiser | null;
  onChangeHost: () => void;
  onEditDetails: () => void;
}) {
  // A club fronting the event outranks the organiser profile — that's the
  // name runners recognise, and it's what the public page shows.
  if (event.clubId) {
    return (
      <div className="bg-jet text-bone rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-wider text-bone/45 mb-3">
          Hosted by
        </p>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 flex-shrink-0">
            <ClubAvatar src={clubLogoUrl} name={clubName ?? 'Club'} size={40} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {clubName ?? 'A run club you admin'}
            </p>
            <p className="text-[11px] text-bone/55">
              Shows on the club page and reaches its members
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onChangeHost}
          className="mt-4 text-xs border-b border-bone/30 pb-px hover:border-bone"
        >
          Change host
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2.5">
        Hosted by
      </p>

      <div className="flex items-start gap-3">
        {organiser?.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organiser.brandLogoUrl}
            alt=""
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {organiser?.displayName ?? '—'}
          </p>
          <p className="text-xs text-jet/50 truncate">
            {organiser?.contactEmail ?? ''}
          </p>
          {organiser?.contactPhone && (
            <p className="text-xs text-jet/45">{organiser.contactPhone}</p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-jet/45 leading-relaxed mt-2.5">
        {organiser
          ? 'What runners see on the event page and in their confirmation email.'
          : 'Add the name and contact runners should see. We’ll start from your account details.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onEditDetails}
          className="text-xs font-medium border-b border-jet/25 pb-px hover:border-jet"
        >
          {organiser ? 'Edit details' : 'Add host details'}
        </button>
        <button
          type="button"
          onClick={onChangeHost}
          className="text-xs text-jet/55 border-b border-jet/20 pb-px hover:text-jet hover:border-jet"
        >
          Host as a club
        </button>
      </div>
    </div>
  );
}

/** Once it's out of draft the checklist stops being the story — the deeper
 *  surfaces (registrations, check-in, coupons) already exist, so point at
 *  them rather than rebuilding them here. */
function LivePanel({
  event,
  eventId,
  tasks,
}: {
  event: OrganiserEvent;
  eventId: string;
  tasks: Task[];
}) {
  // Same inline editors as the draft checklist — publishing shouldn't take
  // editing away. It only drops the progress framing, since "4 of 5" stops
  // meaning anything once the thing is out in the world.
  const base = `/admin/studio/organiser/events/${eventId}`;
  const links = [
    {
      href: `${base}?tab=registrations`,
      label: 'Registrations',
      hint: 'Who’s signed up, refunds, cancellations',
    },
    {
      href: `${base}?tab=check-in`,
      label: 'Check-in',
      hint: 'Scan bibs on the day',
    },
    {
      href: `${base}?tab=settings`,
      label: 'Settings',
      hint: 'Take the event offline, cancel it',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="font-display uppercase text-sm font-bold">Event</p>
          <p className="text-xs text-jet/50 mt-0.5">
            Edits go live straight away — no re-review.
          </p>
        </div>
        <div className="border-t border-jet/[0.07]">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
        <p className="font-display uppercase text-sm font-bold px-5 pt-5 pb-3">
          Manage
        </p>
        <div className="border-t border-jet/[0.07]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3.5 px-5 py-3.5 border-b border-jet/[0.07] last:border-b-0 hover:bg-jet/[0.02] transition-colors"
            >
              <span className="flex-1">
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-jet/45 mt-px">{l.hint}</span>
              </span>
              <span className="text-xs text-jet/40">→</span>
            </Link>
          ))}
        </div>
      </div>

      {event.eventStatus === 'pending_review' && (
        <p className="text-xs text-jet/50 px-1">
          We’re reviewing this one — you’ll get an email when it goes live.
        </p>
      )}
    </div>
  );
}
