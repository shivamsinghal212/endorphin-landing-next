import type { Metadata } from 'next';
import { ProgramContent } from './_program-content';

export const metadata: Metadata = { title: 'Plan · Coach' };

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  return <ProgramContent programId={Number(programId)} />;
}
