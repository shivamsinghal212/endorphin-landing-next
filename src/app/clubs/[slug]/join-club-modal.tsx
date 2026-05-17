'use client';

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
  const wantsJoinAfterLogin = useRef(false);
  const fields = joinForm ?? [];

  useEffect(() => {
    if (!isOpen) {
      setLoginOpen(false);
      setFinalizing(false);
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
        open={isOpen && isAuthed && !loginOpen && !finalizing}
        onClose={onClose}
        slug={slug}
        clubName={clubName}
        fields={fields}
        autoJoin={!requiresApproval}
        onSuccess={() => {
          onClose();
          router.refresh();
        }}
      />
    </>
  );
}
