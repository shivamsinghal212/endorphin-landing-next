'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMyClubs, describeError } from '@/lib/studio/hooks';
import { useStudioAuth } from '@/lib/studio/auth-context';
import {
  describeOrganiserError,
  useMyOrganiser,
  useSetEventClub,
} from '@/lib/studio/organiser-hooks';
import { ClubAvatar, ErrorState, Skeleton } from '../../_components/ui';
import { useBodyScrollLock } from './_sheet';

/** Attach the hosting run club — the optional post-create step.
 *
 *  Only clubs the user owns or admins are listed, because that is the only
 *  thing the backend will accept. Rather than silently hiding everything
 *  else, the empty state points at claiming, which is the actual next step
 *  for someone whose club is on Endorfin but unclaimed.
 */
export function ClubSheet({
  open,
  onClose,
  eventId,
  currentClubId,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  currentClubId: string | null;
}) {
  const clubsQ = useMyClubs('admin');
  const setClub = useSetEventClub(eventId);
  const studio = useStudioAuth();
  const organiserQ = useMyOrganiser();
  const [picked, setPicked] = useState<string | null>(currentClubId);

  // Re-sync whenever it reopens — a cancelled edit must not stick around.
  useEffect(() => {
    if (open) setPicked(currentClubId);
  }, [open, currentClubId]);

  // Escape to dismiss, matching every other overlay on the studio.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !setClub.isPending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, setClub.isPending]);

  useBodyScrollLock(open);

  if (!open) return null;

  const clubs = clubsQ.data ?? [];
  const dirty = picked !== currentClubId;

  // "Just me" told the user nothing and rendered a "JU" avatar. Show who
  // they'd actually be publishing as — the organiser profile's brand when
  // there is one, otherwise their own account.
  const organiser = organiserQ.data ?? null;
  const selfName = organiser?.displayName ?? studio?.name ?? 'You';
  const selfMeta =
    organiser?.contactEmail ?? studio?.email ?? 'Hosted under your own name';
  const selfLogo = organiser?.brandLogoUrl ?? studio?.pictureUrl ?? null;

  const onSave = async () => {
    try {
      await setClub.mutateAsync(picked);
      toast.success(
        picked ? 'Host updated' : 'Club removed — this is yours again',
      );
      onClose();
    } catch (e) {
      toast.error("Couldn't change the host", {
        description: describeOrganiserError(e),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !setClub.isPending && onClose()}
        className="absolute inset-0 bg-jet/70 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-2xl shadow-2xl">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-5">
          <div className="px-6 pt-6 pb-5">
            <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2">
              Optional
            </p>
            <h2
              id="club-sheet-title"
              className="text-[28px] md:text-[30px] italic font-bold leading-[1.05] tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
            >
              Whose run <span className="text-signal">is this?</span>
            </h2>
            <p className="text-[13px] text-jet/55 leading-relaxed">
              Attach a club and the event lands on its page, notifies its
              members and joins its calendar. You can only pick a club you run.
            </p>
          </div>

          <div className="px-6 flex flex-col gap-2.5">
            {clubsQ.isError ? (
              <ErrorState
                title="Couldn't load your clubs"
                message={describeError(clubsQ.error)}
                onRetry={() => clubsQ.refetch()}
              />
            ) : clubsQ.isLoading ? (
              <>
                <Skeleton className="h-[62px]" />
                <Skeleton className="h-[62px]" />
              </>
            ) : (
              <>
                {/* Grouped and labelled: an organiser profile and a club often
                  share a name, and rendered identically they're impossible
                  to tell apart — which is which, and which is selected. */}
                <p className="text-[10px] uppercase tracking-wider text-jet/40">
                  Under your own name
                </p>
                <ClubOption
                  selected={picked === null}
                  onSelect={() => setPicked(null)}
                  name={selfName}
                  meta={selfMeta}
                  logoUrl={selfLogo}
                  badge="Personal"
                />

                {clubs.length > 0 && (
                  <p className="text-[10px] uppercase tracking-wider text-jet/40 mt-2">
                    Your run {clubs.length === 1 ? 'club' : 'clubs'}
                  </p>
                )}
                {clubs.map((c) => (
                  <ClubOption
                    key={c.id}
                    selected={picked === c.id}
                    onSelect={() => setPicked(c.id)}
                    name={c.name}
                    meta={`${c.city}${
                      c.stats?.members
                        ? ` · ${c.stats.members.toLocaleString('en-IN')} members`
                        : ''
                    }`}
                    logoUrl={c.logoUrl}
                    badge="Club"
                  />
                ))}
              </>
            )}
          </div>

          {/* Only worth a card when there's nothing to pick. With clubs
            listed it's noise beside the thing they came here to do. */}
          {clubs.length === 0 ? (
            <div className="mx-6 mt-4 px-4 py-3.5 rounded-xl bg-signal/5 border border-signal/15 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-medium">Run a club?</p>
                <p className="text-xs text-jet/50 mt-px leading-relaxed">
                  We probably already track it. Claim it and it&rsquo;s yours to
                  run.
                </p>
              </div>
              <Link
                href="/clubs"
                className="font-display text-[11px] uppercase tracking-wider font-medium text-signal whitespace-nowrap"
              >
                Claim &rarr;
              </Link>
            </div>
          ) : (
            <p className="px-6 mt-3 text-[11px] text-jet/40">
              Missing one?{' '}
              <Link href="/clubs" className="text-jet/60 underline">
                Claim your club
              </Link>{' '}
              and it shows up here.
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-end gap-2.5 px-6 py-4 border-t border-jet/[0.08] bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={setClub.isPending}
            className="px-4 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || setClub.isPending}
            className="px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {setClub.isPending
              ? 'Saving…'
              : picked
                ? 'Host as this club'
                : 'Host as myself'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClubOption({
  selected,
  onSelect,
  name,
  meta,
  logoUrl,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  meta: string;
  logoUrl?: string | null;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-[1.5px] border-jet bg-jet/[0.02]'
          : 'border border-jet/[0.12] hover:border-jet/25'
      }`}
    >
      <span
        className={`w-[19px] h-[19px] rounded-full flex-shrink-0 ${
          selected
            ? 'border-[5px] border-jet bg-white'
            : 'border-[1.5px] border-jet/25'
        }`}
      />
      <span className="w-[34px] h-[34px] flex-shrink-0">
        <ClubAvatar src={logoUrl ?? null} name={name} size={34} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{name}</span>
        <span className="block text-xs text-jet/45 truncate">{meta}</span>
      </span>
      {badge && (
        <span className="flex-shrink-0 font-display text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-jet/[0.06] text-jet/50">
          {badge}
        </span>
      )}
    </button>
  );
}
