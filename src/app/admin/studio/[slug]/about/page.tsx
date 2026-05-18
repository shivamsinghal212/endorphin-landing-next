import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { AboutEditor } from './_about-editor';

export default async function StudioAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <AboutEditor slug={club.slug} initialClub={club} />;
}
