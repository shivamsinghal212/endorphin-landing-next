import { getSessionToken } from '@/lib/session';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const token = await getSessionToken();
  const isAuthed = !!token;
  return <HeaderClient isAuthed={isAuthed} />;
}
