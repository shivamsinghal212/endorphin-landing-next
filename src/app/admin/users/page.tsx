import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UsersTable } from './users-table';

export default async function AdminUsers() {
  const session = await auth();
  if (!session) redirect('/admin/login');
  return <UsersTable />;
}
