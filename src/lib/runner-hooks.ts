'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminToken } from '@/lib/use-admin-token';
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

/** Pretty-printed error for sonner toasts. */
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
    return e.message || `Request failed (${e.status})`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

// ── /users/me ────────────────────────────────────────────────────────────

export function useMe() {
  const token = useAdminToken();
  return useQuery({
    queryKey: runnerKeys.me(),
    queryFn: () => getMe(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function usePatchMe() {
  const token = useAdminToken();
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
  const token = useAdminToken();
  return useMutation({
    mutationFn: (body: CouponPreviewRequest) => previewCoupon(token, body),
  });
}

// ── Registrations ────────────────────────────────────────────────────────

export function useCreateRegistration() {
  const token = useAdminToken();
  return useMutation({
    mutationFn: (body: RegistrationCreate) => createRegistration(token!, body),
  });
}

export function useConfirmRegistration(registrationId: string | null) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegistrationConfirmRequest) =>
      confirmRegistration(token!, registrationId!, body),
    onSuccess: (reg) => {
      if (registrationId) {
        qc.invalidateQueries({ queryKey: runnerKeys.registration(registrationId) });
      }
      qc.invalidateQueries({ queryKey: runnerKeys.myRegistrations() });
      // Best-effort write of the just-confirmed row so /success page
      // can render before the GET re-fetches.
      qc.setQueryData<MyRegistrationItem | undefined>(
        runnerKeys.registration(reg.id),
        (prev) => (prev ? { ...prev, ...reg } : undefined),
      );
    },
  });
}

export function useMyRegistrations() {
  const token = useAdminToken();
  return useQuery({
    queryKey: runnerKeys.myRegistrations(),
    queryFn: () => getMyRegistrations(token!),
    enabled: !!token,
    staleTime: 15_000,
  });
}

export function useMyRegistration(
  registrationId: string | null,
  options: { refetchIntervalMs?: number } = {},
) {
  const token = useAdminToken();
  return useQuery({
    queryKey: runnerKeys.registration(registrationId ?? ''),
    queryFn: () => getMyRegistration(token!, registrationId!),
    enabled: !!token && !!registrationId,
    staleTime: 5_000,
    refetchInterval: options.refetchIntervalMs ?? false,
  });
}
