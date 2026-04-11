import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NotificationsContent } from './notifications-content';

export default async function AdminNotifications() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <NotificationsContent />;
}
