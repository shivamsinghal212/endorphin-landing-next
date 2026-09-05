import { claimsFromToken, getSessionToken } from '@/lib/session';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const token = await getSessionToken();
  // Decode the JWT locally for the account menu's initial. Deliberately not
  // `getStudioAuth()` — that can hit /users/me, and this header renders on
  // every public page.
  const claims = token ? claimsFromToken(token) : null;
  const userName =
    (claims?.name as string | undefined) ||
    (claims?.email as string | undefined) ||
    null;
  return <HeaderClient isAuthed={!!token} userName={userName} />;
}
