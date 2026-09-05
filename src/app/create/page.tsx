import type { Metadata } from 'next';
import { EventComposer } from './_composer';

export const metadata: Metadata = {
  title: 'Create an event | Endorfin',
  description:
    'Put your run on Endorfin — free or ticketed, hosted by you or your run club. Takes a name and a start time.',
  // A composer is not a landing page; keep it out of the index but let the
  // links on it be followed.
  robots: { index: false, follow: true },
};

export default function CreateEventPage() {
  return <EventComposer />;
}
