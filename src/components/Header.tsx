import { getSessionToken } from '@/lib/session';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const token = await getSessionToken();
  return <HeaderClient isAuthed={!!token} />;
}
