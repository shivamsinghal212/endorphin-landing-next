'use server';

import {
  ApiError,
  kipWaitlistApi,
  type WaitlistJoinResponse,
  type WaitlistMe,
  type WaitlistStats,
} from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export type StatsResult =
  | { ok: true; stats: WaitlistStats }
  | { ok: false; error: string };

export type MeResult =
  | { ok: true; me: WaitlistMe }
  | { ok: false; error: string; code?: 'UNAUTHENTICATED' };

export type JoinResult =
  | { ok: true; result: WaitlistJoinResponse }
  | { ok: false; error: string; code?: 'UNAUTHENTICATED' | 'WAITLIST_FULL' };

export async function getKipWaitlistStatsAction(): Promise<StatsResult> {
  try {
    const stats = await kipWaitlistApi.getStats();
    return { ok: true, stats };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not load stats' };
  }
}

export async function getKipWaitlistMeAction(): Promise<MeResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: 'Not signed in', code: 'UNAUTHENTICATED' };
  try {
    const me = await kipWaitlistApi.getMe(token);
    return { ok: true, me };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return { ok: false, error: 'Not signed in', code: 'UNAUTHENTICATED' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Could not load status' };
  }
}

export async function joinKipWaitlistAction(): Promise<JoinResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: 'Sign in to claim a spot', code: 'UNAUTHENTICATED' };
  try {
    const result = await kipWaitlistApi.join(token);
    return { ok: true, result };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        return { ok: false, error: 'Sign in to claim a spot', code: 'UNAUTHENTICATED' };
      }
      const detail = e.detail;
      if (
        e.status === 409 &&
        detail &&
        typeof detail === 'object' &&
        'code' in detail &&
        (detail as { code?: unknown }).code === 'WAITLIST_FULL'
      ) {
        return {
          ok: false,
          error: 'Founding 100 is closed.',
          code: 'WAITLIST_FULL',
        };
      }
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Could not join' };
  }
}
