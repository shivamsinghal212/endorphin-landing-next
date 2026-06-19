import ClubsExperiencesSkeleton from '../clubs/ClubsExperiencesSkeleton';

// Instant Suspense fallback for /experiences — leads with the club-events rails.
export default function ExperiencesLoading() {
  return <ClubsExperiencesSkeleton active="experiences" />;
}
