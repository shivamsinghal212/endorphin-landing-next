'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStudioAuth } from '@/lib/studio/auth-context';

/**
 * Runner-tree token source. Mirrors `useAdminToken()` for the runner
 * surface, but reads ONLY from `StudioAuthProvider` and never touches
 * `useSession()` from next-auth.
 *
 * The marketing routes (/races/*, /me/*) deliberately don't ship a
 * `<SessionProvider>` — keeps NextAuth out of the marketing bundle.
 * `RunnerProviders` mounts `StudioAuthProvider` with a server-resolved
 * marketing-session JWT, which is always sufficient for runner pages.
 */
function useRunnerToken(): string | null {
  const studio = useStudioAuth();
  return studio?.token ?? null;
}
import {
  RunnerApiError,
  type CouponPreviewRequest,
  type MeProfile,
  type MeUpdate,
  type MyRegistrationItem,
  type RegistrationConfirmRequest,
  type RegistrationCreate,
  confirmRegistration,
  createRegistration,
  getMe,
  getMyRegistration,
  getMyRegistrations,
  patchMe,
  previewCoupon,
} from '@/lib/runner-api';
import { runnerKeys } from '@/lib/studio/runner-keys';

/** Pretty-printed error for inline error rendering + sonner toasts.
 *  Falls back to including the HTTP status so support tickets aren't
 *  left chasing "Something went wrong" with no diagnostic. */
export function describeRunnerError(e: unknown): string {
  if (e instanceof RunnerApiError) {
    try {
      const parsed = JSON.parse(e.message);
      if (typeof parsed?.detail === 'string') return parsed.detail;
      if (typeof parsed?.error === 'string') return parsed.error;
      if (typeof parsed?.message === 'string') return parsed.message;
    } catch {
      /* non-JSON body */
    }
    return e.message || `Request failed (HTTP ${e.status})`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong — please try again';
}

// ── /users/me ────────────────────────────────────────────────────────────

export function useMe() {
  const token = useRunnerToken();
  return useQuery({
    queryKey: runnerKeys.me(),
    queryFn: () => getMe(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function usePatchMe() {
  const token = useRunnerToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeUpdate) => patchMe(token!, body),
    onSuccess: (me: MeProfile) => {
      qc.setQueryData(runnerKeys.me(), me);
    },
  });
}

// ── Coupon preview ───────────────────────────────────────────────────────

export function usePreviewCoupon() {
  const token = useRunnerToken();
  return useMutation({
    mutationFn: (body: CouponPreviewRequest) => previewCoupon(token, body),
  });
}

// ── Registrations ────────────────────────────────────────────────────────

export function useCreateRegistration() {
  const token = useRunnerToken();
  return useMutation({
    mutationFn: (body: RegistrationCreate) => createRegistration(token!, body),
  });
}

/**
 * Confirm a registration's payment. The registrationId is supplied at
 * mutate time (not at hook init) because the form gets it from the
 * createRegistration response — there's no stable id when the form first
 * mounts. The earlier `useConfirmRegistration(null)` bug routed every
 * confirm POST to `/registrations/null/confirm` and 404'd.
 */
export function useConfirmRegistration() {
  const token = useRunnerToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      registrationId,
      body,
    }: {
      registrationId: string;
      body: RegistrationConfirmRequest;
    }) => confirmRegistration(token!, registrationId, body),
    onSuccess: (reg) => {
      qc.invalidateQueries({ queryKey: runnerKeys.registration(reg.id) });
      qc.invalidateQueries({ queryKey: runnerKeys.myRegistrations() });
      qc.setQueryData<MyRegistrationItem | undefined>(
        runnerKeys.registration(reg.id),
        (prev) => (prev ? { ...prev, ...reg } : undefined),
      );
    },
  });
}

export function useMyRegistrations() {
  const token = useRunnerToken();
  return useQuery({
    queryKey: runnerKeys.myRegistrations(),
    queryFn: () => getMyRegistrations(token!),
    enabled: !!token,
    staleTime: 15_000,
    // Refund / verification flips happen out-of-band (webhook / admin
    // action). Re-fetch on tab focus so the list catches up without a
    // hard reload.
    refetchOnWindowFocus: true,
  });
}

export function useMyRegistration(
  registrationId: string | null,
  options: { refetchIntervalMs?: number } = {},
) {
  const token = useRunnerToken();
  return useQuery({
    queryKey: runnerKeys.registration(registrationId ?? ''),
    queryFn: () => getMyRegistration(token!, registrationId!),
    enabled: !!token && !!registrationId,
    staleTime: 5_000,
    refetchInterval: options.refetchIntervalMs ?? false,
  });
}
