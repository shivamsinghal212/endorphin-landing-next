'use client';

import { useEffect, useState } from 'react';
import type { AutosaveStatus } from './useAutosave';

export type { AutosaveStatus } from './useAutosave';

export type AutosaveIndicatorProps = {
  status: AutosaveStatus;
  lastSavedAt?: Date;
  /** Called when the user clicks the inline Retry button (error state only). */
  onRetry?: () => void;
  className?: string;
};

/**
 * "Saved · 4s ago" status pill. The relative time re-renders every 15 s so
 * it stays accurate without spamming work. On error we surface a Retry
 * button instead of lying about "retrying" — the underlying hook does its
 * own background retries with backoff; this button is for after the
 * schedule is exhausted.
 */
export function AutosaveIndicator({
  status,
  lastSavedAt,
  onRetry,
  className = '',
}: AutosaveIndicatorProps) {
  // tick is just a re-render trigger; we read `lastSavedAt` fresh each time.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status !== 'saved' || !lastSavedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, [status, lastSavedAt]);

  const { dotClass, label } = describe(status, lastSavedAt);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] text-jet/55 px-2 py-1 rounded-md bg-jet/[0.04] ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden />
      {label}
      {status === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 underline text-jet/70 hover:text-jet"
        >
          Retry
        </button>
      )}
    </span>
  );
}

function describe(
  status: AutosaveStatus,
  lastSavedAt: Date | undefined,
): { dotClass: string; label: string } {
  switch (status) {
    case 'saving':
      return { dotClass: 'bg-amber-500 pulse-soft', label: 'Saving…' };
    case 'error':
      // Honest copy — the hook retries on a backoff but the schedule is
      // finite. We can't tell from status alone whether a timer is pending
      // or we've given up, so we phrase it neutrally and always offer the
      // Retry button as a manual override.
      return {
        dotClass: 'bg-signal',
        label: 'Couldn’t save · changes kept locally',
      };
    case 'offline':
      return { dotClass: 'bg-jet/30', label: 'Offline · changes kept locally' };
    case 'saved':
    default:
      return {
        dotClass: 'bg-emerald-500 pulse-soft',
        label: lastSavedAt
          ? `Saved · ${formatRelative(lastSavedAt)}`
          : 'Saved',
      };
  }
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.round(diffMs / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
