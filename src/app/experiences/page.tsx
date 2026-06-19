import type { Metadata } from 'next';
import ClubsExperiencesPage from '../clubs/clubs-experiences-page';

// The /experiences index. Same data + layout as /clubs (see
// clubs-experiences-page.tsx) but leads with the club-events rails instead of
// the directory. NOTE: this file owns ONLY the index — /experiences/{slug}
// detail pages are served from the running-events route tree via the rewrite
// in next.config.ts (afterFiles, so this static index route wins for the bare
// /experiences path while sub-paths still rewrite).

export const metadata: Metadata = {
  title: 'Running experiences & events in India — yoga, trails & meetups',
  description:
    'Discover running experiences across India — club runs, weekend meetups, yoga sessions, and trail outings. Find what is on near you and show up.',
  alternates: { canonical: 'https://www.endorfin.run/experiences' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/experiences',
    title: 'Running experiences & events in India | Endorfin',
    description:
      'Club runs, weekend meetups, yoga sessions, and trail outings across Delhi, Mumbai, Bengaluru, Hyderabad, Chennai and beyond.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

export default function ExperiencesPage() {
  return <ClubsExperiencesPage variant="experiences" />;
}
