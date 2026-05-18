import 'server-only';
import {
  claimsFromToken,
  getSessionToken,
  isJwtExpired,
} from '@/lib/session';
import { auth, isSuperAdminEmail } from '@/lib/auth';

export interface StudioAuth {
  token: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  isSuperAdmin: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

interface MeResponse {
  email?: string | null;
  name?: string | null;
  pictureUrl?: string | null;
}

async function fetchMe(token: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      // Cache per-token for a minute so we don't refetch on every page.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

/** Build StudioAuth from a backend token. Email/name/picture come from
 *  the JWT claims when available, otherwise from /users/me. Returns null
 *  only when the token itself is invalid/expired or /users/me 401s. */
async function authFromToken(token: string): Promise<StudioAuth | null> {
  if (!token || isJwtExpired(token)) return null;

  const claims = claimsFromToken(token);
  let email = (claims?.email as string) || '';
  let name = (claims?.name as string) || '';
  let pictureUrl =
    (claims?.picture as string | undefined) ||
    (claims?.pictureUrl as string | undefined) ||
    null;

  // Some backend-issued JWTs only carry `sub`+`exp`. Fall back to /users/me
  // for human-readable identity. If /users/me 401s the token is dead.
  if (!email) {
    const me = await fetchMe(token);
    if (!me) return null;
    email = me.email ?? '';
    name = name || me.name || '';
    pictureUrl = pictureUrl || me.pictureUrl || null;
  }

  return {
    token,
    email,
    name: name || (email ? email.split('@')[0] : 'You'),
    pictureUrl,
    isSuperAdmin: isSuperAdminEmail(email),
  };
}

/** Resolve the user's studio identity from whichever session is available.
 *  Prefers the marketing-site `endorfin_session` cookie. Falls back to
 *  NextAuth's stored backend token for the super-admin Google flow. */
export async function getStudioAuth(): Promise<StudioAuth | null> {
  const marketingToken = await getSessionToken();
  if (marketingToken) {
    const resolved = await authFromToken(marketingToken);
    if (resolved) return resolved;
  }

  const session = await auth();
  const nextAuthToken =
    (session as unknown as { backendToken?: string } | null)?.backendToken ?? null;
  if (nextAuthToken) {
    const resolved = await authFromToken(nextAuthToken);
    if (resolved) {
      // Prefer NextAuth's name/picture (from Google profile) when available.
      return {
        ...resolved,
        name: session?.user?.name ?? resolved.name,
        pictureUrl: session?.user?.image ?? resolved.pictureUrl,
      };
    }
  }

  return null;
}
