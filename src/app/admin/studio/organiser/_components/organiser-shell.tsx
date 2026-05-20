'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMyOrganiser, describeOrganiserError } from '@/lib/studio/organiser-hooks';
import { ErrorState, Skeleton, StudioTopBar } from '../../_components/ui';
import { Dashboard } from './dashboard';

/** Entry surface for /admin/studio/organiser.
 *  - No organiser profile yet → redirect to onboarding.
 *  - Otherwise → render the dashboard. */
export function OrganiserShell() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetched } = useMyOrganiser();

  useEffect(() => {
    // `data === null` is the explicit "not onboarded" signal from
    // `getMyOrganiser` (it swallows 404). `isFetched` guards against the
    // initial undefined state.
    if (isFetched && data === null) {
      router.replace('/admin/studio/organiser/onboarding');
    }
  }, [isFetched, data, router]);

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
        ) : isLoading || data === null || data === undefined ? (
          <DashboardSkeleton />
        ) : (
          <Dashboard organiser={data} />
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
