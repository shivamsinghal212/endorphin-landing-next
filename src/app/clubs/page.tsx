import type { Metadata } from 'next';
import type { JoinFormField } from '@/lib/admin-api';
import ClubsExperiencesPage from './clubs-experiences-page';

// ─── Re-exported types (consumed by /clubs/[slug] and /run-clubs/[city]) ──
// Kept here because moving them to a separate file is a larger refactor;
// the /clubs LIST page itself no longer uses these shapes — it works
// against DiscoverHit from the unified discover endpoint. The detail
// pages and the city-landing pages still hit the legacy /api/v1/clubs/{slug}
// endpoints which return these richer shapes.

export interface ApiClubStats {
  members?: number;
  runsThisMonth?: number;
  kmThisMonth?: number;
  yearsRunning?: number;
}

export interface ClubEventRecapPhoto {
  url: string;
  captionTitle: string | null;
  captionMeta: string | null;
}

export interface ClubEventRecapVideo {
  url: string;
  posterUrl: string | null;
  durationSec: number | null;
  captionTitle: string | null;
  captionMeta: string | null;
}

export interface ClubEventRecap {
  summary: string | null;
  showedUp: number | null;
  paceGroups: string | null;
  after: string | null;
  photos: ClubEventRecapPhoto[];
  videos: ClubEventRecapVideo[];
}

export interface ClubEventComment {
  user: string | null;
  text: string | null;
  likes: number;
  date: string | null;
  userPictureUrl?: string | null;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  // Public-URL slug for the shareable event page. NULL on legacy rows not yet
  // backfilled — callers fall back to `id`. Build links with `slug || id`.
  slug: string | null;
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  startTime: string;
  endTime: string | null;
  maxParticipants: number | null;
  coverImageUrl: string | null;
  distanceKm: number | null;
  eventType: 'club_run' | 'race_event';
  recap: ClubEventRecap | null;
  topComments?: ClubEventComment[] | null;
  sourcePostUrl?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  goingCount: number;
}

export interface ApiClub {
  slug: string;
  name: string;
  city: string;
  establishedYear?: number | null;
  logoUrl?: string | null;
  headerImageUrl?: string | null;
  kicker?: string | null;
  subtitle?: string | null;
  description?: string | null;
  tags?: string[];
  isVerified?: boolean;
  isFeatured?: boolean;
  isClaimed?: boolean;
  joinForm?: JoinFormField[] | null;
  requiresApproval?: boolean;
  stats?: ApiClubStats;
  events?: ClubEvent[];
  updatedAt?: string | null;
}

export const metadata: Metadata = {
  title: 'Run clubs in India — the most happening clubs',
  description:
    'A verified directory of run clubs across India — marathon training, weekend trail runs, and social meetups. Show up with people who run your pace.',
  alternates: { canonical: 'https://www.endorfin.run/clubs' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/clubs',
    title: 'Run clubs in India — the most happening clubs | Endorfin',
    description:
      'A verified directory of run clubs across India. Browse clubs in Delhi, Mumbai, Bengaluru, Hyderabad, Chennai and beyond.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

// The national run-club directory. Leads with the by-city clubs rail; the
// club-events rails sit below. Shares all data + layout with /experiences —
// see clubs-experiences-page.tsx — differing only in `variant`.
export default function ClubsPage() {
  return <ClubsExperiencesPage variant="clubs" />;
}
