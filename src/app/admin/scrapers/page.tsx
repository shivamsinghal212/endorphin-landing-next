import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardContent } from '../components/dashboard-content';

export default async function AdminScrapers() {
  const session = await auth();
  if (!session) redirect('/admin/login');

  // Scraper controls are on the dashboard — redirect there
  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-2">Scrapers</h1>
      <p className="font-body text-sm text-jet/50 mb-6">Scraper controls and event source stats.</p>
      <DashboardContent />
    </div>
  );
}
