'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import type { Event } from '@/lib/api';
import type {
  OrganiserEvent,
  RegistrationFormField,
} from '@/lib/organiser-api';
import {
  describeRunnerError,
  useConfirmRegistration,
  useCreateRegistration,
  useMe,
  usePatchMe,
} from '@/lib/runner-hooks';
import type { ShippingAddress } from '@/lib/runner-api';
import {
  missingProfileFields,
  ProfileGate,
  profileDraftFromMe,
  type ProfileDraft,
} from './profile-gate';
import {
  DistancePicker,
  pickActiveDistances,
} from './distance-picker';
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
import { CouponInput, type AppliedCoupon } from './coupon-input';
import { OrderSummary, deriveTotals } from './order-summary';
import {
  isRazorpayLoaded,
  openRazorpayCheckout,
} from './razorpay-checkout';

/**
 * The runner-facing registration form. Receives the public event from the
 * server page (so the JSON-LD / cover image / distances are SSR'd) plus the
 * organiser-shaped extras (`registrationForm`, `collectTshirt`, `tshirtSizes`,
 * `collectAddress`, `shipsMedal`) that the public `eventsApi.getBySlug`
 * already returns — we just narrow to the subset we need.
 */
export interface RegistrationEventBundle {
  // Public event payload (for header copy + distances).
  event: Event;
  // Organiser-side fields the public endpoint also exposes for owned events.
  // We accept partials so this can be wired up regardless of whether Stream C
  // surfaces the organiser shape on /events/by-slug or on a separate fetch.
  extras: Pick<
    OrganiserEvent,
    | 'collectTshirt'
    | 'tshirtSizes'
    | 'collectAddress'
    | 'shipsMedal'
    | 'registrationForm'
  >;
}

export function RegistrationForm({ bundle }: { bundle: RegistrationEventBundle }) {
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

  // ── Form state ──────────────────────────────────────────────────────────
  const meQ = useMe();
  const patchMeMut = usePatchMe();
  const [distanceId, setDistanceId] = useState<string | null>(
    distances.length === 1 ? distances[0].id ?? null : null,
  );
  const [profile, setProfile] = useState<ProfileDraft>(profileDraftFromMe(null));
  const [customData, setCustomData] = useState<CustomFormData>({});
  const [tshirt, setTshirt] = useState<string>('');
  const [shipping, setShipping] = useState<ShippingAddress>(EMPTY_SHIPPING);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate the profile draft once /users/me lands.
  useEffect(() => {
    if (meQ.data) {
      setProfile(profileDraftFromMe(meQ.data));
      setShipping((prev) =>
        prev.name || prev.phone
          ? prev
          : {
              ...prev,
              name: meQ.data?.name ?? '',
              phone: meQ.data?.phone ?? '',
            },
      );
    }
  }, [meQ.data]);

  const missing = useMemo(() => missingProfileFields(meQ.data), [meQ.data]);

  const createReg = useCreateRegistration();
  const confirmReg = useConfirmRegistration(null);

  const selectedDistance = useMemo(
    () => distances.find((d) => d.id === distanceId) ?? null,
    [distances, distanceId],
  );

  const needsShipping = !!(extras.collectAddress || extras.shipsMedal);
  const needsTshirt = !!extras.collectTshirt;
  const tshirtSizes = extras.tshirtSizes ?? [];

  const onSubmit = async () => {
    if (submitting) return;

    // 1. Distance
    if (!distanceId) {
      toast.error('Pick a distance to continue.');
      return;
    }
    // 2. Profile completeness — validate the inline draft.
    const stillMissing = profileDraftValidate(profile, missing);
    if (stillMissing) {
      toast.error(`Please fill in ${stillMissing}.`);
      return;
    }
    // 3. Custom questions
    const customCheck = validateCustomQuestions(customFields, customData);
    if (!customCheck.ok) {
      toast.error('Please answer the required questions.');
      // Scroll to the first missing field for orientation.
      const el = document.getElementById(`field-${customCheck.firstMissingId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // 4. T-shirt
    if (needsTshirt && tshirtSizes.length > 0 && !tshirt) {
      toast.error('Please pick a T-shirt size.');
      return;
    }
    // 5. Shipping
    if (needsShipping) {
      const s = validateShipping(shipping);
      if (!s.ok) {
        toast.error(s.reason);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Save profile if we collected any missing fields.
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

      const created = await createReg.mutateAsync({
        eventId: event.id,
        distanceCategoryId: distanceId,
        formData: customFields.length > 0 ? customData : null,
        tshirtSize: needsTshirt ? tshirt || null : null,
        shippingAddress: needsShipping ? shipping : null,
        couponCode: coupon?.code ?? null,
      });

      if (!isRazorpayLoaded()) {
        toast.error('Payment SDK is still loading. Give it a second and try again.');
        setSubmitting(false);
        return;
      }

      const result = await openRazorpayCheckout({
        keyId: created.keyId,
        orderId: created.orderId,
        amount: created.amount,
        currency: created.currency,
        name: 'Endorfin',
        description: event.title,
        prefill: created.prefill,
        themeColor: '#0A0A0A',
      });

      if (!result.ok) {
        if (result.reason === 'dismissed') {
          toast.info(
            'Payment cancelled. Your registration is still pending — finish payment from My Events or close this tab.',
          );
        } else {
          const msg =
            (result.error as { error?: { description?: string } } | undefined)
              ?.error?.description ||
            (result.error instanceof Error ? result.error.message : null) ||
            'Payment failed. Please try again.';
          toast.error(msg);
        }
        setSubmitting(false);
        return;
      }

      // Confirm with backend.
      try {
        await confirmReg.mutateAsync({
          razorpayPaymentId: result.payload.razorpay_payment_id,
          razorpayOrderId: result.payload.razorpay_order_id,
          razorpaySignature: result.payload.razorpay_signature,
        });
      } catch (e) {
        // The signature/confirm step is what flips paymentStatus to 'paid'.
        // If it errors we send the user to the success page anyway — the
        // success page polls and will surface the canonical state once the
        // webhook catches up.
        console.warn('Registration confirm failed; polling on success page', e);
      }

      const slug = event.slug || event.id;
      router.push(
        `/races/${encodeURIComponent(slug)}/register/success?id=${encodeURIComponent(created.registrationId)}`,
      );
    } catch (e) {
      toast.error(describeRunnerError(e));
      setSubmitting(false);
    }
  };

  if (distances.length === 0) {
    return (
      <div className="bg-white border border-jet/10 rounded-2xl p-6">
        <p className="font-display uppercase text-base font-bold text-jet">
          Registration not open yet
        </p>
        <p className="text-sm text-jet/70 mt-2">
          There are no active distances for this event right now. Check back soon or
          contact the organiser.
        </p>
        <Link
          href={`/races/${event.slug || event.id}`}
          className="mt-4 inline-block text-sm text-signal hover:underline"
        >
          ← Back to event
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="min-w-0"
        >
          <ProfileGate draft={profile} setDraft={setProfile} missing={missing} />

          <DistancePicker
            distances={distances}
            value={distanceId}
            onChange={setDistanceId}
            currency={event.currency}
          />

          {customFields.length > 0 && (
            <CustomQuestions
              fields={customFields}
              values={customData}
              onChange={setCustomData}
            />
          )}

          {needsTshirt && tshirtSizes.length > 0 && (
            <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
              <p className="font-display uppercase text-sm font-bold text-jet mb-3">
                T-shirt size
              </p>
              <div className="flex flex-wrap gap-2">
                {tshirtSizes.map((s) => {
                  const selected = tshirt === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTshirt(s)}
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
            </section>
          )}

          {needsShipping && (
            <ShippingAddressFields
              value={shipping}
              onChange={setShipping}
              title={extras.shipsMedal ? 'Medal shipping address' : 'Shipping address'}
              hint={
                extras.shipsMedal
                  ? 'We&rsquo;ll ship your finisher medal here after the event.'
                  : undefined
              }
            />
          )}

          {distanceId && (
            <CouponInput
              eventId={event.id}
              distanceCategoryId={distanceId}
              applied={coupon}
              onApplied={setCoupon}
              onCleared={() => setCoupon(null)}
            />
          )}
        </form>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary
            data={{
              distance: selectedDistance,
              currency: event.currency,
              coupon: coupon?.preview ?? null,
            }}
            payLabel={
              !distanceId
                ? 'Pick a distance'
                : deriveTotals({
                    distance: selectedDistance,
                    currency: event.currency,
                    coupon: coupon?.preview ?? null,
                  }).finalPaise === 0
                  ? 'Confirm registration'
                  : undefined
            }
            onPay={onSubmit}
            disabled={!distanceId}
            loading={submitting}
          />
          <p className="mt-3 text-xs text-jet/50 text-center">
            <Link
              href={`/races/${event.slug || event.id}`}
              className="hover:underline"
            >
              ← Back to event details
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}

function profileDraftValidate(
  draft: ProfileDraft,
  missing: ('name' | 'email' | 'phone' | 'birthdate' | 'gender')[],
): string | null {
  for (const key of missing) {
    const v = draft[key];
    if (typeof v !== 'string' || !v.trim()) {
      switch (key) {
        case 'name':
          return 'your full name';
        case 'email':
          return 'your email';
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
