'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AdminApiError,
  addClubAdmin,
  approveJoinRequest,
  changeMemberRole,
  createClubCollaboration,
  createClubEvent,
  deleteClubCollaboration,
  deleteClubEvent,
  getClub,
  getMyMembership,
  getStudioScrapeHistory,
  kickMember,
  listClubEvents,
  listClubMembers,
  listEventRsvps,
  listJoinRequests,
  listMyClubs,
  listRsvpSummary,
  patchClub,
  patchClubEvent,
  rejectJoinRequest,
  removeClubAdmin,
  triggerStudioScrape,
  updateClubCollaboration,
  type ClubCollaborationInput,
} from '@/lib/admin-api';
import { studioKeys } from './keys';
import { useAdminToken } from '@/lib/use-admin-token';

/** Pretty-printed error message for toast surfaces. */
export function describeError(e: unknown): string {
  if (e instanceof AdminApiError) {
    try {
      const parsed = JSON.parse(e.message);
      if (typeof parsed?.detail === 'string') return parsed.detail;
    } catch {}
    return e.message || `Request failed (${e.status})`;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useMyClubs(role: 'admin' | 'all' = 'admin', allClubs = false) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.myClubs(role, allClubs),
    queryFn: () => listMyClubs(token!, role, allClubs),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useStudioClub(slug: string) {
  return useQuery({
    queryKey: studioKeys.club(slug),
    queryFn: () => getClub(slug),
    enabled: !!slug,
    staleTime: 15_000,
  });
}

export function useStudioMembership(slug: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.membership(slug),
    queryFn: () => getMyMembership(token!, slug),
    enabled: !!slug && !!token,
    staleTime: 60_000,
  });
}

export function useStudioMembers(slug: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.members(slug),
    queryFn: () => listClubMembers(token!, slug),
    enabled: !!slug && !!token,
  });
}

export function useStudioJoinRequests(
  slug: string,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.joinRequests(slug, status),
    queryFn: () => listJoinRequests(token!, slug, status),
    enabled: !!slug && !!token,
    refetchOnWindowFocus: true,
  });
}

export function useStudioEvents(slug: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.events(slug),
    queryFn: () => listClubEvents(token!, slug),
    enabled: !!slug && !!token,
  });
}

export function useStudioEventRsvps(slug: string, eventId: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.rsvps(slug, eventId),
    queryFn: () => listEventRsvps(token!, slug, eventId),
    enabled: !!slug && !!eventId && !!token,
  });
}

export function useStudioRsvpSummary(slug: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.rsvpSummary(slug),
    queryFn: () => listRsvpSummary(token!, slug),
    enabled: !!slug && !!token,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function usePatchClub(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => patchClub(token!, slug, patch),
    onSuccess: (club) => {
      qc.setQueryData(studioKeys.club(slug), club);
      qc.invalidateQueries({ queryKey: studioKeys.myClubs('admin') });
    },
  });
}

// ── Brand collaborations ─────────────────────────────────────────────────
// Reads ride on the club detail (club.collaborations), so all mutations just
// invalidate the club query.

export function useCreateCollaboration(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClubCollaborationInput) =>
      createClubCollaboration(token!, slug, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: studioKeys.club(slug) }),
  });
}

export function useUpdateCollaboration(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<ClubCollaborationInput>;
    }) => updateClubCollaboration(token!, slug, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: studioKeys.club(slug) }),
  });
}

export function useDeleteCollaboration(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClubCollaboration(token!, slug, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studioKeys.club(slug) }),
  });
}

// ── Instagram re-sync ────────────────────────────────────────────────────

export function useStudioScrapeHistory(slug: string, poll = false) {
  const token = useAdminToken();
  return useQuery({
    queryKey: studioKeys.scrapeHistory(slug),
    queryFn: () => getStudioScrapeHistory(token!, slug),
    enabled: !!slug && !!token,
    // While a run is pending the page asks us to poll for live status.
    refetchInterval: poll ? 4000 : false,
  });
}

export function useTriggerScrape(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => triggerStudioScrape(token!, slug),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: studioKeys.scrapeHistory(slug) }),
  });
}

export function useApproveJoinRequest(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => approveJoinRequest(token!, slug, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'join-requests', slug] });
      qc.invalidateQueries({ queryKey: studioKeys.members(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.club(slug) });
    },
  });
}

export function useRejectJoinRequest(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string | null }) =>
      rejectJoinRequest(token!, slug, requestId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'join-requests', slug] });
    },
  });
}

export function useKickMember(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => kickMember(token!, slug, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.members(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.club(slug) });
    },
  });
}

export function useChangeMemberRole(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      changeMemberRole(token!, slug, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.members(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.club(slug) });
    },
  });
}

export function useAddClubAdmin(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleLabel }: { userId: string; roleLabel?: string }) =>
      addClubAdmin(token!, slug, userId, roleLabel),
    onSuccess: (club) => {
      qc.setQueryData(studioKeys.club(slug), club);
    },
  });
}

export function useRemoveClubAdmin(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeClubAdmin(token!, slug, userId),
    onSuccess: (club) => {
      qc.setQueryData(studioKeys.club(slug), club);
    },
  });
}

export function useCreateClubEvent(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createClubEvent(token!, slug, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.events(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.rsvpSummary(slug) });
    },
  });
}

export function usePatchClubEvent(slug: string, eventId: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchClubEvent(token!, slug, eventId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.events(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.rsvpSummary(slug) });
    },
  });
}

export function useDeleteClubEvent(slug: string) {
  const token = useAdminToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteClubEvent(token!, slug, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.events(slug) });
      qc.invalidateQueries({ queryKey: studioKeys.rsvpSummary(slug) });
    },
  });
}
