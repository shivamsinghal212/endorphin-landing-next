'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import JoinClubFormModal from './join-club-form-modal';
import type { JoinFormField } from '@/lib/admin-api';

interface JoinClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  clubName: string;
  joinForm: JoinFormField[] | null;
  requiresApproval: boolean;
  isAuthed: boolean;
}

export function JoinClubModal({
  isOpen,
  onClose,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
}: JoinClubModalProps) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  // Set after the backend confirms the join — drives the confirmation modal.
  const [successStatus, setSuccessStatus] = useState<'pending' | 'active' | null>(null);
  const wantsJoinAfterLogin = useRef(false);
  const fields = joinForm ?? [];

  useEffect(() => {
    if (!isOpen) {
      setLoginOpen(false);
      setFinalizing(false);
      setSuccessStatus(null);
      wantsJoinAfterLogin.current = false;
      return;
    }
    if (!isAuthed) {
      wantsJoinAfterLogin.current = true;
      setLoginOpen(true);
    }
  }, [isOpen, isAuthed]);

  useEffect(() => {
    if (isAuthed && wantsJoinAfterLogin.current) {
      wantsJoinAfterLogin.current = false;
      setFinalizing(false);
      setLoginOpen(false);
    }
  }, [isAuthed]);

  return (
    <>
      <LoginModal
        open={isOpen && (loginOpen || finalizing)}
        onClose={() => {
          if (finalizing) return;
          wantsJoinAfterLogin.current = false;
          setLoginOpen(false);
          onClose();
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
        open={isOpen && isAuthed && !loginOpen && !finalizing && !successStatus}
        onClose={onClose}
        slug={slug}
        clubName={clubName}
        fields={fields}
        autoJoin={!requiresApproval}
        onSuccess={(status) => {
          // Don't router.refresh() yet — the refreshed membership status would
          // swap JoinClubButton to another branch and unmount this modal tree,
          // killing the confirmation. Refresh when the user dismisses it.
          setSuccessStatus(status);
        }}
      />

      <JoinSuccessModal
        open={isOpen && successStatus !== null}
        status={successStatus ?? 'pending'}
        clubName={clubName}
        onClose={() => {
          onClose();
          router.refresh();
        }}
      />
    </>
  );
}

// Confirmation shown after the backend accepts the join. "pending" means the
// club requires approval, so the request sits with the admins; "active" means
// auto-join and the user is already a member.
function JoinSuccessModal({
  open,
  status,
  clubName,
  onClose,
}: {
  open: boolean;
  status: 'pending' | 'active';
  clubName: string;
  onClose: () => void;
}) {
  const pending = status === 'pending';

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="v1lm-overlay" />
        <Dialog.Content className="v1lm-modal" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">
            {pending ? 'Request sent' : `Welcome to ${clubName}`}
          </Dialog.Title>

          <button
            type="button"
            className="v1lm-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="v1lm-body">
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#5C544A] uppercase mb-1">
              {pending ? 'Request sent' : 'Joined'}
            </span>
            <h2 className="v1lm-h2">
              {pending ? 'You’re almost in' : `Welcome to ${clubName}`}
              <span className="v1lm-red">.</span>
            </h2>
            <p className="v1lm-sub">
              {pending
                ? 'We’ve received your request and notified the club admin. You’ll hear back once they approve it.'
                : `You’re now a member of ${clubName}. See you on the next run.`}
            </p>

            <button type="button" className="v1lm-btn-primary mt-5" onClick={onClose}>
              Got it
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
