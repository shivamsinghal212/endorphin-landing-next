import ClubsExperiencesSkeleton from './ClubsExperiencesSkeleton';

// Instant Suspense fallback for /clubs — leads with the by-city clubs rail.
export default function ClubsLoading() {
  return <ClubsExperiencesSkeleton active="clubs" />;
}
