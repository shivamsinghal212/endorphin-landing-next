import {
  claimsFromToken,
  getSessionToken,
  hasNextAuthCookie,
  isJwtExpired,
} from '@/lib/session';
import { auth } from '@/lib/auth';
import HeaderClient from './HeaderClient';

/** Whether this visitor is signed in, resolved the same way the rest of the
 *  app resolves it (`getRealStudioAuth`): the marketing cookie first, then
 *  NextAuth's stored backend token.
 *
 *  The header used to read the cookie alone. Anyone holding only a NextAuth
 *  session — a Google sign-in through /admin — got a signed-out header while
 *  every token-reading surface treated them as signed in, so /create showed
 *  the host picker to someone the nav was offering "Sign in" to. Expired
 *  tokens counted as signed in too.
 *
 *  Deliberately not `getStudioAuth()`: that can hit /users/me, and this
 *  renders on every public page. Both reads here are local — a cookie and a
 *  JWT decode — and `auth()` is skipped entirely unless its cookie is
 *  actually there, which is also what keeps it out of static prerenders.
 */
async function resolveSessionToken(): Promise<string | null> {
  const cookieToken = await getSessionToken();
  if (cookieToken && !isJwtExpired(cookieToken)) return cookieToken;

  if (!(await hasNextAuthCookie())) return null;
  try {
    const session = await auth();
    const backendToken =
      (session as unknown as { backendToken?: string } | null)?.backendToken ??
      null;
    if (backendToken && !isJwtExpired(backendToken)) return backendToken;
  } catch {
    // No request context (static render) — the cookie is the only answer.
  }
  return null;
}

export default async function Header() {
  const token = await resolveSessionToken();
  // Decode the JWT locally for the account menu's initial.
  const claims = token ? claimsFromToken(token) : null;
  const userName =
    (claims?.name as string | undefined) ||
    (claims?.email as string | undefined) ||
    null;
  return <HeaderClient isAuthed={!!token} userName={userName} />;
}
