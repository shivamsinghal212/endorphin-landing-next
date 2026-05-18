import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ScrapersContent } from './scrapers-content';

export default async function AdminScrapers() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <ScrapersContent />;
}
