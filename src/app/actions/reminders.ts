'use server';

import {
  ApiError,
  remindersApi,
  type Reminder,
  type ReminderEventType,
} from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export type ReminderActionState =
  | { ok: true; data: Reminder; alreadySet?: boolean }
  | { ok: false; error: string; status?: number };

export async function setReminderAction(
  eventType: ReminderEventType,
  eventId: string,
): Promise<ReminderActionState> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    const data = await remindersApi.create(eventType, eventId, token);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ApiError) {
      // 409 = already set. The backend returns just `{detail: "..."}` (no
      // existing record), so we surface it as an error the client can treat
      // as "already on" without re-rendering loudly.
      return {
        ok: false,
        error: e.message || 'Could not set reminder',
        status: e.status,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unexpected error',
    };
  }
}
