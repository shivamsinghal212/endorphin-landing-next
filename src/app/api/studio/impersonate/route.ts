import { NextResponse } from 'next/server';
import { getRealStudioAuth } from '@/lib/studio/server-auth';
import {
  clearImpersonationCookie,
  setImpersonationCookie,
} from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

/** Start "view as user": super-admin only. Exchanges the target user id for a
 *  token minted as that user and stashes it in an httpOnly cookie. */
export async function POST(request: Request) {
  const real = await getRealStudioAuth();
  if (!real?.isSuperAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let userId: unknown;
  try {
    ({ userId } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
  }

  const res = await fetch(
    `${API_BASE}/api/v1/admin/impersonate/${encodeURIComponent(userId)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${real.token}` } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return NextResponse.json(
      { ok: false, error: `mint failed: ${res.status} ${body}` },
      { status: 502 },
    );
  }
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) {
    return NextResponse.json({ ok: false, error: 'no token' }, { status: 502 });
  }

  await setImpersonationCookie(data.accessToken);
  return NextResponse.json({ ok: true });
}

/** Stop impersonating — clears the cookie. Any signed-in user may call it. */
export async function DELETE() {
  await clearImpersonationCookie();
  return NextResponse.json({ ok: true });
}
