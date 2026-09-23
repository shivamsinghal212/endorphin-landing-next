'use server';

import { API_BASE } from '@/lib/api';
import { getRealStudioAuth } from '@/lib/studio/server-auth';
import type { TalkComment } from '@/lib/talk';

// Resolved through getRealStudioAuth rather than the cookie alone, so Google
// (NextAuth) sign-ins can high-five and comment too.
async function token(): Promise<string | null> {
  return (await getRealStudioAuth())?.token ?? null;
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<Result<T>> {
  const t = auth ? await token() : null;
  if (auth && !t) return { ok: false, status: 401, error: 'Sign in first' };
  try {
    const res = await fetch(`${API_BASE}/api/v1/talk${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = typeof body?.detail === 'string' ? body.detail : 'Something went wrong';
      return { ok: false, status: res.status, error: detail };
    }
    return { ok: true, data: (res.status === 204 ? undefined : await res.json()) as T };
  } catch {
    return { ok: false, status: 0, error: 'Could not reach Endorfin. Try again.' };
  }
}

export interface TalkViewer {
  userId: string | null;
  highFived: boolean;
  isAdmin: boolean;
}

/** Who's reading, and have they high-fived. Never throws: signed-out is a
 *  normal answer. Also returns the live notes so the island has one round trip. */
export async function loadTalkState(slug: string): Promise<{ viewer: TalkViewer; comments: TalkComment[] }> {
  const s = encodeURIComponent(slug);
  const auth = await getRealStudioAuth();
  const [me, comments] = await Promise.all([
    auth ? call<{ userId: string; highFived: boolean }>(`/posts/${s}/me`) : null,
    call<TalkComment[]>(`/posts/${s}/comments`, {}, false),
  ]);
  return {
    viewer: {
      userId: me?.ok ? me.data.userId : null,
      highFived: me?.ok ? me.data.highFived : false,
      isAdmin: Boolean(auth?.isSuperAdmin),
    },
    comments: comments.ok ? comments.data : [],
  };
}

export async function setHighFive(slug: string, on: boolean) {
  return call<{ highFived: boolean; highFives: number }>(
    `/posts/${encodeURIComponent(slug)}/high-five`,
    { method: on ? 'PUT' : 'DELETE' },
  );
}

export async function addNote(
  slug: string,
  input: { body: string; runnerContext?: string | null; parentId?: string | null },
) {
  return call<TalkComment>(`/posts/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteNote(id: string) {
  return call<void>(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
