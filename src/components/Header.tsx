import { getCanAccessStudio, getSessionToken } from '@/lib/session';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const token = await getSessionToken();
  const isAuthed = !!token;
  const canAccessStudio = isAuthed ? await getCanAccessStudio() : false;
  return <HeaderClient isAuthed={isAuthed} canAccessStudio={canAccessStudio} />;
}
