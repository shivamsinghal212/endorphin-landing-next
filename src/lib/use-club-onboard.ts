'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { submitClubOnboardAction } from '@/app/actions/clubs';

/** Strip the things people actually paste — a full profile URL, a leading
 *  @, trailing slashes — down to a bare handle. The backend normalizes
 *  again; this exists so the submit button can gate on "is there a handle". */
export function cleanHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')
    .replace(/^@/, '');
}

/**
 * The "List your club" lead capture, shared by every surface that renders
 * the Instagram-handle form (homepage band, /clubs banner, studio empty
 * state). The submission is auth-gated — the backend stores the submitter's
 * user id so we can reach out — so a signed-out visitor gets the login modal
 * and their handle is submitted for them once they're in.
 */
export function useClubOnboard(source: string) {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const cleaned = cleanHandle(handle);

  async function send(value: string) {
    setSubmitting(true);
    setError(null);
    const r = await submitClubOnboardAction(value);
    setSubmitting(false);
    if (r.ok) {
      // Captured here, not on click: a submit that bounces to the login
      // modal and gets abandoned isn't a lead we ever received.
      try {
        posthog.capture('club_onboard_request', {
          instagram_handle: value,
          source,
        });
      } catch {
        // Analytics is never allowed to break the form.
      }
      setSubmitted(true);
      return;
    }
    if (r.status === 401) {
      setLoginOpen(true);
      return;
    }
    setError(r.error);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cleaned || submitting) return;
    await send(cleaned);
  }

  /** Login modal finished: finish the submission they already started, and
   *  refresh so the server-rendered header picks up the new session. */
  function onLoginSuccess() {
    setLoginOpen(false);
    router.refresh();
    void send(cleaned);
  }

  return {
    handle,
    setHandle,
    cleaned,
    submitted,
    submitting,
    error,
    loginOpen,
    closeLogin: () => setLoginOpen(false),
    onLoginSuccess,
    onSubmit,
  };
}
