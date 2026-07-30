import type { Metadata } from 'next';
import { NewPlanContent } from './_new-plan-content';

export const metadata: Metadata = { title: 'New plan · Coach' };

export default function NewPlanPage() {
  return <NewPlanContent />;
}
