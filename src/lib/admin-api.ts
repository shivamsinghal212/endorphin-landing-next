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

export type ClubRunType = 'club_run' | 'race_event';

export interface ClubStats {
  members: number;
  runsThisMonth: number;
  kmThisMonth: number;
  yearsRunning: number;
}

export interface ClubNextRun {
  id?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  title: string;
  distanceKm?: number | null;
  description?: string | null;
  goingCount: number;
  bgImageUrl?: string | null;
  rsvpUrl?: string | null;
  type: ClubRunType;
}

export interface ClubUpcomingRun {
  id?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  title: string;
  distanceKm?: number | null;
  goingCount: number;
  rsvpUrl?: string | null;
  type: ClubRunType;
}

export interface ClubLastRunStats {
  showedUp: number;
  distanceKm?: number | null;
  location?: string | null;
  paceGroups?: string | null;
  after?: string | null;
}

export interface ClubLastRunPhoto {
  url: string;
  captionTitle?: string | null;
  captionMeta?: string | null;
}

export interface ClubLastRun {
  date: string;
  title: string;
  distanceKm?: number | null;
  type: ClubRunType;
  summary?: string | null;
  stats: ClubLastRunStats;
  photos: ClubLastRunPhoto[];
}

export interface ClubAdminPerson {
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  stravaUrl?: string | null;
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
  publishedAt: string | null;
  whatsappUrl: string | null;
  instagramUrl: string | null;
  stravaUrl: string | null;
  joinUrl: string | null;
  joinForm: JoinFormField[] | null;
  requiresApproval: boolean;
  stats: ClubStats;
  nextRun: ClubNextRun | null;
  upcomingRuns: ClubUpcomingRun[];
  lastRun: ClubLastRun | null;
  admins: ClubAdminPerson[];
  createdAt: string;
  updatedAt: string;
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
