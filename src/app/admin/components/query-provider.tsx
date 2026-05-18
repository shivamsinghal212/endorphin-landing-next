'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

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
  // Drop the user to the home page with the login modal open. The
  // marketing-site sign-in is the canonical surface — it sets the cookie
  // the studio reads, and works for non-super-admin owners too.
  const next = encodeURIComponent(window.location.pathname);
  window.location.href = `/?login=1&next=${next}`;
}

export function StudioQueryProvider({ children }: { children: React.ReactNode }) {
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
        queryCache: new QueryCache({
          onError: handleAuthError,
        }),
        mutationCache: new MutationCache({
          onError: handleAuthError,
        }),
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
