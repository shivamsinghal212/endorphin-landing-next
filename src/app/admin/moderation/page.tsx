import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ModerationContent } from './moderation-content';

export default async function AdminModeration() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <ModerationContent />;
}
