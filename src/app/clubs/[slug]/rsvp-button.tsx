'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import JoinClubFormModal from './join-club-form-modal';
import { cancelRsvpAction, rsvpAction } from '@/app/actions/clubs';
import type { JoinFormField } from '@/lib/admin-api';
import type { MyMembership } from '@/lib/api';

interface RsvpButtonProps {
  slug: string;
  clubName: string;
  eventId: string;
  joinForm: JoinFormField[] | null;
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
  /** When true, render the bigger primary CTA (used in the NextRun hero card). */
  variant?: 'primary' | 'ghost';
}

type Intent = 'rsvp' | 'join-then-rsvp' | 'login-then-rsvp';

function intentFor(
  isAuthed: boolean,
  status: MyMembership['status'] | undefined,
): Intent {
  if (!isAuthed) return 'login-then-rsvp';
  if (status === 'active') return 'rsvp';
  return 'join-then-rsvp';
}

export function RsvpButton({
  slug,
  clubName,
  eventId,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
  variant = 'ghost',
}: RsvpButtonProps) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pending, startTransition] = useTransition();
  // Local toggle hint — backend doesn't expose per-user RSVP state on the
  // events list, so we just track what happened in this session. Refresh
  // resets it; the goingCount stays accurate via router.refresh().
  const [goingHint, setGoingHint] = useState(false);
  const wantsRsvpAfterLogin = useRef(false);
  const wantsRsvpAfterJoin = useRef(false);

  const status = myMembership?.status;

  // After login/join, isAuthed/status flips through props — auto-resume the
  // RSVP if that's what kicked off the modal.
  useEffect(() => {
    if (wantsRsvpAfterLogin.current && isAuthed) {
      wantsRsvpAfterLogin.current = false;
      setFinalizing(false);
      setLoginOpen(false);
      // After login, fall through to whichever step is appropriate now.
      if (status === 'active') {
        doRsvp();
      } else {
        setJoinOpen(true);
      }
    } else if (wantsRsvpAfterJoin.current && status === 'active') {
      wantsRsvpAfterJoin.current = false;
      setJoinOpen(false);
      doRsvp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, status]);

  function doRsvp() {
    startTransition(async () => {
      if (goingHint) {
        const r = await cancelRsvpAction(slug, eventId);
        if (r.ok) {
          setGoingHint(false);
          router.refresh();
        } else {
          alert(r.error);
        }
      } else {
        const r = await rsvpAction(slug, eventId);
        if (r.ok) {
          setGoingHint(true);
          router.refresh();
        } else if (r.status === 403) {
          // Edge case: membership got revoked between page load and click.
          alert('Only active club members can RSVP.');
          router.refresh();
        } else if (r.status === 409) {
          alert('This event is already full.');
        } else {
          alert(r.error);
        }
      }
    });
  }

  function handleClick() {
    const intent = intentFor(isAuthed, status);
    if (intent === 'login-then-rsvp') {
      wantsRsvpAfterLogin.current = true;
      setLoginOpen(true);
    } else if (intent === 'join-then-rsvp') {
      wantsRsvpAfterJoin.current = true;
      setJoinOpen(true);
    } else {
      doRsvp();
    }
  }

  // Label rules:
  //   anon                                    → "RSVP"        (click → login modal)
  //   authed + active + going                 → "Going ✓"     (click → cancel)
  //   authed + active + not going             → "RSVP"        (click → toggle on)
  //   authed + pending                        → "RSVP"        (disabled — waiting on admin)
  //   authed + none / removed / rejected      → "Join club to RSVP"
  const isPending = isAuthed && status === 'pending';
  const label = !isAuthed
    ? 'RSVP'
    : status === 'active'
      ? goingHint
        ? 'Going ✓'
        : 'RSVP'
      : isPending
        ? 'RSVP'
        : 'Join club to RSVP';
  const busyLabel = goingHint ? 'Cancelling…' : 'Saving…';
  const className =
    variant === 'primary' ? 'btn btn-primary' : 'btn btn-ghost';

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={handleClick}
        disabled={pending || isPending}
        title={isPending ? 'Awaiting club admin approval' : undefined}
      >
        {pending ? busyLabel : label}
      </button>

      <LoginModal
        open={loginOpen || finalizing}
        onClose={() => {
          if (finalizing) return;
          wantsRsvpAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onSuccess={() => {
          setFinalizing(true);
          router.refresh();
        }}
        finalizing={finalizing}
        title={
          <>
            Sign in to <span className="v1lm-red">RSVP.</span>
          </>
        }
        subtitle={`One tap to RSVP for ${clubName}.`}
      />

      <JoinClubFormModal
        open={joinOpen}
        onClose={() => {
          wantsRsvpAfterJoin.current = false;
          setJoinOpen(false);
        }}
        slug={slug}
        clubName={clubName}
        fields={joinForm ?? []}
        autoJoin={!requiresApproval}
        onSuccess={() => {
          // We hold joinOpen open until the props update flips status to
          // active (auto-join) — that triggers the effect above and resumes
          // the RSVP call. For approval-gated joins, status flips to
          // 'pending' and the effect won't fire; close the modal so they see
          // the page-level pending state.
          if (requiresApproval) {
            wantsRsvpAfterJoin.current = false;
            setJoinOpen(false);
          }
          router.refresh();
        }}
      />
    </>
  );
}
