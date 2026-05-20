/**
 * Typed client for the organiser-scoped backend endpoints.
 * Mirrors `src/lib/admin-api.ts` but targets the non-admin `/api/v1/...` paths.
 * The bearer token comes from `useAdminToken()` — same JWT, different routes.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

/** Shared between the wizard (writer) and the dashboard's resume banner (reader).
 *  Stored payload shape: { title?, currentStepId, currentStepLabel, updatedAt, ... }. */
export const ORGANISER_EVENT_DRAFT_KEY = 'organiser:event-draft';

export class OrganiserApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function orgFetch<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new OrganiserApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Organiser {
  id: string;
  userId: string;
  displayName: string;
  brandLogoUrl: string | null;
  bioMd: string | null;
  contactEmail: string;
  contactPhone: string | null;
  gstNumber: string | null;
  businessName: string | null;
  kycStatus: KycStatus;
  eventsPublishedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganiserCreate {
  displayName: string;
  brandLogoUrl?: string | null;
  bioMd?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  gstNumber?: string | null;
  businessName?: string | null;
}

export type OrganiserUpdate = Partial<OrganiserCreate>;

export type RegistrationFieldType =
  | 'text' | 'textarea' | 'select' | 'number'
  | 'date' | 'email' | 'phone' | 'multi_select';

export interface RegistrationFormField {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
  options?: string[] | null;
  placeholder?: string | null;
  helpText?: string | null;
  bindToUserField?: 'name' | 'phone' | 'email' | null;
}

export interface DistanceCategory {
  id?: string;
  categoryName: string;
  fullTitle: string | null;
  price: number | null;
  discountedPrice: number | null;
  currency: string | null;
  inclusions: string[] | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  categoryStartTime: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  maxParticipants: number | null;
  startTime: string | null;
  isActive: boolean;
}

export type EventFormat = 'virtual' | 'in_person';
export type EventStatus = 'draft' | 'pending_review' | 'live' | 'closed' | 'cancelled';

export interface OrganiserEvent {
  id: string;
  slug: string | null;
  title: string;
  organiserId: string | null;
  eventFormat: EventFormat;
  eventStatus: EventStatus;
  eventSourceType: string;
  coverImageUrl: string | null;
  imageUrl: string | null;
  galleryImages: string[] | null;
  descriptionMd: string | null;
  refundPolicyMd: string | null;
  termsMd: string | null;
  collectDob: boolean;
  collectGender: boolean;
  collectTshirt: boolean;
  tshirtSizes: string[] | null;
  collectAddress: boolean;
  requiresRunProof: boolean;
  shipsMedal: boolean;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  acceptingRegistrations: boolean;
  resultWindowStart: string | null;
  resultWindowEnd: string | null;
  bibPrefix: string | null;
  accentColor: string | null;
  autoRefundOnCancel: boolean;
  refundDeadlineDays: number | null;
  registrationForm: RegistrationFormField[] | null;
  distanceCategories: DistanceCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganiserEventListItem {
  id: string;
  slug: string | null;
  title: string;
  eventFormat: EventFormat;
  eventStatus: EventStatus;
  coverImageUrl: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  totalRegistrations: number;
  totalRevenuePaise: number;
}

export interface OrganiserEventListResponse {
  items: OrganiserEventListItem[];
  total: number;
}

export interface DistanceCategoryIn {
  id?: string;
  categoryName: string;
  fullTitle?: string | null;
  price: number;
  currency?: string;
  inclusions?: string[] | null;
  maxParticipants?: number | null;
  startTime?: string | null;
  isActive?: boolean;
}

export interface OrganiserEventCreate {
  title: string;
  slug: string;
  eventFormat: EventFormat;
  coverImageUrl?: string | null;
  galleryImages?: string[] | null;
  descriptionMd?: string | null;
  refundPolicyMd?: string | null;
  termsMd?: string | null;
  collectDob?: boolean;
  collectGender?: boolean;
  collectTshirt?: boolean;
  tshirtSizes?: string[] | null;
  collectAddress?: boolean;
  requiresRunProof?: boolean;
  shipsMedal?: boolean;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  acceptingRegistrations?: boolean;
  resultWindowStart?: string | null;
  resultWindowEnd?: string | null;
  bibPrefix?: string | null;
  accentColor?: string | null;
  autoRefundOnCancel?: boolean;
  refundDeadlineDays?: number | null;
  registrationForm?: RegistrationFormField[] | null;
  distanceCategories: DistanceCategoryIn[];
}

export type OrganiserEventUpdate = Partial<OrganiserEventCreate>;

export interface EventStatsByDistance {
  distanceCategoryId: string;
  name: string;
  count: number;
  revenuePaise: number;
}

export interface EventStats {
  registrationsCount: number;
  paidCount: number;
  verifiedCount: number;
  revenuePaise: number;
  discountPaise: number;
  refundPaise: number;
  byDistance: EventStatsByDistance[];
}

export interface Coupon {
  id: string;
  eventId: string;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  appliesToDistanceIds: string[] | null;
  status: 'active' | 'paused' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface CouponCreate {
  code: string;
  discountPercent: number;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  appliesToDistanceIds?: string[] | null;
  status?: 'active' | 'paused';
}

export type CouponUpdate = Partial<CouponCreate>;

export interface RegistrationRow {
  id: string;
  userId: string;
  eventId: string;
  distanceCategoryId: string | null;
  tshirtSize: string | null;
  shippingAddress: Record<string, unknown> | null;
  formData: Record<string, unknown> | null;
  amountPaid: number | null;
  currency: string | null;
  couponId: string | null;
  discountAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'free';
  registrationStatus: 'registered' | 'cancelled' | 'disqualified' | 'completed';
  resultStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  medalStatus: 'not_applicable' | 'pending' | 'dispatched' | 'delivered';
  bibNumber: string | null;
  createdAt: string;
  updatedAt: string;
  // backend merges these in for the dashboard rendering
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    gender: string | null;
    birthdate: string | null;
    city: string | null;
  };
}

export interface RegistrationListResponse {
  items: RegistrationRow[];
  total: number;
}

export interface RegistrationsFilters {
  paymentStatus?: string;
  resultStatus?: string;
  distanceId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Organiser profile ──────────────────────────────────────────────────────

export const onboardOrganiser = (token: string, body: OrganiserCreate) =>
  orgFetch<Organiser>(`/organisers`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getMyOrganiser = async (token: string): Promise<Organiser | null> => {
  try {
    return await orgFetch<Organiser>(`/organisers/me`, token);
  } catch (e) {
    if (e instanceof OrganiserApiError && e.status === 404) return null;
    throw e;
  }
};

export const updateMyOrganiser = (token: string, body: OrganiserUpdate) =>
  orgFetch<Organiser>(`/organisers/me`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// ── Organiser events ───────────────────────────────────────────────────────

export const listOrganiserEvents = (
  token: string,
  params: { status?: string; limit?: number; offset?: number } = {},
) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return orgFetch<OrganiserEventListResponse>(
    `/organiser/events${qs ? `?${qs}` : ''}`,
    token,
  );
};

export const getOrganiserEvent = (token: string, eventId: string) =>
  orgFetch<OrganiserEvent>(`/organiser/events/${eventId}`, token);

export const createOrganiserEvent = (token: string, body: OrganiserEventCreate) =>
  orgFetch<OrganiserEvent>(`/organiser/events`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateOrganiserEvent = (
  token: string,
  eventId: string,
  body: OrganiserEventUpdate,
) =>
  orgFetch<OrganiserEvent>(`/organiser/events/${eventId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const submitEventForReview = (token: string, eventId: string) =>
  orgFetch<OrganiserEvent>(`/organiser/events/${eventId}/submit`, token, {
    method: 'POST',
  });

export const getEventStats = (token: string, eventId: string) =>
  orgFetch<EventStats>(`/organiser/events/${eventId}/stats`, token);

export const listEventRegistrations = (
  token: string,
  eventId: string,
  filters: RegistrationsFilters = {},
) => {
  const q = new URLSearchParams();
  if (filters.paymentStatus) q.set('payment_status', filters.paymentStatus);
  if (filters.resultStatus) q.set('result_status', filters.resultStatus);
  if (filters.distanceId) q.set('distance_id', filters.distanceId);
  if (filters.search) q.set('search', filters.search);
  if (filters.limit != null) q.set('limit', String(filters.limit));
  if (filters.offset != null) q.set('offset', String(filters.offset));
  const qs = q.toString();
  return orgFetch<RegistrationListResponse>(
    `/organiser/events/${eventId}/registrations${qs ? `?${qs}` : ''}`,
    token,
  );
};

// ── Refunds ────────────────────────────────────────────────────────────────

export interface Refund {
  id: string;
  paymentId: string;
  razorpayRefundId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  reason: string | null;
  initiatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const initiateRefund = (
  token: string,
  eventId: string,
  registrationId: string,
  body: { amountPaise?: number; reason?: string },
) =>
  orgFetch<Refund>(
    `/organiser/events/${eventId}/registrations/${registrationId}/refund`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );

// ── Coupons ────────────────────────────────────────────────────────────────

export const listCoupons = (token: string, eventId: string) =>
  orgFetch<Coupon[]>(`/organiser/events/${eventId}/coupons`, token);

export const createCoupon = (token: string, eventId: string, body: CouponCreate) =>
  orgFetch<Coupon>(`/organiser/events/${eventId}/coupons`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateCoupon = (
  token: string,
  eventId: string,
  couponId: string,
  body: CouponUpdate,
) =>
  orgFetch<Coupon>(`/organiser/events/${eventId}/coupons/${couponId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteCoupon = (token: string, eventId: string, couponId: string) =>
  orgFetch<void>(`/organiser/events/${eventId}/coupons/${couponId}`, token, {
    method: 'DELETE',
  });

// ── Super-admin review (event_status transitions) ─────────────────────────

/** Slim shape from GET /admin/events/pending — backend returns the full
 *  EventResponse, but the studio review queue only needs these fields. */
export interface PendingReviewEvent {
  id: string;
  slug: string | null;
  title: string;
  eventFormat: 'virtual' | 'in_person' | null;
  coverImageUrl: string | null;
  imageUrl: string | null;
  description: string | null;
  organiserId: string | null;
  registrationOpenAt: string | null;
  createdAt: string;
}

export const listPendingReviewEvents = (token: string) =>
  orgFetch<PendingReviewEvent[]>(`/admin/events/pending`, token);

export const approveEvent = (token: string, eventId: string) =>
  orgFetch<OrganiserEvent>(`/admin/events/${eventId}/approve`, token, {
    method: 'POST',
  });

export const rejectEvent = (token: string, eventId: string, reason?: string) =>
  orgFetch<OrganiserEvent>(`/admin/events/${eventId}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });

// ── Mark registration as failed (organiser cleanup of stuck rows) ─────────

export interface CancelRegistrationResponse {
  id: string;
  paymentStatus: RegistrationRow['paymentStatus'];
  registrationStatus: RegistrationRow['registrationStatus'];
}

export const cancelRegistration = (
  token: string,
  eventId: string,
  registrationId: string,
  reason?: string,
) =>
  orgFetch<CancelRegistrationResponse>(
    `/organiser/events/${eventId}/registrations/${registrationId}/cancel`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
