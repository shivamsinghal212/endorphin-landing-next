import 'server-only';
import {
  claimsFromToken,
  getImpersonationToken,
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
  /** Set when a super-admin is viewing the studio as another user. Holds the
   *  real super-admin's identity so the UI can show a banner + exit. */
  impersonatedBy?: { name: string; email: string } | null;
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
 *  NextAuth's stored backend token for the super-admin Google flow.
 *
 *  `allowImpersonation` is opt-in and scoped to the studio surface only — the
 *  public runner pages (event detail, register, my-registrations) must always
 *  resolve the real signed-in user, or a super-admin who's "viewing as" someone
 *  would see that user's registration state on the public site too. */
export async function getStudioAuth(
  { allowImpersonation = false }: { allowImpersonation?: boolean } = {},
): Promise<StudioAuth | null> {
  const real = await getRealStudioAuth();
  if (!real) return null;

  // Super-admin "view as user": swap in the impersonation token so the whole
  // studio (clubs + organiser) renders from the target's POV. Ignored unless
  // the caller opted in, the real caller is a super-admin, and the token is
  // still valid.
  if (allowImpersonation && real.isSuperAdmin) {
    const impToken = await getImpersonationToken();
    if (impToken && !isJwtExpired(impToken)) {
      const asUser = await authFromToken(impToken);
      if (asUser) {
        return {
          ...asUser,
          // While impersonating you are NOT a super-admin — that's the point.
          isSuperAdmin: false,
          impersonatedBy: { name: real.name, email: real.email },
        };
      }
    }
  }

  return real;
}

/** The signed-in user's own studio identity, before any impersonation.
 *  Used by the impersonation route, which must act with the real token. */
export async function getRealStudioAuth(): Promise<StudioAuth | null> {
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
