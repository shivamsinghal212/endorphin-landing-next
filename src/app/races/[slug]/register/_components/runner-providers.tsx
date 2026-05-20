'use client';

import { useState } from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudioAuth } from '@/lib/studio/server-auth';
import { StudioAuthProvider } from '@/lib/studio/auth-context';

let reauthInFlight = false;

function handleAuthError(error: unknown) {
  const status = (error as { status?: number } | undefined)?.status;
  if (status !== 401) return;
  if (reauthInFlight) return;
  if (typeof window === 'undefined') return;
  reauthInFlight = true;
  toast.error('Session expired', {
    description: 'Sign in again to keep going.',
    duration: 4000,
  });
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/?login=1&next=${next}`;
}

/**
 * Wraps the runner-facing client tree with both:
 *   1. `StudioAuthProvider` — so `useAdminToken()` resolves the
 *      marketing-session JWT without a NextAuth `SessionProvider`.
 *   2. TanStack `QueryClientProvider` — the runner hooks are React Query.
 *
 * Used by /races/[slug]/register, /me/registrations and the success page.
 * The marketing root layout intentionally doesn't ship either provider
 * (lighter shell for static marketing routes), so we mount them locally.
 */
export function RunnerProviders({
  studio,
  children,
}: {
  studio: StudioAuth;
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 2;
            },
          },
        },
        queryCache: new QueryCache({ onError: handleAuthError }),
        mutationCache: new MutationCache({ onError: handleAuthError }),
      }),
  );

  return (
    <StudioAuthProvider value={studio}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StudioAuthProvider>
  );
}
