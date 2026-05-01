export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

async function parseError(res: Response): Promise<never> {
  let detail: unknown = undefined;
  let message = res.statusText;
  try {
    const body = await res.json();
    detail = body?.detail ?? body;
    if (typeof detail === 'string') message = detail;
    else if (detail && typeof detail === 'object' && 'message' in detail) {
      message = String((detail as { message: unknown }).message);
    }
  } catch {
    /* non-JSON body */
  }
  throw new ApiError(res.status, message, detail);
}

async function api<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  city: string | null;
  authProvider: 'google' | 'email';
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface OtpResponse {
  message: string;
}

export interface DistanceCategory {
  id: string;
  categoryName: string;
  status: string | null;
  fullTitle: string | null;
  price: number | null;
  discountedPrice: number | null;
  couponCode: string | null;
  currency: string | null;
  inclusions: string[] | null;
  categoryStartTime: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
}

export interface Event {
  id: string;
  slug: string | null;
  source: string;
  sourceId: string;
  title: string;
  description: string | null;
  fullDescription: string | null;
  category: string;
  imageUrl: string | null;
  galleryImages: string[] | null;
  locationName: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  startTime: string;
  endTime: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  maxParticipants: number | null;
  totalTicketsSold: number | null;
  priceMin: number | null;
  currency: string | null;
  eventType: string | null;
  sportsType: string | null;
  website: string | null;
  registrationUrl: string | null;
  registrationEndDate: string | null;
  venueName: string | null;
  soldOut: boolean;
  isFeatured: boolean;
  avgRating: number | null;
  visibility: string;
  eventStatus: string;
  eventSourceType: string;
  pace: string | null;
  distanceCategories: DistanceCategory[];
  isGoing: boolean;
  goingCount: number;
  participantStatus: string | null;
  // Coupon (auth-gated):
  couponCode: string | null;
  couponDiscountPercent: number | null;
  hasCoupon: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    api<OtpResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  verifyOtp: (email: string, otp: string) =>
    api<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string) =>
    api<OtpResponse>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  google: (idToken: string) =>
    api<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  forgotPassword: (email: string) =>
    api<OtpResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api<OtpResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),
};

// ─── Events ───────────────────────────────────────────────────────────────

export const eventsApi = {
  getBySlug: (slug: string, token?: string) =>
    api<Event>(`/events/by-slug/${encodeURIComponent(slug)}`, { token }),

  getById: (id: string, token?: string) =>
    api<Event>(`/events/${id}`, { token }),
};

// ─── Clubs (membership + RSVP) ────────────────────────────────────────────

export type MyMembershipStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'removed'
  | 'rejected';

export type ClubRole = 'owner' | 'admin' | 'member';

export interface MyMembership {
  status: MyMembershipStatus;
  role: ClubRole | null;
  requestId: string | null;
  joinedAt: string | null;
}

export interface JoinClubResponse {
  status: 'pending' | 'active';
  requestId: string | null;
}

export interface RsvpToggleResponse {
  rsvp: {
    id: string;
    clubEventId: string;
    userId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  goingCount: number;
}

export interface ClubSummary {
  slug: string;
  name: string;
  city: string;
}

export const clubsApi = {
  getMyMembership: (slug: string, token: string) =>
    api<MyMembership>(`/clubs/${encodeURIComponent(slug)}/my-membership`, {
      token,
    }),

  /**
   * Returns clubs the user is an active member of. `role=all` includes
   * regular members; `role=admin` (default on the backend) only returns
   * clubs the user can manage.
   */
  listMyClubs: (token: string, role: 'all' | 'admin' = 'all') =>
    api<ClubSummary[]>(`/clubs/mine?role=${role}`, { token }),

  joinClub: (
    slug: string,
    formData: Record<string, unknown> | null,
    token: string,
  ) =>
    api<JoinClubResponse>(`/clubs/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
      body: JSON.stringify({ formData }),
      token,
    }),

  leaveClub: (slug: string, token: string) =>
    api<void>(`/clubs/${encodeURIComponent(slug)}/leave`, {
      method: 'DELETE',
      token,
    }),

  cancelJoinRequest: (slug: string, token: string) =>
    api<void>(`/clubs/${encodeURIComponent(slug)}/join-request`, {
      method: 'DELETE',
      token,
    }),

  rsvp: (slug: string, eventId: string, token: string) =>
    api<RsvpToggleResponse>(
      `/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/rsvp`,
      { method: 'POST', token },
    ),

  cancelRsvp: (slug: string, eventId: string, token: string) =>
    api<void>(
      `/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/rsvp`,
      { method: 'DELETE', token },
    ),
};
