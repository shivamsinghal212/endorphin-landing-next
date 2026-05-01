'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import JoinClubFormModal from './join-club-form-modal';
import {
  cancelJoinRequestAction,
  leaveClubAction,
} from '@/app/actions/clubs';
import type { JoinFormField } from '@/lib/admin-api';
import type { MyMembership } from '@/lib/api';

interface JoinClubButtonProps {
  slug: string;
  clubName: string;
  joinForm: JoinFormField[] | null;
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}

export function JoinClubButton({
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: JoinClubButtonProps) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pending, startTransition] = useTransition();
  // Tracks whether the user kicked off Join from the unauthed state, so when
  // isAuthed flips after router.refresh() we can auto-open the form.
  const wantsJoinAfterLogin = useRef(false);

  useEffect(() => {
    if (isAuthed && wantsJoinAfterLogin.current) {
      wantsJoinAfterLogin.current = false;
      setFinalizing(false);
      setLoginOpen(false);
      const status = myMembership?.status;
      if (!status || status === 'none' || status === 'removed' || status === 'rejected') {
        setFormOpen(true);
      }
    }
  }, [isAuthed, myMembership]);

  const status = myMembership?.status ?? 'none';
  const isOwner = myMembership?.role === 'owner';
  const fields = joinForm ?? [];

  function handleJoinClick() {
    if (!isAuthed) {
      wantsJoinAfterLogin.current = true;
      setLoginOpen(true);
      return;
    }
    setFormOpen(true);
  }

  function handleLeave() {
    if (!confirm(`Leave ${clubName}?`)) return;
    startTransition(async () => {
      const r = await leaveClubAction(slug);
      if (r.ok) router.refresh();
      else alert(r.error);
    });
  }

  function handleCancelRequest() {
    if (!confirm('Withdraw your join request?')) return;
    startTransition(async () => {
      const r = await cancelJoinRequestAction(slug);
      if (r.ok) router.refresh();
      else alert(r.error);
    });
  }

  // Owner (active+role=owner) — separate copy from "active" so the user knows
  // they can't leave their own club via this button.
  if (isAuthed && status === 'active' && isOwner) {
    return (
      <button className="btn btn-ghost" type="button" disabled>
        You&rsquo;re the owner
      </button>
    );
  }

  if (isAuthed && status === 'active') {
    return (
      <button
        className="btn btn-ghost"
        type="button"
        onClick={handleLeave}
        disabled={pending}
      >
        {pending ? 'Leaving…' : 'Leave club'}
      </button>
    );
  }

  if (isAuthed && status === 'pending') {
    return (
      <button
        className="btn btn-ghost"
        type="button"
        onClick={handleCancelRequest}
        disabled={pending}
      >
        {pending ? 'Withdrawing…' : 'Withdraw request'}
      </button>
    );
  }

  return (
    <>
      <button className="btn btn-primary" type="button" onClick={handleJoinClick}>
        Join club
      </button>

      <LoginModal
        open={loginOpen || finalizing}
        onClose={() => {
          if (finalizing) return;
          wantsJoinAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onSuccess={() => {
          setFinalizing(true);
          router.refresh();
        }}
        finalizing={finalizing}
        title={
          <>
            Sign in to <span className="v1lm-red">join.</span>
          </>
        }
        subtitle={`One tap to join ${clubName}.`}
      />

      <JoinClubFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        slug={slug}
        clubName={clubName}
        fields={fields}
        autoJoin={!requiresApproval}
        onSuccess={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
