'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import LoginModal from '@/components/LoginModal';
import { claimClubAction } from '@/app/actions/clubs';

interface ClaimClubLinkProps {
  slug: string;
  clubName: string;
  isAuthed: boolean;
  userEmail: string | null;
}

export function ClaimClubLink({
  slug,
  clubName,
  isAuthed,
  userEmail,
}: ClaimClubLinkProps) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const wantsClaimAfterLogin = useRef(false);

  useEffect(() => {
    if (isAuthed && wantsClaimAfterLogin.current) {
      wantsClaimAfterLogin.current = false;
      setFinalizing(false);
      setLoginOpen(false);
      setConfirmOpen(true);
    }
  }, [isAuthed]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthed) {
      wantsClaimAfterLogin.current = true;
      setLoginOpen(true);
      return;
    }
    setSubmitError(null);
    setSubmitted(false);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    setSubmitError(null);
    startTransition(async () => {
      const r = await claimClubAction(slug);
      if (r.ok) {
        posthog.capture('club_claim_submitted', {
          club_slug: slug,
          club_name: clubName,
        });
        setSubmitted(true);
        router.refresh();
      } else {
        setSubmitError(r.error);
      }
    });
  }

  function handleClose() {
    if (pending) return;
    setConfirmOpen(false);
    setSubmitError(null);
    setSubmitted(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="claim-club-link"
      >
        Run this club? Claim ownership →
      </button>

      <LoginModal
        open={loginOpen || finalizing}
        onClose={() => {
          if (finalizing) return;
          wantsClaimAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onSuccess={() => {
          setFinalizing(true);
          router.refresh();
        }}
        finalizing={finalizing}
        title={
          <>
            Sign in to <span className="v1lm-red">claim.</span>
          </>
        }
        subtitle={`One tap to claim ${clubName}.`}
      />

      <Dialog.Root
        open={confirmOpen}
        onOpenChange={(o) => !o && handleClose()}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="v1lm-overlay" />
          <Dialog.Content
            className="v1lm-modal"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            <Dialog.Title className="sr-only">Claim {clubName}</Dialog.Title>

            <button
              type="button"
              className="v1lm-close"
              aria-label="Close"
              onClick={handleClose}
              disabled={pending}
            >
              <CloseIcon />
            </button>

            <div className="v1lm-body">
              <div className="v1lm-form">
                <span className="text-[10px] font-semibold tracking-[0.18em] text-[#5C544A] uppercase mb-1">
                  Claim
                </span>
                <h2 className="v1lm-h2">
                  {clubName}
                  <span className="v1lm-red">.</span>
                </h2>

                {submitted ? (
                  <>
                    <p className="v1lm-sub">
                      Claim submitted — we&rsquo;ll reply within 48 hours.
                    </p>
                    <button
                      type="button"
                      className="v1lm-btn-primary mt-5"
                      onClick={handleClose}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <p className="v1lm-sub">
                      Claim <strong>{clubName}</strong>
                      {userEmail ? (
                        <>
                          {' '}as <strong>{userEmail}</strong>
                        </>
                      ) : null}
                      ? We&rsquo;ll review your request and follow up by email.
                    </p>

                    {submitError && (
                      <div className="v1lm-feedback is-error mt-3" role="alert">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="button"
                      className="v1lm-btn-primary mt-5"
                      onClick={handleConfirm}
                      disabled={pending}
                    >
                      {pending ? 'Submitting…' : 'Confirm claim'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function CloseIcon() {
  return (
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
  );
}
