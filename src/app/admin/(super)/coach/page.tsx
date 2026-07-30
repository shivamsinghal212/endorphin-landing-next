import type { Metadata } from 'next';
import { PlansContent } from './_plans-content';

export const metadata: Metadata = { title: 'Coach · Endorfin Admin' };

export default function CoachPage() {
  return <PlansContent />;
}
