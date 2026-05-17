'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { JoinClubModal } from './join-club-modal';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const status = myMembership?.status ?? 'none';
  const isOwner = myMembership?.role === 'owner';

  function handleLeave() {
    if (!confirm(`Leave ${clubName}?`)) return;
    startTransition(async () => {
      const r = await leaveClubAction(slug);
      if (r.ok) {
        posthog.capture('club_left', {
          club_slug: slug,
          club_name: clubName,
        });
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  function handleCancelRequest() {
    if (!confirm('Withdraw your join request?')) return;
    startTransition(async () => {
      const r = await cancelJoinRequestAction(slug);
      if (r.ok) {
        posthog.capture('club_join_request_cancelled', {
          club_slug: slug,
          club_name: clubName,
        });
        router.refresh();
      } else {
        alert(r.error);
      }
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
      <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
        Join club
      </button>
      <JoinClubModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        slug={slug}
        clubName={clubName}
        joinForm={joinForm}
        requiresApproval={requiresApproval}
        isAuthed={isAuthed}
      />
    </>
  );
}
