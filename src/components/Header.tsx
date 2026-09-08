import { getSessionToken, hasNextAuthCookie, isJwtExpired } from '@/lib/session';
import { getRealStudioAuth } from '@/lib/studio/server-auth';
import HeaderClient from './HeaderClient';

/**
 * Whether this visitor is signed in, and who they are.
 *
 * Resolved through `getRealStudioAuth()` — the same helper every gated page
 * uses — so the nav and the pages can never disagree. They used to: the
 * header decoded the JWT locally while /me/registrations and the register
 * flow pre-checked the `endorfin_session` cookie alone, so a Google
 * (NextAuth) sign-in got a signed-in header and an immediate bounce to the
 * login modal on click.
 *
 * The local decode also could not name the user: most backend-issued JWTs
 * carry only `sub` + `exp`, so the account menu always read "Signed in".
 * getRealStudioAuth falls back to /users/me for that, which `fetchMe`
 * caches per token for 60s.
 *
 * The cheap guard below is what keeps this off the anonymous path — the
 * overwhelming majority of traffic, and all crawler traffic. With no session
 * cookie of either kind we return immediately, having made no API call.
 */
async function resolveIdentity(): Promise<{ isAuthed: boolean; userName: string | null }> {
  const cookieToken = await getSessionToken();
  if (!cookieToken && !(await hasNextAuthCookie())) {
    return { isAuthed: false, userName: null };
  }

  const auth = await getRealStudioAuth();
  if (auth) {
    // authFromToken already falls back to the email's local part, then 'You',
    // so `name` is non-empty whenever we got this far.
    return { isAuthed: true, userName: auth.name || auth.email || null };
  }

  // getRealStudioAuth also returns null when /users/me is unreachable, not
  // just when the session is bad. Falling straight through to signed-out
  // would sign the whole site out visually during a backend blip, so trust a
  // locally-valid JWT for the nav state and just go without the name.
  if (cookieToken && !isJwtExpired(cookieToken)) {
    return { isAuthed: true, userName: null };
  }
  return { isAuthed: false, userName: null };
}

export default async function Header() {
  const { isAuthed, userName } = await resolveIdentity();
  return <HeaderClient isAuthed={isAuthed} userName={userName} />;
}
