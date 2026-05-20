'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  OrganiserApiError,
  type Coupon,
  type CouponCreate,
  type CouponUpdate,
  type Organiser,
  type OrganiserCreate,
  type OrganiserEvent,
  type OrganiserEventCreate,
  type OrganiserEventUpdate,
  type OrganiserUpdate,
  type PendingReviewEvent,
  type RegistrationsFilters,
  approveEvent,
  cancelRegistration,
  createCoupon,
  createOrganiserEvent,
  deleteCoupon,
  getEventStats,
  getMyOrganiser,
  getOrganiserEvent,
  initiateRefund,
  listCoupons,
  listEventRegistrations,
  listOrganiserEvents,
  listPendingReviewEvents,
  onboardOrganiser,
  rejectEvent,
  submitEventForReview,
  updateCoupon,
  updateMyOrganiser,
  updateOrganiserEvent,
} from '@/lib/organiser-api';
import { organiserKeys } from './organiser-keys';

/** Pretty-printed error message for toast surfaces. Mirrors `describeError` in hooks.ts. */
export function describeOrganiserError(e: unknown): string {
  if (e instanceof OrganiserApiError) {
    try {
      const parsed = JSON.parse(e.message);
      if (typeof parsed?.detail === 'string') return parsed.detail;
    } catch {}
    return e.message || `Request failed (${e.status})`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

// ── Profile ────────────────────────────────────────────────────────────────

export function useMyOrganiser() {
  const token = useAdminToken();
  return useQuery({
    queryKey: organiserKeys.me(),
    queryFn: () => getMyOrganiser(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useOnboardOrganiser() {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganiserCreate) => onboardOrganiser(token!, body),
    onSuccess: (org: Organiser) => {
      qc.setQueryData(organiserKeys.me(), org);
    },
  });
}

export function useUpdateMyOrganiser() {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganiserUpdate) => updateMyOrganiser(token!, body),
    onSuccess: (org: Organiser) => {
      qc.setQueryData(organiserKeys.me(), org);
    },
  });
}

// ── Events ────────────────────────────────────────────────────────────────

export function useOrganiserEvents(params: { status?: string; limit?: number; offset?: number } = {}) {
  const token = useAdminToken();
  return useQuery({
    queryKey: organiserKeys.events(params.status),
    queryFn: () => listOrganiserEvents(token!, params),
    enabled: !!token,
    staleTime: 15_000,
  });
}

export function useOrganiserEvent(eventId: string | null) {
  const token = useAdminToken();
  return useQuery({
    queryKey: organiserKeys.event(eventId ?? ''),
    queryFn: () => getOrganiserEvent(token!, eventId!),
    enabled: !!token && !!eventId,
    staleTime: 5_000,
  });
}

export function useCreateOrganiserEvent() {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganiserEventCreate) => createOrganiserEvent(token!, body),
    onSuccess: (event: OrganiserEvent) => {
      qc.invalidateQueries({ queryKey: organiserKeys.events() });
      qc.setQueryData(organiserKeys.event(event.id), event);
    },
  });
}

export function useUpdateOrganiserEvent(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganiserEventUpdate) => updateOrganiserEvent(token!, eventId, body),
    onSuccess: (event: OrganiserEvent) => {
      qc.setQueryData(organiserKeys.event(eventId), event);
      qc.invalidateQueries({ queryKey: organiserKeys.events() });
    },
  });
}

export function useSubmitEventForReview(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => submitEventForReview(token!, eventId),
    onSuccess: (event: OrganiserEvent) => {
      qc.setQueryData(organiserKeys.event(eventId), event);
      qc.invalidateQueries({ queryKey: organiserKeys.events() });
    },
  });
}

export function useEventStats(eventId: string | null) {
  const token = useAdminToken();
  return useQuery({
    queryKey: organiserKeys.stats(eventId ?? ''),
    queryFn: () => getEventStats(token!, eventId!),
    enabled: !!token && !!eventId,
    staleTime: 30_000,
  });
}

export function useEventRegistrations(eventId: string | null, filters: RegistrationsFilters = {}) {
  const token = useAdminToken();
  const hash = JSON.stringify(filters);
  return useQuery({
    queryKey: organiserKeys.registrations(eventId ?? '', hash),
    queryFn: () => listEventRegistrations(token!, eventId!, filters),
    enabled: !!token && !!eventId,
    staleTime: 10_000,
  });
}

// ── Coupons ───────────────────────────────────────────────────────────────

export function useCoupons(eventId: string | null) {
  const token = useAdminToken();
  return useQuery({
    queryKey: organiserKeys.coupons(eventId ?? ''),
    queryFn: () => listCoupons(token!, eventId!),
    enabled: !!token && !!eventId,
  });
}

export function useCreateCoupon(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CouponCreate) => createCoupon(token!, eventId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: organiserKeys.coupons(eventId) });
    },
  });
}

export function useUpdateCoupon(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ couponId, body }: { couponId: string; body: CouponUpdate }) =>
      updateCoupon(token!, eventId, couponId, body),
    onSuccess: (coupon: Coupon) => {
      qc.invalidateQueries({ queryKey: organiserKeys.coupons(coupon.eventId) });
    },
  });
}

export function useInitiateRefund(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      registrationId,
      amountPaise,
      reason,
    }: {
      registrationId: string;
      amountPaise?: number;
      reason?: string;
    }) => initiateRefund(token!, eventId, registrationId, { amountPaise, reason }),
    onSuccess: () => {
      // Invalidate all registration queries for this event (filter hash is
      // opaque from here — invalidate by event id prefix instead).
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'organiser' &&
          q.queryKey[1] === 'registrations' &&
          q.queryKey[2] === eventId,
      });
    },
  });
}

export function useCancelRegistration(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      registrationId,
      reason,
    }: { registrationId: string; reason?: string }) =>
      cancelRegistration(token!, eventId, registrationId, reason),
    onSuccess: () => {
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'organiser' &&
          q.queryKey[1] === 'registrations' &&
          q.queryKey[2] === eventId,
      });
    },
  });
}

export function useDeleteCoupon(eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (couponId: string) => deleteCoupon(token!, eventId, couponId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: organiserKeys.coupons(eventId) });
    },
  });
}
