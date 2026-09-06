'use server';

import {
  ApiError,
  clubsApi,
  type ClaimClubResponse,
  type JoinClubResponse,
  type RsvpToggleResponse,
} from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { getRealStudioAuth } from '@/lib/studio/server-auth';

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
  instagramId?: string | null,
): Promise<ClubActionState<JoinClubResponse>> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    const data = await clubsApi.joinClub(slug, formData, token, instagramId);
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export async function claimClubAction(
  slug: string,
): Promise<ClubActionState<ClaimClubResponse>> {
  const token = await requireToken();
  if (!token) return { ok: false, error: 'Not signed in', status: 401 };
  try {
    const data = await clubsApi.claimClub(slug, token);
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

/** "List your club" lead capture. Auth-gated: the backend now requires a
 *  signed-in user so every request has someone we can reach out to.
 *
 *  Resolves the session the same way the studio does — the marketing cookie
 *  first, then a NextAuth Google sign-in — so someone holding only the latter
 *  isn't told to sign in again by a form the header says they're signed into.
 */
export async function submitClubOnboardAction(
  instagramHandle: string,
): Promise<ClubActionState<{ id: string }>> {
  const auth = await getRealStudioAuth();
  if (!auth) return { ok: false, error: 'Sign in to list your club', status: 401 };
  try {
    const data = await clubsApi.submitOnboardRequest(instagramHandle, auth.token);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return toError(e);
  }
}
