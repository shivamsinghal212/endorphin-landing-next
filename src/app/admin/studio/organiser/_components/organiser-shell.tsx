'use client';

import { useMyOrganiser, describeOrganiserError } from '@/lib/studio/organiser-hooks';
import { ErrorState, Skeleton, StudioTopBar } from '../../_components/ui';
import { Dashboard } from './dashboard';

/** Entry surface for /admin/studio/organiser — the events workspace.
 *
 *  It used to bounce anyone without an organiser profile straight to
 *  onboarding, which is exactly the wall the unified flow removes: you can
 *  create, publish and manage events without ever having one. The dashboard
 *  now renders either way, and host details are edited per-event.
 */
export function OrganiserShell() {
  const { data, isLoading, isError, error, refetch, isFetched } = useMyOrganiser();

  return (
    <>
      <StudioTopBar back={{ href: '/admin/studio', label: 'Studio home' }} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        {isError ? (
          <ErrorState
            title="Couldn't load your organiser profile"
            message={describeOrganiserError(error)}
            onRetry={() => refetch()}
          />
        ) : isLoading || !isFetched ? (
          <DashboardSkeleton />
        ) : (
          // `data === null` is the explicit "no profile" signal from
          // `getMyOrganiser`, which swallows the 404. Not an error state.
          <Dashboard organiser={data ?? null} />
        )}
      </main>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-56 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full mb-4" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
