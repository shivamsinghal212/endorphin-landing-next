const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function adminFetch<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AdminApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEvents: number;
  totalUsers: number;
  totalRsvps: number;
  communityEvents: number;
  eventsBySource: Record<string, number>;
  usersToday: number;
  rsvpsToday: number;
}

export const getStats = (token: string) =>
  adminFetch<DashboardStats>('/stats', token);

export interface AnalyticsOverview {
  totalUsers: number;
  totalEvents: number;
  totalClubs: number;
  claimedClubs: number;
  totalRsvps: number;
  totalReminders: number;
  totalJoinRequests: number;
  hottestClub: { slug: string; name: string; requestCount: number } | null;
  joinRequestsByClub: { slug: string; name: string; requestCount: number }[];
  brandCollaborations: { brandName: string; count: number }[];
}

export const getAnalytics = (token: string) =>
  adminFetch<AnalyticsOverview>('/analytics', token);

// ── Events ─────────────────────────────────────────────────────────────────

export interface AdminEvent {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  locationName: string | null;
  locationAddress: string | null;
  startTime: string | null;
  endTime: string | null;
  organizerName: string | null;
  priceMin: number | null;
  currency: string | null;
  eventType: string | null;
  isFeatured: boolean;
  eventStatus: string | null;
  eventSourceType: string | null;
  visibility: string | null;
  website: string | null;
  registrationUrl: string | null;
  soldOut: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  distanceCategories: string[];
}

export interface EventsResponse {
  events: AdminEvent[];
  total: number;
  page: number;
  limit: number;
}

export const getEvents = (token: string, params: Record<string, string | number>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return adminFetch<EventsResponse>(`/events?${qs}`, token);
};

export const updateEvent = (token: string, id: string, data: Record<string, unknown>) =>
  adminFetch<AdminEvent>(`/events/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteEvent = (token: string, id: string) =>
  adminFetch(`/events/${id}`, token, { method: 'DELETE' });

// ── Organiser event review (draft / pending_review → live | cancelled) ───────
// Surfaces organiser-published events awaiting super-admin approval. The
// backend returns the public Event shape; we read just what the queue needs.
export interface ReviewEvent {
  id: string;
  slug: string | null;
  title: string;
  eventStatus: string;
  category: string;
  organizerName: string | null;
  startTime: string;
  coverImageUrl?: string | null;
  imageUrl?: string | null;
}

export const listPendingEvents = (token: string) =>
  adminFetch<ReviewEvent[]>('/events/pending', token);

export const approveEvent = (token: string, id: string) =>
  adminFetch<ReviewEvent>(`/events/${id}/approve`, token, { method: 'POST' });

export const rejectEvent = (token: string, id: string, reason?: string) =>
  adminFetch<ReviewEvent>(`/events/${id}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });

// ── Users ──────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  city: string | null;
  authProvider: string;
  isEmailVerified: boolean;
  isPrivate: boolean;
  createdAt: string | null;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserDetail {
  user: AdminUser;
  eventsAttending: number;
  eventsCreated: number;
  followers: number;
  following: number;
  messagesSent: number;
}

export const getUsers = (token: string, params: Record<string, string | number>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return adminFetch<UsersResponse>(`/users?${qs}`, token);
};

export const getUserDetail = (token: string, id: string) =>
  adminFetch<UserDetail>(`/users/${id}`, token);

export const banUser = (token: string, id: string) =>
  adminFetch(`/users/${id}/ban`, token, { method: 'POST' });

export const deleteUser = (token: string, id: string) =>
  adminFetch(`/users/${id}`, token, { method: 'DELETE' });

// ── Moderation ─────────────────────────────────────────────────────────────

export interface AdminMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  messageType: string;
  isPinned: boolean;
  createdAt: string | null;
}

export interface MessagesResponse {
  messages: AdminMessage[];
  total: number;
  page: number;
  limit: number;
}

export const getMessages = (token: string, params: Record<string, string | number>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return adminFetch<MessagesResponse>(`/messages?${qs}`, token);
};

export const deleteMessage = (token: string, id: string) =>
  adminFetch(`/messages/${id}`, token, { method: 'DELETE' });

export interface AdminPhoto {
  id: string;
  eventId: string;
  uploadedBy: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string | null;
}

export interface PhotosResponse {
  photos: AdminPhoto[];
  total: number;
  page: number;
  limit: number;
}

export const getPhotos = (token: string, params: Record<string, string | number>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return adminFetch<PhotosResponse>(`/photos?${qs}`, token);
};

export const deletePhoto = (token: string, id: string) =>
  adminFetch(`/photos/${id}`, token, { method: 'DELETE' });

// ── Scrapers ───────────────────────────────────────────────────────────────

export const runScraper = (token: string, source?: string, enrich = true) =>
  adminFetch<{ ok: boolean; message: string }>('/scraper/run', token, {
    method: 'POST',
    body: JSON.stringify({ source: source || null, enrich }),
  });

export const getScraperSources = (token: string) =>
  adminFetch<{ sources: string[] }>('/scraper/sources', token);

export interface ScraperRun {
  id: string;
  source: string;
  status: string;
  eventsFetched: number;
  eventsUpserted: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export const getScraperRuns = (token: string, limit = 20) =>
  adminFetch<{ runs: ScraperRun[] }>(`/scraper/runs?limit=${limit}`, token);

export const getLastRunsPerSource = (token: string) =>
  adminFetch<Record<string, ScraperRun>>('/scraper/last-runs', token);

// ── Event detail + create + enrich ─────────────────────────────────────────

export const getEventDetail = (token: string, id: string) =>
  adminFetch<AdminEvent>(`/events/${id}`, token);

export const createEvent = (token: string, data: Record<string, unknown>) =>
  adminFetch<AdminEvent>('/events', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const enrichEvent = (token: string, id: string) =>
  adminFetch<AdminEvent>(`/events/${id}/enrich`, token, { method: 'POST' });

export const getCommunityEvents = (token: string, params: Record<string, string | number>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return adminFetch<EventsResponse>(`/events/community?${qs}`, token);
};

// ── Notifications ──────────────────────────────────────────────────────────

export const broadcastNotification = (
  token: string,
  data: { title: string; body: string; city?: string },
) =>
  adminFetch<{ ok: boolean; recipientCount: number }>('/notifications/broadcast', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getQueueStatus = (token: string) =>
  adminFetch<{ pending: number; processed: number }>('/notifications/queue', token);

// ── Clubs ──────────────────────────────────────────────────────────────────
// GET is public; POST upserts and requires the admin JWT.
// Routes live at /api/v1/clubs/* (not under /admin), so we hit them directly.

export interface ClubStats {
  members: number;
  runsThisMonth: number;
  kmThisMonth: number;
  yearsRunning: number;
}

export interface ClubAdminPerson {
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  stravaUrl?: string | null;
  // Set by the backend for cards auto-derived from the owner/admin membership
  // roster (not stored in clubs.admins[]). Read-only in the editor and excluded
  // from the save payload so they're never persisted as curated cards.
  derived?: boolean;
}

// A curated coach/trainer profile shown in the "Coaches" section of the
// public club page. Distinct from ClubAdminPerson (the run-lead roster):
// coaches are richer cards with a photo gallery and a long-form bio that
// opens in a modal. Stored as a JSON array on the club row (clubs.coaches),
// edited in Studio. Always present in the GET /clubs/{slug} response —
// empty array when none are configured.
export interface ClubCoach {
  // Stable id for React keys + per-coach admin CRUD.
  id: string;
  name: string;
  // Title line, e.g. "Dance Choreographer · Zumba Instructor".
  designation?: string | null;
  // Short skill tags, e.g. ["Strength & conditioning", "Marathon"].
  specialisations: string[];
  // Long-form bio. Plain text; paragraph breaks are blank lines ("\n\n").
  // The card teaser is derived client-side from the first paragraph.
  experience?: string | null;
  instagramUrl?: string | null;
  // Ordered gallery URLs (Supabase storage). First entry is the card cover.
  // Mostly portrait (4:5 / 9:16). May be empty.
  photos: string[];
  // Ascending display order within the section.
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Create/patch payloads for the coach CRUD endpoints. PATCH is
// exclude_unset on the backend — only send fields you intend to change.
// `photos` is replaced wholesale (add/remove/reorder), never merged.
export interface ClubCoachInput {
  name: string;
  designation?: string | null;
  specialisations?: string[];
  experience?: string | null;
  instagramUrl?: string | null;
  photos?: string[];
  sortOrder?: number;
}

export type JoinFormFieldType = 'text' | 'textarea' | 'select' | 'number';

export interface JoinFormField {
  id: string;
  label: string;
  type: JoinFormFieldType;
  required: boolean;
  options?: string[] | null;
  placeholder?: string | null;
}

export interface ClubCollaboration {
  id: string;
  brandName: string;
  role: string | null;
  handle: string | null;
  logoUrl: string | null;
  evidencePostUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  city: string;
  establishedYear: number | null;
  logoUrl: string | null;
  headerImageUrl: string | null;
  kicker: string | null;
  subtitle: string | null;
  description: string | null;
  tags: string[];
  isVerified: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  whatsappUrl: string | null;
  instagramUrl: string | null;
  stravaUrl: string | null;
  joinUrl: string | null;
  joinForm: JoinFormField[] | null;
  requiresApproval: boolean;
  isClaimed: boolean;
  stats: ClubStats;
  admins: ClubAdminPerson[];
  // Curated coach/trainer profiles. Always an array (empty when none).
  coaches: ClubCoach[];
  // Populated by the Instagram scrape pipeline. Editable by admins; if the
  // form omits them on save they're preserved (the backend's POST /clubs
  // uses exclude_unset semantics on update).
  tagline: string | null;
  postRunActivities: string[];
  lastScrapedAt: string | null;
  // Joined on /clubs/{slug} only. List endpoints leave this empty to keep
  // the sitemap query N+1-free.
  collaborations: ClubCollaboration[];
  createdAt: string;
  updatedAt: string;
}

export interface ClubEventRecapPhoto {
  url: string;
  captionTitle?: string | null;
  captionMeta?: string | null;
}

export interface ClubEventRecapVideo {
  url: string;
  posterUrl?: string | null;
  durationSec?: number | null;
  captionTitle?: string | null;
  captionMeta?: string | null;
}

export interface ClubEventRecap {
  summary?: string | null;
  showedUp?: number | null;
  paceGroups?: string | null;
  after?: string | null;
  photos: ClubEventRecapPhoto[];
  videos: ClubEventRecapVideo[];
}

// Stay in sync with the EventType Literal in
// EndorphinBackend/app/schemas/club_event.py.
export type ClubEventType =
  | 'club_run'
  | 'club_race'
  | 'club_workshop'
  | 'club_social'
  | 'club_meetup'
  | 'club_cross_train'
  | 'race_event';

export type ClubEventSource = 'manual' | 'instagram_scrape';

export interface ClubEventComment {
  user: string | null;
  text: string | null;
  likes: number;
  date: string | null;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  // Public-URL slug for the shareable event page; null on un-backfilled rows.
  slug: string | null;
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  startTime: string;
  endTime: string | null;
  maxParticipants: number | null;
  coverImageUrl: string | null;
  distanceKm: number | null;
  eventType: ClubEventType;
  recap: ClubEventRecap | null;
  // Scrape-derived but admin-editable.
  secondaryActivities: string[];
  sponsorsSeen: string[];
  tagline: string | null;
  topComments: ClubEventComment[] | null;
  // Read-only system fields. ``source='instagram_scrape'`` flags rows that
  // re-scrapes will upsert against ``sourcePostUrl``; admin-created rows are
  // ``source='manual'`` with a null sourcePostUrl and stay invisible to the
  // scraper.
  source: ClubEventSource;
  sourcePostUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  goingCount: number;
}

export const getClub = async (slug: string): Promise<Club | null> => {
  const res = await fetch(`${API_BASE}/api/v1/clubs/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new AdminApiError(res.status, await res.text());
  return res.json();
};

export const upsertClub = async (
  token: string,
  payload: Record<string, unknown>,
): Promise<Club> => {
  const res = await fetch(`${API_BASE}/api/v1/clubs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new AdminApiError(res.status, await res.text());
  return res.json();
};

// All clubs incl. unpublished drafts (admin-only).
export const listAdminClubs = (token: string) =>
  adminFetch<Club[]>('/clubs', token);

export const setClubFeatured = (token: string, slug: string, isFeatured: boolean) =>
  adminFetch<Club>(`/clubs/${encodeURIComponent(slug)}/featured`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isFeatured }),
  });

export const setClubPublished = (token: string, slug: string, isPublished: boolean) =>
  adminFetch<Club>(`/clubs/${encodeURIComponent(slug)}/published`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isPublished }),
  });

// ── Club Instagram scrape ──────────────────────────────────────────────────

export interface ClubScrapeTriggerResponse {
  ok: boolean;
  instagramUsername: string;
  existingClub: { id: string; slug: string; name: string } | null;
}

export interface ClubScrapeRun {
  id: string;
  instagramUsername: string;
  status: 'pending' | 'success' | 'partial' | 'failed' | string;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  counts: Record<string, number>;
  clubId: string | null;
  clubSlug: string | null;
  clubName: string | null;
}

export const triggerClubScrape = (token: string, instagramUrl: string) =>
  adminFetch<ClubScrapeTriggerResponse>('/clubs/scrape', token, {
    method: 'POST',
    body: JSON.stringify({ instagramUrl }),
  });

export const getClubScrapeHistory = (token: string, limit = 30) =>
  adminFetch<{ runs: ClubScrapeRun[] }>(`/clubs/scrape/history?limit=${limit}`, token);

// ── Club events ────────────────────────────────────────────────────────────
// These hit /api/v1/clubs/{slug}/events directly. Platform admins (whitelisted
// emails) are accepted by require_club_admin even without club membership.

const clubFetch = async <T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> => {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new AdminApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
};

export const listClubEvents = (token: string, slug: string, params: { upcoming?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (params.upcoming !== undefined) qs.set('upcoming', String(params.upcoming));
  const suffix = qs.toString() ? `?${qs}` : '';
  return clubFetch<ClubEvent[]>(`/clubs/${encodeURIComponent(slug)}/events${suffix}`, token);
};

export const getClubEvent = async (
  token: string,
  slug: string,
  eventId: string,
): Promise<ClubEvent | null> => {
  const events = await listClubEvents(token, slug);
  return events.find((e) => e.id === eventId) ?? null;
};

export const createClubEvent = (token: string, slug: string, body: Record<string, unknown>) =>
  clubFetch<ClubEvent>(`/clubs/${encodeURIComponent(slug)}/events`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchClubEvent = (
  token: string,
  slug: string,
  eventId: string,
  body: Record<string, unknown>,
) =>
  clubFetch<ClubEvent>(
    `/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  );

export const deleteClubEvent = (token: string, slug: string, eventId: string) =>
  clubFetch(`/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}`, token, {
    method: 'DELETE',
  });

// ── Studio (owner-facing) ──────────────────────────────────────────────────
// These wrap the same /api/v1/clubs/* endpoints the mobile app uses. They
// require a bearer token but not super-admin status — backend authorises by
// club membership/role.

export type ClubRole = 'owner' | 'admin' | 'member';

export interface ClubMemberUser {
  id: string;
  name: string;
  email?: string | null;
  pictureUrl?: string | null;
  city?: string | null;
}

export type MyMembershipStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'removed'
  | 'rejected';

export interface MyMembership {
  status: MyMembershipStatus;
  role: ClubRole | null;
  requestId: string | null;
  joinedAt: string | null;
}

export const getMyMembership = (token: string, slug: string) =>
  clubFetch<MyMembership>(`/clubs/${encodeURIComponent(slug)}/my-membership`, token);

export const listMyClubs = (
  token: string,
  role: 'admin' | 'all' = 'admin',
  allClubs = false,
) =>
  clubFetch<Club[]>(
    `/clubs/mine?role=${role}${allClubs ? '&all_clubs=true' : ''}`,
    token,
  );

export const patchClub = (token: string, slug: string, patch: Record<string, unknown>) =>
  clubFetch<Club>(`/clubs/${encodeURIComponent(slug)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

// ── Brand collaborations (Studio CRUD) ──────────────────────────────────────
// Reads arrive on the club detail (club.collaborations); these mutate. All
// authorised by club membership (owner/admin) or platform admin.

export interface ClubCollaborationInput {
  brandName: string;
  role?: string | null;
  handle?: string | null;
  logoUrl?: string | null;
  evidencePostUrl?: string | null;
}

export const createClubCollaboration = (
  token: string,
  slug: string,
  body: ClubCollaborationInput,
) =>
  clubFetch<ClubCollaboration>(
    `/clubs/${encodeURIComponent(slug)}/collaborations`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const updateClubCollaboration = (
  token: string,
  slug: string,
  collabId: string,
  body: Partial<ClubCollaborationInput>,
) =>
  clubFetch<ClubCollaboration>(
    `/clubs/${encodeURIComponent(slug)}/collaborations/${encodeURIComponent(collabId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  );

export const deleteClubCollaboration = (
  token: string,
  slug: string,
  collabId: string,
) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/collaborations/${encodeURIComponent(collabId)}`,
    token,
    { method: 'DELETE' },
  );

// ── Coaches (Studio / super-admin CRUD) ─────────────────────────────────────
// Reads arrive on the club detail (club.coaches); these mutate. Authorised by
// club membership (owner/admin) or platform admin — the super-admin manages
// any club's coaches via the platform-admin bypass. Photos are uploaded
// client-side to Supabase Storage; their public URLs are sent in the body.

export const listClubCoaches = (token: string, slug: string) =>
  clubFetch<ClubCoach[]>(`/clubs/${encodeURIComponent(slug)}/coaches`, token);

export const createClubCoach = (
  token: string,
  slug: string,
  body: ClubCoachInput,
) =>
  clubFetch<ClubCoach>(`/clubs/${encodeURIComponent(slug)}/coaches`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateClubCoach = (
  token: string,
  slug: string,
  coachId: string,
  body: Partial<ClubCoachInput>,
) =>
  clubFetch<ClubCoach>(
    `/clubs/${encodeURIComponent(slug)}/coaches/${encodeURIComponent(coachId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(body) },
  );

export const deleteClubCoach = (token: string, slug: string, coachId: string) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/coaches/${encodeURIComponent(coachId)}`,
    token,
    { method: 'DELETE' },
  );

// ── Club-scoped Instagram re-sync (Studio) ──────────────────────────────────
// Refetches this club's IG using its stored instagram_url. Authorised by
// membership — distinct from the platform-admin /admin/clubs/scrape.

export interface StudioScrapeResponse {
  ok: boolean;
  instagramUsername: string;
}

export const triggerStudioScrape = (token: string, slug: string) =>
  clubFetch<StudioScrapeResponse>(
    `/clubs/${encodeURIComponent(slug)}/scrape`,
    token,
    { method: 'POST' },
  );

export const getStudioScrapeHistory = (token: string, slug: string, limit = 20) =>
  clubFetch<{ runs: ClubScrapeRun[] }>(
    `/clubs/${encodeURIComponent(slug)}/scrape/history?limit=${limit}`,
    token,
  );

// ── Members + join requests ────────────────────────────────────────────────

export interface ClubMember {
  id: string; // membership id
  user: ClubMemberUser;
  role: ClubRole;
  status: 'active' | 'removed';
  joinedAt: string;
  removedAt?: string | null;
}

export interface ClubJoinRequestRow {
  id: string;
  user: ClubMemberUser;
  formData: Record<string, unknown> | null;
  instagramId?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export const listClubMembers = (token: string, slug: string) =>
  clubFetch<ClubMember[]>(`/clubs/${encodeURIComponent(slug)}/members`, token);

export const listJoinRequests = (
  token: string,
  slug: string,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
) =>
  clubFetch<ClubJoinRequestRow[]>(
    `/clubs/${encodeURIComponent(slug)}/join-requests?status=${status}`,
    token,
  );

export const approveJoinRequest = (token: string, slug: string, requestId: string) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/join-requests/${encodeURIComponent(requestId)}/approve`,
    token,
    { method: 'POST' },
  );

export const rejectJoinRequest = (
  token: string,
  slug: string,
  requestId: string,
  reason: string | null,
) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/join-requests/${encodeURIComponent(requestId)}/reject`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ rejectionReason: reason }),
    },
  );

export const kickMember = (token: string, slug: string, userId: string) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
    token,
    { method: 'DELETE' },
  );

export const changeMemberRole = (
  token: string,
  slug: string,
  userId: string,
  role: 'admin' | 'member',
) =>
  clubFetch<void>(
    `/clubs/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );

export interface UserSearchResult {
  id: string;
  name: string;
  email?: string | null;
  pictureUrl?: string | null;
  city?: string | null;
}

export const searchUsers = (token: string, q: string) =>
  clubFetch<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`, token);

export const addClubAdmin = (
  token: string,
  slug: string,
  userId: string,
  roleLabel?: string,
) =>
  clubFetch<Club>(`/clubs/${encodeURIComponent(slug)}/admins`, token, {
    method: 'POST',
    body: JSON.stringify({ userId, roleLabel }),
  });

export const removeClubAdmin = (token: string, slug: string, userId: string) =>
  clubFetch<Club>(
    `/clubs/${encodeURIComponent(slug)}/admins/${encodeURIComponent(userId)}`,
    token,
    { method: 'DELETE' },
  );

export const patchAdminCard = (
  token: string,
  slug: string,
  userId: string,
  card: {
    role?: string | null;
    avatarUrl?: string | null;
    whatsappUrl?: string | null;
    instagramUrl?: string | null;
    stravaUrl?: string | null;
  },
) =>
  clubFetch<Club>(
    `/clubs/${encodeURIComponent(slug)}/admins/${encodeURIComponent(userId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(card),
    },
  );

// ── RSVPs (event attendees) ────────────────────────────────────────────────

export interface RsvpAttendee {
  userId: string;
  name: string;
  email?: string | null;
  pictureUrl?: string | null;
  status: string;
  createdAt: string;
}

export interface RsvpSummaryRow {
  eventId: string;
  title: string;
  startTime: string;
  goingCount: number;
}

export const listEventRsvps = (token: string, slug: string, eventId: string) =>
  clubFetch<RsvpAttendee[]>(
    `/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/rsvps`,
    token,
  );

export const listRsvpSummary = (token: string, slug: string) =>
  clubFetch<RsvpSummaryRow[]>(`/clubs/${encodeURIComponent(slug)}/rsvps/summary`, token);

// ── Club claim requests ────────────────────────────────────────────────────

export interface ClubClaimRequest {
  id: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  userId: string;
  claimantName: string;
  claimantEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}

export const listPendingClubClaims = (token: string) =>
  adminFetch<ClubClaimRequest[]>('/club-claims?status=pending', token);

export const approveClubClaim = (token: string, id: string) =>
  adminFetch<ClubClaimRequest>(`/club-claims/${encodeURIComponent(id)}/approve`, token, {
    method: 'POST',
  });

export const rejectClubClaim = (token: string, id: string) =>
  adminFetch<ClubClaimRequest>(`/club-claims/${encodeURIComponent(id)}/reject`, token, {
    method: 'POST',
  });
