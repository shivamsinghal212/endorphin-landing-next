'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'saving' | 'saved' | 'error' | 'offline';

export type UseAutosaveOptions = {
  /** Quiet period before a save fires, ms. Default 1500. */
  debounceMs?: number;
  /**
   * If provided, every value change is mirrored to `localStorage` under this
   * key so callers can offer the user a "restore your unsaved draft" prompt
   * after a crash or refresh. The hook never auto-restores — the caller
   * decides via `restoreFromLocal()`.
   */
  localStorageKey?: string;
};

export type UseAutosaveResult<T> = {
  status: AutosaveStatus;
  lastSavedAt?: Date;
  /**
   * Flush any pending debounced save now. Returns `true` on success and
   * `false` on failure — callers (Save & exit, Retry) use this to decide
   * whether to navigate away or keep the user on the page.
   */
  forceSave: () => Promise<boolean>;
  /** Read the locally cached value, if any. Returns null when nothing is stored or parsing fails. */
  restoreFromLocal: () => T | null;
  /** Drop the locally cached value (call after a successful server save or explicit discard). */
  clearLocal: () => void;
};

const isBrowser = typeof window !== 'undefined';

// Backoff schedule for autosave failures — module-scope constant so the
// runSave callback's identity stays stable.
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const;

/**
 * Callers can throw `new Error(NOT_READY_MARKER)` from their save function
 * to signal "skip this save without surfacing failure" — useful while the
 * user hasn't filled in the minimum required fields yet. The hook leaves
 * status untouched and preserves the localStorage backup.
 */
export const NOT_READY_MARKER = 'NOT_READY';

function readLocal<T>(key: string | undefined): T | null {
  if (!isBrowser || !key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string | undefined, value: T) {
  if (!isBrowser || !key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or serialization failures are non-fatal — the network save is the
    // source of truth, the local cache is just a safety net.
  }
}

function removeLocal(key: string | undefined) {
  if (!isBrowser || !key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * Debounced autosave wired to a server `save(value)` call and an optional
 * local-storage mirror. Status transitions: idle → saving → saved | error,
 * with `offline` taking precedence whenever the browser reports no network.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  options: UseAutosaveOptions = {},
): UseAutosaveResult<T> {
  const { debounceMs = 1500, localStorageKey } = options;

  const [status, setStatus] = useState<AutosaveStatus>(() =>
    isBrowser && !navigator.onLine ? 'offline' : 'saved',
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();

  // Stash the latest save fn and value in refs so debounced timers always
  // operate on the freshest closure without scheduling extra effects.
  const saveRef = useRef(save);
  const valueRef = useRef(value);
  const isMountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  // Real silent retries on transient save failures (see RETRY_DELAYS_MS above).
  // After the schedule is exhausted we wait for the user to edit again or
  // click Retry — that matches the honest pill copy.
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Online/offline awareness — flips `offline` regardless of debounce state,
  // and reverts to `saved` once the network is back (a fresh edit will move
  // it to `saving` shortly after, which is the desired UX).
  useEffect(() => {
    if (!isBrowser) return;
    const onOnline = () =>
      setStatus((s) => (s === 'offline' ? 'saved' : s));
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const runSave = useCallback(async (): Promise<boolean> => {
    // Coalesce concurrent saves — if one is in flight, wait for it and let
    // the trailing change schedule the next round naturally.
    if (inFlightRef.current) {
      try {
        await inFlightRef.current;
      } catch {
        /* prior error already surfaced */
      }
    }
    if (isBrowser && !navigator.onLine) {
      setStatus('offline');
      return false;
    }
    setStatus('saving');
    const snapshot = valueRef.current;
    const promise = (async (): Promise<boolean> => {
      try {
        await saveRef.current(snapshot);
        setStatus('saved');
        setLastSavedAt(new Date());
        removeLocal(localStorageKey);
        // Clear any pending retry — a healthy save resets the schedule.
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        retryAttemptRef.current = 0;
        return true;
      } catch (err) {
        // "Not ready yet" — caller signalled the save should be silently
        // skipped. Don't transition status, don't schedule retries, don't
        // touch localStorage. Returning false makes Continue / Save & exit
        // refuse to navigate, which is the correct behaviour: the form
        // isn't ready to persist.
        if (err instanceof Error && err.message === NOT_READY_MARKER) {
          return false;
        }
        setStatus('error');
        // Schedule a real background retry. Earlier this said "retrying" in
        // the UI without actually retrying — now it does.
        const attempt = retryAttemptRef.current;
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          retryAttemptRef.current = attempt + 1;
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            void runSave();
          }, delay);
        }
        // After the last delay we stop and wait for an edit (which restarts
        // the debounce) or an explicit forceSave() / Retry click.
        return false;
      }
    })();
    inFlightRef.current = promise;
    try {
      return await promise;
    } finally {
      if (inFlightRef.current === promise) inFlightRef.current = null;
    }
  }, [localStorageKey]);

  // Debounced trigger — runs on every value change AFTER the first render so
  // we don't autosave the freshly-hydrated initial value back to the server.
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    writeLocal(localStorageKey, value);
    if (timerRef.current) clearTimeout(timerRef.current);
    // A fresh edit cancels any pending backoff and starts the retry counter
    // over — otherwise typing on a stuck event keeps the old backoff curve.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    timerRef.current = setTimeout(() => {
      void runSave();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We deliberately omit `runSave` and `debounceMs` from deps — they're
    // stable for the lifetime of the hook (runSave reads refs, debounceMs is
    // a primitive option set once). Adding them would reset the timer on
    // every render that recreated the save callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, localStorageKey]);

  const forceSave = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // A manual Retry / Save & exit also resets the backoff counter so a
    // success here unblocks the schedule and a failure starts fresh from
    // attempt 0.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    return runSave();
  }, [runSave]);

  // Clean up any pending retry on unmount so we don't fire a save against
  // a stale closure after the wizard route has gone.
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const restoreFromLocal = useCallback(
    () => readLocal<T>(localStorageKey),
    [localStorageKey],
  );

  const clearLocal = useCallback(
    () => removeLocal(localStorageKey),
    [localStorageKey],
  );

  return { status, lastSavedAt, forceSave, restoreFromLocal, clearLocal };
}
