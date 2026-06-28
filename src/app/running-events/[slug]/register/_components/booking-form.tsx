'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import type { DistanceCategory, Event } from '@/lib/api';
import type { OrganiserEvent, RegistrationFormField } from '@/lib/organiser-api';
import type {
  AppliedCoupon as AmountAppliedCoupon,
} from './coupon-input';
import type { BookingItemInput, ShippingAddress } from '@/lib/runner-api';
import {
  describeRunnerError,
  useConfirmBooking,
  useCreateBooking,
  useMe,
  useMyRegistrations,
  usePatchMe,
  usePreviewCouponAmount,
} from '@/lib/runner-hooks';
import {
  ProfileGate,
  missingProfileFields,
  profileDraftFromMe,
  type ProfileDraft,
} from './profile-gate';
import { pickActiveDistances } from './distance-picker';
import {
  CustomQuestions,
  validateCustomQuestions,
  type CustomFormData,
} from './custom-questions';
import {
  EMPTY_SHIPPING,
  ShippingAddressFields,
  validateShipping,
} from './shipping-address';
import { isRazorpayLoaded, openRazorpayCheckout } from './razorpay-checkout';
import { eventPath } from '@/lib/event-path';
import { AlreadyRegisteredView, type RegistrationEventBundle } from './registration-form';

/**
 * Group-booking (multi-ticket) registration flow. Rendered by the register
 * page when `event.allowGroupBooking` is true. One buyer picks quantities
 * across tiers, fills in each attendee's details, and pays a single Razorpay
 * order for the whole cart. Coupons apply to the order total. The
 * single-registration `RegistrationForm` is used for all other events.
 */

const MAX_PER_TIER = 10;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface AttendeeDraft {
  name: string;
  email: string;
  tshirt: string;
  custom: CustomFormData;
  shipping: ShippingAddress;
}

function emptyAttendee(): AttendeeDraft {
  return { name: '', email: '', tshirt: '', custom: {}, shipping: { ...EMPTY_SHIPPING } };
}

function unitRupees(d: DistanceCategory): number {
  return d.discountedPrice ?? d.price ?? 0;
}

function fmtRupeesMajor(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtRupeesPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function BookingForm({ bundle }: { bundle: RegistrationEventBundle }) {
  const router = useRouter();
  const { event, extras } = bundle;
  const distances = useMemo(
    () => pickActiveDistances(event.distanceCategories),
    [event.distanceCategories],
  );
  const customFields: RegistrationFormField[] = useMemo(
    () => extras.registrationForm ?? [],
    [extras.registrationForm],
  );
  const needsShipping = !!(extras.collectAddress || extras.shipsMedal);
  const needsTshirt = !!extras.collectTshirt;
  const tshirtSizes = extras.tshirtSizes ?? [];

  const meQ = useMe();
  const patchMeMut = usePatchMe();
  const createBooking = useCreateBooking();
  const confirmBooking = useConfirmBooking();
  const previewCoupon = usePreviewCouponAmount();
  // Group bookings create one EventRegistration per attendee, so a buyer who
  // already booked shows up in my-registrations — same guard as the single
  // flow, so we send them to their confirmation instead of the booking form.
  const myRegsQ = useMyRegistrations();

  // Cart: tier id → attendee drafts (array length === quantity).
  const [cart, setCart] = useState<Record<string, AttendeeDraft[]>>({});
  const [profile, setProfile] = useState<ProfileDraft>(profileDraftFromMe(null));
  const [coupon, setCoupon] = useState<AmountAppliedCoupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  type PayPhase = 'idle' | 'saving_profile' | 'creating_order' | 'opening_modal';
  const [payPhase, setPayPhase] = useState<PayPhase>('idle');
  const submitting = payPhase !== 'idle';
  const [formError, setFormError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(() => isRazorpayLoaded());

  const missing = useMemo(() => missingProfileFields(meQ.data), [meQ.data]);

  useEffect(() => {
    if (meQ.data) setProfile(profileDraftFromMe(meQ.data));
  }, [meQ.data]);

  // ── Cart maths ────────────────────────────────────────────────────────
  const lineItems = useMemo(
    () =>
      distances
        .map((d) => ({ d, qty: cart[d.id!]?.length ?? 0 }))
        .filter((l) => l.qty > 0),
    [distances, cart],
  );
  const ticketCount = lineItems.reduce((n, l) => n + l.qty, 0);
  const subtotalPaise = lineItems.reduce(
    (sum, l) => sum + Math.round(unitRupees(l.d) * 100) * l.qty,
    0,
  );
  const discountPaise = coupon?.preview.discountPaise ?? 0;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise);

  // Re-validate / clear the coupon whenever the subtotal changes — the
  // discount is computed against the order total, so a cart edit invalidates
  // a previously-applied code.
  useEffect(() => {
    if (coupon) {
      setCoupon(null);
      setCouponError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalPaise]);

  const setQty = (tierId: string, qty: number) => {
    setCart((prev) => {
      const current = prev[tierId] ?? [];
      const next = current.slice(0, qty);
      while (next.length < qty) next.push(emptyAttendee());
      return { ...prev, [tierId]: next };
    });
  };

  const updateAttendee = (
    tierId: string,
    idx: number,
    patch: Partial<AttendeeDraft>,
  ) => {
    setCart((prev) => {
      const arr = (prev[tierId] ?? []).slice();
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [tierId]: arr };
    });
  };

  const applyMyDetails = (tierId: string, idx: number) => {
    updateAttendee(tierId, idx, {
      name: meQ.data?.name ?? '',
      email: meQ.data?.email ?? '',
    });
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    const trimmed = couponCode.trim();
    if (!trimmed) {
      setCouponError('Enter a coupon code.');
      return;
    }
    if (subtotalPaise <= 0) {
      setCouponError('Add a ticket first.');
      return;
    }
    try {
      const res = await previewCoupon.mutateAsync({
        eventId: event.id,
        code: trimmed,
        amountPaise: subtotalPaise,
      });
      if (!res.valid) {
        setCouponError(res.error || 'Coupon is not valid.');
        return;
      }
      setCoupon({ code: res.code || trimmed, preview: res });
      toast.success('Coupon applied');
    } catch (e) {
      setCouponError(describeRunnerError(e));
    }
  };

  const friendlyError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes('sold out')) return 'One of these ticket types just sold out — adjust quantities and try again.';
    if (m.includes('not open') || m.includes('not accepting'))
      return 'Booking isn’t open for this event right now.';
    if (m.includes('not found')) return 'This event or ticket type couldn’t be found. Try refreshing.';
    if (m.includes('signature')) return 'Payment signature didn’t verify. Try again, and if it keeps happening contact support.';
    return raw;
  };

  const fail = (msg: string) => {
    setFormError(msg);
    setPayPhase('idle');
  };

  const validate = (): string | null => {
    if (ticketCount === 0) return 'Add at least one ticket to continue.';
    const stillMissing = profileDraftValidate(profile, missing);
    if (stillMissing) return `Please fill in ${stillMissing} (the booker’s details).`;
    for (const { d, qty } of lineItems) {
      const arr = cart[d.id!] ?? [];
      for (let i = 0; i < qty; i++) {
        const a = arr[i];
        const who = `${d.categoryName} · ticket ${i + 1}`;
        if (!a.name.trim()) return `Enter a name for ${who}.`;
        if (!EMAIL_RE.test(a.email.trim())) return `Enter a valid email for ${who}.`;
        if (needsTshirt && tshirtSizes.length > 0 && !a.tshirt)
          return `Pick a T-shirt size for ${who}.`;
        const customCheck = validateCustomQuestions(customFields, a.custom);
        if (!customCheck.ok) return `Answer the required questions for ${who}.`;
        if (needsShipping) {
          const s = validateShipping(a.shipping);
          if (!s.ok) return `${who}: ${s.reason}`;
        }
      }
    }
    return null;
  };

  const buildItems = (): BookingItemInput[] =>
    lineItems.map(({ d }) => ({
      distanceCategoryId: d.id!,
      attendees: (cart[d.id!] ?? []).map((a) => ({
        name: a.name.trim(),
        email: a.email.trim(),
        tshirtSize: needsTshirt ? a.tshirt || null : null,
        shippingAddress: needsShipping ? a.shipping : null,
        formData: customFields.length > 0 ? a.custom : null,
      })),
    }));

  const onSubmit = async () => {
    if (submitting) return;
    setFormError(null);

    const err = validate();
    if (err) {
      fail(err);
      return;
    }

    setPayPhase('saving_profile');
    try {
      if (missing.length > 0) {
        const update: Record<string, string> = {};
        for (const m of missing) {
          const v = profile[m];
          if (typeof v === 'string' && v.trim()) update[m] = v.trim();
        }
        if (Object.keys(update).length > 0) {
          await patchMeMut.mutateAsync(update);
        }
      }

      setPayPhase('creating_order');
      const created = await createBooking.mutateAsync({
        eventId: event.id,
        items: buildItems(),
        couponCode: coupon?.code ?? null,
      });

      // Free booking (₹0 — 100%-off coupon): already confirmed server-side,
      // no Razorpay order. Skip checkout → success.
      if (created.free) {
        toast.success('You’re in — it’s on the house!');
        router.push(
          `${eventPath(event, '/register/success')}?booking=${encodeURIComponent(created.bookingId)}`,
        );
        return;
      }

      if (!isRazorpayLoaded()) {
        fail('Payment SDK is still loading. Give it a few seconds and try again.');
        return;
      }

      setPayPhase('opening_modal');
      const result = await openRazorpayCheckout({
        keyId: created.keyId,
        orderId: created.orderId,
        amount: created.amount,
        currency: created.currency,
        name: 'Endorfin',
        description: `${event.title} · ${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`,
        prefill: created.prefill,
        themeColor: '#0A0A0A',
      });

      if (!result.ok) {
        if (result.reason === 'dismissed') {
          setFormError(
            'Payment cancelled. Hit Pay again to retry — we’ll create a fresh order.',
          );
          setPayPhase('idle');
        } else {
          const msg =
            (result.error as { error?: { description?: string } } | undefined)
              ?.error?.description ||
            (result.error instanceof Error ? result.error.message : null) ||
            'Payment failed at Razorpay. Try a different card or wait a minute.';
          fail(msg);
        }
        return;
      }

      // Fire-and-forget confirm — the success page polls /bookings/{id} and
      // the webhook also marks it paid, so we converge regardless.
      void confirmBooking
        .mutateAsync({
          bookingId: created.bookingId,
          body: {
            razorpayPaymentId: result.payload.razorpay_payment_id,
            razorpayOrderId: result.payload.razorpay_order_id,
            razorpaySignature: result.payload.razorpay_signature,
          },
        })
        .catch((e) => {
          console.warn('Booking confirm failed; webhook will reconcile', e);
        });

      toast.success('Payment received — confirming…');
      router.push(
        `${eventPath(event, '/register/success')}?booking=${encodeURIComponent(created.bookingId)}`,
      );
    } catch (e) {
      fail(friendlyError(describeRunnerError(e)));
    }
  };

  if (distances.length === 0) {
    return (
      <div className="bg-white border border-jet/10 rounded-2xl p-6">
        <p className="font-display uppercase text-base font-bold text-jet">
          Booking not open yet
        </p>
        <p className="text-sm text-jet/70 mt-2">
          There are no active ticket types for this event right now. Check back
          soon or contact the organiser.
        </p>
        <Link
          href={eventPath(event)}
          className="mt-4 inline-block text-sm text-signal hover:underline"
        >
          ← Back to event
        </Link>
      </div>
    );
  }

  const payLabel = !sdkReady
    ? 'Loading payment…'
    : payPhase === 'saving_profile'
      ? 'Saving details…'
      : payPhase === 'creating_order'
        ? 'Creating order…'
        : payPhase === 'opening_modal'
          ? 'Opening payment…'
          : ticketCount === 0
            ? 'Add a ticket'
            : totalPaise === 0
              ? `Get ${ticketCount === 1 ? 'ticket' : 'tickets'} free`
              : `Pay ${fmtRupeesPaise(totalPaise)}`;

  // Already booked? Show their confirmation instead of the booking form.
  // Held in a loading state first so the form doesn't flash before the swap.
  const existingReg = myRegsQ.data?.items.find(
    (r) =>
      r.eventId === event.id &&
      r.registrationStatus !== 'cancelled' &&
      (r.paymentStatus === 'paid' || r.paymentStatus === 'free'),
  );
  if (myRegsQ.isLoading) {
    return (
      <div className="max-w-md mx-auto py-24 text-center text-sm text-jet/45">
        Loading…
      </div>
    );
  }
  if (existingReg) {
    return <AlreadyRegisteredView reg={existingReg} eventSlug={event.slug || event.id} />;
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onReady={() => setSdkReady(true)}
      />

      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest text-signal mb-2 font-semibold">
          Book tickets
        </p>
        <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight text-jet mb-2">
          {event.title}
        </h1>
        <p className="text-sm text-jet/60 max-w-2xl">
          {event.locationName ? `${event.locationName} · ` : ''}Pick how many
          tickets you need, add each guest’s details, and pay once. Secured by
          Razorpay.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="min-w-0"
        >
          <fieldset
            disabled={submitting}
            className={`contents ${submitting ? 'opacity-60' : ''}`}
          >
            <ProfileGate draft={profile} setDraft={setProfile} missing={missing} />

            {/* Ticket picker — quantity per tier */}
            <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
              <div className="mb-4">
                <p className="font-display uppercase text-sm font-bold text-jet">
                  Choose tickets
                </p>
                <p className="text-xs text-jet/60 mt-0.5">
                  Mix and match across types. Prices are inclusive of taxes.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {distances.map((d) => {
                  const id = d.id!;
                  const qty = cart[id]?.length ?? 0;
                  const cap = d.maxParticipants ?? MAX_PER_TIER;
                  const max = Math.min(cap, MAX_PER_TIER);
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border p-4 transition-colors ${
                        qty > 0 ? 'border-signal/40 bg-signal/[0.02]' : 'border-jet/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display uppercase text-base font-bold text-jet">
                            {d.categoryName}
                          </p>
                          {d.fullTitle && (
                            <p className="text-xs text-jet/60 mt-0.5">{d.fullTitle}</p>
                          )}
                          {d.inclusions && d.inclusions.length > 0 && (
                            <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1">
                              {d.inclusions.map((inc, i) => (
                                <li key={i} className="text-xs text-jet/70 flex items-baseline gap-1.5">
                                  <span aria-hidden className="text-signal">•</span>
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-display uppercase text-sm font-bold text-jet whitespace-nowrap">
                            {fmtRupeesMajor(unitRupees(d))}
                          </span>
                          {d.discountedPrice != null &&
                            d.price != null &&
                            d.price !== d.discountedPrice && (
                              <span className="ml-2 text-jet/40 line-through text-xs">
                                {fmtRupeesMajor(d.price)}
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <QtyStepper
                          value={qty}
                          max={max}
                          onChange={(n) => setQty(id, n)}
                        />
                        {qty > 0 && (
                          <span className="text-xs text-jet/60">
                            {fmtRupeesMajor(unitRupees(d) * qty)} for {qty}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Attendee details — one block per ticket */}
            {lineItems.map(({ d, qty }) => (
              <div key={d.id} className="mb-4">
                {Array.from({ length: qty }).map((_, i) => {
                  const a = cart[d.id!]?.[i] ?? emptyAttendee();
                  return (
                    <section
                      key={`${d.id}-${i}`}
                      className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-3"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-display uppercase text-sm font-bold text-jet">
                          {d.categoryName} · Ticket {i + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => applyMyDetails(d.id!, i)}
                          className="text-[11px] text-signal hover:underline"
                        >
                          Use my details
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
                            Full name *
                          </span>
                          <input
                            type="text"
                            value={a.name}
                            onChange={(e) => updateAttendee(d.id!, i, { name: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet focus:border-jet outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
                            Email *
                          </span>
                          <input
                            type="email"
                            value={a.email}
                            onChange={(e) => updateAttendee(d.id!, i, { email: e.target.value })}
                            autoComplete="email"
                            className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet focus:border-jet outline-none"
                          />
                        </label>
                      </div>

                      {needsTshirt && tshirtSizes.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[11px] uppercase tracking-wider text-jet/60 mb-2">
                            T-shirt size *
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tshirtSizes.map((s) => {
                              const selected = a.tshirt === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateAttendee(d.id!, i, { tshirt: s })}
                                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                                    selected
                                      ? 'bg-jet text-bone border-jet'
                                      : 'bg-white text-jet border-jet/15 hover:border-jet/40'
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {customFields.length > 0 && (
                        <div className="mt-4">
                          <CustomQuestions
                            fields={customFields}
                            values={a.custom}
                            onChange={(next) => updateAttendee(d.id!, i, { custom: next })}
                          />
                        </div>
                      )}

                      {needsShipping && (
                        <div className="mt-4">
                          <ShippingAddressFields
                            value={a.shipping}
                            onChange={(next) => updateAttendee(d.id!, i, { shipping: next })}
                            title={extras.shipsMedal ? 'Medal shipping address' : 'Shipping address'}
                          />
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ))}
          </fieldset>
        </form>

        <aside className="lg:sticky lg:top-24">
          <section className="bg-jet text-bone rounded-2xl p-5 md:p-6">
            <p className="font-display uppercase text-sm font-bold mb-4">
              Order summary
            </p>
            {lineItems.length === 0 ? (
              <p className="text-sm text-bone/60">No tickets selected yet.</p>
            ) : (
              <dl className="text-sm space-y-2">
                {lineItems.map(({ d, qty }) => (
                  <div key={d.id} className="flex justify-between gap-3">
                    <dt className="text-bone/70 min-w-0 truncate">
                      {d.categoryName} × {qty}
                    </dt>
                    <dd className="font-medium whitespace-nowrap">
                      {fmtRupeesMajor(unitRupees(d) * qty)}
                    </dd>
                  </div>
                ))}
                <div className="border-t border-bone/15 pt-2 mt-2 flex justify-between">
                  <dt className="text-bone/70">Subtotal</dt>
                  <dd className="font-medium">{fmtRupeesPaise(subtotalPaise)}</dd>
                </div>
                {discountPaise > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-bone/70">
                      Discount
                      {coupon?.preview.discountPercent != null && (
                        <span className="text-bone/50"> ({coupon.preview.discountPercent}%)</span>
                      )}
                    </dt>
                    <dd className="text-emerald-300 font-medium">−{fmtRupeesPaise(discountPaise)}</dd>
                  </div>
                )}
                <div className="border-t border-bone/15 pt-3 mt-3 flex justify-between text-base">
                  <dt className="font-display uppercase">Total</dt>
                  <dd className="font-display uppercase font-bold">{fmtRupeesPaise(totalPaise)}</dd>
                </div>
              </dl>
            )}

            {/* Whole-order coupon */}
            {ticketCount > 0 && (
              <div className="mt-3">
                {coupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-bone tracking-wider">{coupon.code}</p>
                      {coupon.preview.discountPercent != null && (
                        <p className="text-[11px] text-bone/60">
                          {coupon.preview.discountPercent}% off applied
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCoupon(null);
                        setCouponCode('');
                      }}
                      className="text-[11px] text-bone/70 hover:text-bone underline whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="COUPON CODE"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bone/5 border border-bone/15 text-sm text-bone placeholder-bone/30 uppercase tracking-wider focus:border-bone/40 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={previewCoupon.isPending}
                        className="px-3 py-2 rounded-lg bg-bone text-jet text-sm font-medium hover:bg-white disabled:opacity-50"
                      >
                        {previewCoupon.isPending ? '…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-signal mt-1.5" role="alert">
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-signal/50 bg-signal/15 px-3 py-2 text-sm text-bone flex items-start gap-2"
              >
                <span aria-hidden>⚠</span>
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={ticketCount === 0 || !sdkReady || submitting}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-signal text-bone text-sm font-display uppercase font-bold tracking-wider hover:bg-signal/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
              )}
              {payLabel}
            </button>
            <p className="mt-3 text-[11px] text-bone/50 leading-relaxed">
              By registering you agree to the terms &amp; conditions mentioned{' '}
              <a
                href={eventPath(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-bone"
              >
                here
              </a>
              .
            </p>
          </section>
          <p className="mt-3 text-xs text-jet/50 text-center">
            <Link href={eventPath(event)} className="hover:underline">
              ← Back to event details
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}

function QtyStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-jet/15 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label="Decrease quantity"
        className="px-3 py-1.5 text-jet hover:bg-jet/5 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-medium text-jet tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="px-3 py-1.5 text-jet hover:bg-jet/5 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

function profileDraftValidate(
  draft: ProfileDraft,
  missing: ('name' | 'phone' | 'birthdate' | 'gender')[],
): string | null {
  for (const key of missing) {
    const v = draft[key];
    if (typeof v !== 'string' || !v.trim()) {
      switch (key) {
        case 'name':
          return 'your full name';
        case 'phone':
          return 'your phone number';
        case 'birthdate':
          return 'your date of birth';
        case 'gender':
          return 'your gender';
      }
    }
    if (key === 'phone' && !/^\d{10}$/.test(draft.phone.trim())) {
      return 'a 10-digit phone number';
    }
  }
  return null;
}
