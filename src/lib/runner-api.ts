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

// ── User profile (PUT /users/me) ──────────────────────────────────────────

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
  // Backend's UserUpdateRequest accepts these. Email stays signup-only
  // (not editable here); phone now has its own column on `users` and
  // flows through to Razorpay Checkout's prefill.contact.
  name?: string;
  phone?: string;
  birthdate?: string; // YYYY-MM-DD
  gender?: Gender | string;
}

export const getMe = (token: string) =>
  runnerFetch<MeProfile>('/users/me', token);

export const patchMe = (token: string, body: MeUpdate) =>
  runnerFetch<MeProfile>('/users/me', token, {
    method: 'PUT',
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

// Whole-order coupon preview for the group-booking cart (discount applies
// to the order subtotal across tiers, not a single distance).
export interface CouponAmountPreviewRequest {
  eventId: string;
  code: string;
  amountPaise: number;
}

export const previewCouponAmount = (
  token: string | null,
  body: CouponAmountPreviewRequest,
) =>
  runnerFetch<CouponPreviewResponse>('/coupons/preview-amount', token, {
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
  orderId: string; // Razorpay order id ('' when free)
  amount: number; // paise (0 when free)
  currency: string; // 'INR'
  keyId: string; // Razorpay public key ('' when free)
  prefill: { name: string; email: string; contact: string };
  // True when the registration was free (₹0 via 100%-off coupon) and is
  // already confirmed server-side — the client skips Razorpay checkout.
  free?: boolean;
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
  // Set when this registration is a group-booking line item — the entry
  // code lives on the booking, not a per-row bib.
  bookingCode?: string | null;
  event: {
    id: string;
    slug: string | null;
    title: string;
    category: string | null;
    coverImageUrl: string | null;
    eventFormat: 'virtual' | 'in_person';
    startTime: string | null;
    locationName: string | null;
    venueName: string | null;
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

// ── Group bookings (multi-ticket checkout) ────────────────────────────────

export interface BookingAttendeeInput {
  name: string;
  email: string;
  tshirtSize?: string | null;
  shippingAddress?: ShippingAddress | null;
  formData?: Record<string, unknown> | null;
}

export interface BookingItemInput {
  distanceCategoryId: string;
  attendees: BookingAttendeeInput[];
}

export interface BookingCreate {
  eventId: string;
  items: BookingItemInput[];
  couponCode?: string | null;
}

export interface BookingCreateResponse {
  bookingId: string;
  orderId: string; // Razorpay order id ('' when free)
  amount: number; // paise (order total; 0 when free)
  currency: string; // 'INR'
  keyId: string; // Razorpay public key ('' when free)
  prefill: { name: string; email: string; contact: string };
  // True when the booking was free (₹0 via 100%-off coupon) and is already
  // confirmed server-side — the client skips Razorpay checkout.
  free?: boolean;
}

export interface BookingConfirmRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface MyBookingAttendee {
  id: string;
  distanceCategoryId: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  tshirtSize: string | null;
  amountPaid: number | null;
  paymentStatus: PaymentStatus;
  distance: { id: string; categoryName: string; fullTitle: string | null } | null;
}

export interface MyBookingItem {
  id: string;
  userId: string;
  eventId: string;
  couponId: string | null;
  subtotalPaise: number;
  discountAmount: number;
  totalPaise: number;
  currency: string;
  paymentStatus: PaymentStatus;
  bookingCode: string | null;
  ticketCount: number;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    slug: string | null;
    title: string;
    category: string | null;
    coverImageUrl: string | null;
    eventFormat: 'virtual' | 'in_person';
    startTime: string | null;
    locationName: string | null;
    venueName: string | null;
  } | null;
  attendees: MyBookingAttendee[];
}

export const createBooking = (token: string, body: BookingCreate) =>
  runnerFetch<BookingCreateResponse>('/bookings', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const confirmBooking = (
  token: string,
  bookingId: string,
  body: BookingConfirmRequest,
) =>
  runnerFetch<unknown>(
    `/bookings/${encodeURIComponent(bookingId)}/confirm`,
    token,
    { method: 'POST', body: JSON.stringify(body) },
  );

export const getMyBooking = (token: string, bookingId: string) =>
  runnerFetch<MyBookingItem>(
    `/bookings/${encodeURIComponent(bookingId)}`,
    token,
  );
