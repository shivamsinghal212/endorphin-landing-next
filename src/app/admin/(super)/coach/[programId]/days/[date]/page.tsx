import type { Metadata } from 'next';
import { DayEditorContent } from './_day-editor-content';

export const metadata: Metadata = { title: 'Day · Coach' };

export default async function DayPage({
  params,
}: {
  params: Promise<{ programId: string; date: string }>;
}) {
  const { programId, date } = await params;
  return <DayEditorContent programId={Number(programId)} date={date} />;
}
