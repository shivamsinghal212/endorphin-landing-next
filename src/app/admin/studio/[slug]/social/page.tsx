import { notFound } from 'next/navigation';
import { getClub } from '@/lib/admin-api';
import { SocialEditor } from './_social-editor';

export default async function StudioSocialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (!club) notFound();
  return <SocialEditor slug={club.slug} initialClub={club} />;
}
