import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { JoinFormEditor } from './_join-form-editor';

export default async function StudioJoinFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <JoinFormEditor slug={club.slug} initialClub={club} />;
}
