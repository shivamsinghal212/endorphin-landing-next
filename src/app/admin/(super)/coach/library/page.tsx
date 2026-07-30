import type { Metadata } from 'next';
import { LibraryContent } from './_library-content';

export const metadata: Metadata = { title: 'Workout library · Coach' };

export default function LibraryPage() {
  return <LibraryContent />;
}
