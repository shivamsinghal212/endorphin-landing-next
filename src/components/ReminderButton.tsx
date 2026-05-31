'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import posthog from 'posthog-js';
import LoginModal from '@/components/LoginModal';
import { setReminderAction } from '@/app/actions/reminders';
import type { ReminderEventType } from '@/lib/api';

interface ReminderButtonProps {
  eventType: ReminderEventType;
  eventId: string;
  /** ISO string. Used to disable the bell when the event is < 24h away. */
  eventStartTime: string | null | undefined;
  /** Display string used in posthog + the login modal subtitle. */
  eventTitle: string;
  /** Whether the user already has a reminder set for this event (from SSR). */
  initialIsSet: boolean;
  /** Whether the user is already signed in (avoids opening login modal). */
  isAuthed: boolean;
  /** Visual variant — matches the adjacent CTA's container. */
  variant?: 'default' | 'compact';
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function BellIcon({ filled }: { filled: boolean }) {
  // 16px line-art bell. When `filled`, body is jet-on-jet for the "set" state.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function ReminderButton({
  eventType,
  eventId,
  eventStartTime,
  eventTitle,
  initialIsSet,
  isAuthed,
  variant = 'default',
}: ReminderButtonProps) {
  const [isSet, setIsSet] = useState(initialIsSet);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pending, startTransition] = useTransition();
  const wantsAfterLogin = useRef(false);

  // Sync from SSR prop if the parent re-renders with a fresh reminders list
  // (e.g. after router.refresh post-login). Doesn't override an in-session
  // optimistic update — once a click flips it to set, we trust local state.
  useEffect(() => {
    if (initialIsSet) setIsSet(true);
  }, [initialIsSet]);

  const startsAt = eventStartTime ? new Date(eventStartTime).getTime() : null;
  const startsSoon =
    startsAt != null && !Number.isNaN(startsAt) && startsAt - Date.now() < ONE_DAY_MS;

  function doCreate() {
    setErrorMsg(null);
    startTransition(async () => {
      const r = await setReminderAction(eventType, eventId);
      if (r.ok) {
        posthog.capture('reminder_set', {
          event_type: eventType,
          event_id: eventId,
          event_title: eventTitle,
        });
        setIsSet(true);
      } else if (r.status === 409) {
        // Already set on the backend — reconcile silently.
        setIsSet(true);
      } else if (r.status === 401) {
        // Token expired or missing — re-open login.
        wantsAfterLogin.current = true;
        setLoginOpen(true);
      } else if (r.status === 400) {
        // < 24h away.
        setErrorMsg('Starts soon — set reminders earlier.');
      } else {
        setErrorMsg(r.error || 'Could not set reminder');
      }
    });
  }

  function handleClick() {
    if (isSet || pending || startsSoon) return;
    if (!isAuthed) {
      wantsAfterLogin.current = true;
      setLoginOpen(true);
      return;
    }
    doCreate();
  }

  function handleLoginSuccess() {
    setFinalizing(true);
    // After login, complete the reminder POST in the same gesture. We can
    // call the action immediately — the server action picks up the new
    // session cookie that LoginModal just set.
    setTimeout(() => {
      setFinalizing(false);
      setLoginOpen(false);
      if (wantsAfterLogin.current) {
        wantsAfterLogin.current = false;
        doCreate();
      }
    }, 50);
  }

  const disabled = pending || isSet || startsSoon;
  const label = isSet ? 'Invite emailed' : startsSoon ? 'Starts soon' : 'Remind me';
  const title = isSet
    ? "We've emailed you a calendar invite — the reminder fires the day before at 10:00 AM IST."
    : startsSoon
      ? 'This event is less than a day away — reminders need at least 24 hours.'
      : errorMsg
        ? errorMsg
        : "We'll email you a calendar invite that reminds you the day before";

  // Single button, no wrapping <span>: the previous column wrap broke
  // baseline alignment with the adjacent RSVP/Register button (taller +
  // wider whenever the hint or error appeared). Hint text now rides on
  // the button label itself + the title tooltip.
  return (
    <>
      <button
        type="button"
        className={`v1-remind-btn${variant === 'compact' ? ' is-compact' : ''}${
          isSet ? ' is-set' : ''
        }${startsSoon && !isSet ? ' is-soon' : ''}${errorMsg ? ' is-error' : ''}`}
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={isSet}
        title={title}
      >
        <BellIcon filled={isSet} />
        <span className="v1-remind-label">
          {pending ? 'Saving…' : isSet ? 'Invite emailed ✓' : label}
        </span>
      </button>

      <LoginModal
        open={loginOpen || finalizing}
        onClose={() => {
          if (finalizing) return;
          wantsAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onSuccess={handleLoginSuccess}
        finalizing={finalizing}
        title={
          <>
            Sign in to <span className="v1lm-red">remind you.</span>
          </>
        }
        subtitle={`We'll email you a calendar invite for ${eventTitle}.`}
      />
    </>
  );
}
