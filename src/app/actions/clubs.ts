'use server';

import {
  ApiError,
  clubsApi,
  type JoinClubResponse,
  type RsvpToggleResponse,
} from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export type ClubActionState<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; status?: number; code?: string };

function toError(e: unknown): ClubActionState {
  if (e instanceof ApiError) {
    const detail = e.detail;
    let code: string | undefined;
    if (detail && typeof detail === 'object' && 'code' in detail) {
      code = String((detail as { code: unknown }).code);
    }
    return {
      ok: false,
      error: e.message || 'Request failed',
      status: e.status,
      code,
    };
  }
  return {
    ok: false,
    error: e instanceof Error ? e.message : 'Unexpected error',
  };
}

async function requireToken(): Promise<string | null> {
  return await getSessionToken();
}

export async function joinClubAction(
  slug: string,
  formData: Record<string, unknown> | null,
): Promise<ClubActionState<JoinClubResponse>> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    const data = await clubsApi.joinClub(slug, formData, token);
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export async function leaveClubAction(
  slug: string,
): Promise<ClubActionState> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    await clubsApi.leaveClub(slug, token);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function cancelJoinRequestAction(
  slug: string,
): Promise<ClubActionState> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    await clubsApi.cancelJoinRequest(slug, token);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function rsvpAction(
  slug: string,
  eventId: string,
): Promise<ClubActionState<RsvpToggleResponse>> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    const data = await clubsApi.rsvp(slug, eventId, token);
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export async function cancelRsvpAction(
  slug: string,
  eventId: string,
): Promise<ClubActionState> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    await clubsApi.cancelRsvp(slug, eventId, token);
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
