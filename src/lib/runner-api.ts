/**
 * Typed client for the runner-facing backend endpoints (paid event
 * registration, my events). Mirrors the `organiser-api.ts` pattern.
 *
 * The bearer token is the user's JWT, sourced from `useAdminToken()` on
 * the client (which falls back to `useStudioAuth()` → marketing session
 * cookie). All endpoints live under `/api/v1`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

export class RunnerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function runnerFetch<T = unknown>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new RunnerApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── User profile (PATCH /users/me) ────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface MeProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  birthdate: string | null; // ISO date (YYYY-MM-DD)
  gender: Gender | string | null;
  pictureUrl: string | null;
  city: string | null;
}

export interface MeUpdate {
  name?: string;
  email?: string;
  phone?: string;
  birthdate?: string; // YYYY-MM-DD
  gender?: Gender | string;
}

export const getMe = (token: string) =>
  runnerFetch<MeProfile>('/users/me', token);

export const patchMe = (token: string, body: MeUpdate) =>
  runnerFetch<MeProfile>('/users/me', token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// ── Coupons (preview) ─────────────────────────────────────────────────────

export interface CouponPreviewRequest {
  eventId: string;
  distanceCategoryId: string;
  code: string;
}

export interface CouponPreviewResponse {
  valid: boolean;
  error?: string | null;
  couponId?: string | null;
  code?: string | null;
  discountPercent?: number | null;
  basePricePaise?: number | null;
  discountPaise?: number | null;
  finalPricePaise?: number | null;
  currency?: string | null;
}

export const previewCoupon = (token: string | null, body: CouponPreviewRequest) =>
  runnerFetch<CouponPreviewResponse>('/coupons/preview', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ── Registrations ─────────────────────────────────────────────────────────

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface RegistrationCreate {
  eventId: string;
  distanceCategoryId: string;
  formData?: Record<string, unknown> | null;
  tshirtSize?: string | null;
  shippingAddress?: ShippingAddress | null;
  couponCode?: string | null;
}

export interface RegistrationCreateResponse {
  registrationId: string;
  orderId: string; // Razorpay order id
  amount: number; // paise
  currency: string; // 'INR'
  keyId: string; // Razorpay public key
  prefill: { name: string; email: string; contact: string };
}

export interface RegistrationConfirmRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'free';
export type RegistrationStatus =
  | 'registered'
  | 'cancelled'
  | 'disqualified'
  | 'completed';
export type ResultStatus =
  | 'not_submitted'
  | 'submitted'
  | 'verified'
  | 'rejected';
export type MedalStatus =
  | 'not_applicable'
  | 'pending'
  | 'dispatched'
  | 'delivered';

export interface RegistrationOut {
  id: string;
  userId: string;
  eventId: string;
  distanceCategoryId: string | null;
  tshirtSize: string | null;
  shippingAddress: ShippingAddress | null;
  formData: Record<string, unknown> | null;
  amountPaid: number | null;
  currency: string | null;
  couponId: string | null;
  discountAmount: number;
  paymentStatus: PaymentStatus;
  registrationStatus: RegistrationStatus;
  resultStatus: ResultStatus;
  medalStatus: MedalStatus;
  bibNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyRegistrationItem extends RegistrationOut {
  event: {
    id: string;
    slug: string | null;
    title: string;
    coverImageUrl: string | null;
    eventFormat: 'virtual' | 'in_person';
    resultWindowStart: string | null;
    resultWindowEnd: string | null;
  };
  distance: {
    id: string;
    categoryName: string;
    fullTitle: string | null;
  } | null;
}

export interface MyRegistrationsResponse {
  items: MyRegistrationItem[];
  total: number;
}

export const createRegistration = (token: string, body: RegistrationCreate) =>
  runnerFetch<RegistrationCreateResponse>('/registrations', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const confirmRegistration = (
  token: string,
  registrationId: string,
  body: RegistrationConfirmRequest,
) =>
  runnerFetch<RegistrationOut>(
    `/registrations/${encodeURIComponent(registrationId)}/confirm`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

export const getMyRegistrations = (token: string) =>
  runnerFetch<MyRegistrationsResponse>('/me/registrations', token);

export const getMyRegistration = (token: string, registrationId: string) =>
  runnerFetch<MyRegistrationItem>(
    `/registrations/${encodeURIComponent(registrationId)}`,
    token,
  );
