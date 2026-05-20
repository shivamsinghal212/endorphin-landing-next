'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  // Pay button progresses through these states. We surface the text so
  // the runner always knows which step they're in — toasts auto-dismiss
  // and we kept missing them.
  type PayPhase = 'idle' | 'saving_profile' | 'creating_order' | 'opening_modal' | 'confirming';
  const [payPhase, setPayPhase] = useState<PayPhase>('idle');
  const submitting = payPhase !== 'idle';
  // Persistent inline error rendered above the Pay button. Cleared on
  // any successful step. Toasts still fire for short notifications.
  const [formError, setFormError] = useState<string | null>(null);
  // Track Razorpay SDK readiness so we can disable Pay until the script
  // has actually attached `window.Razorpay`. Initial value polls in case
  // the script was already loaded by a prior visit (browser cache).
  const [sdkReady, setSdkReady] = useState<boolean>(() => isRazorpayLoaded());

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

  // ── Form-state persistence ─────────────────────────────────────────────
  // Mirror the in-progress form to localStorage so a refresh / browser
  // crash / accidental back-button doesn't make the runner re-enter
  // distance, custom answers, shipping, etc. Cleared on successful pay.
  const draftKey = `runner:reg-draft:${event.id}`;
  // Restore on mount, before the user has typed.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        distanceId?: string | null;
        customData?: CustomFormData;
        tshirt?: string;
        shipping?: ShippingAddress;
      };
      if (saved.distanceId && distances.some((d) => d.id === saved.distanceId)) {
        setDistanceId(saved.distanceId);
      }
      if (saved.customData) setCustomData(saved.customData);
      if (saved.tshirt) setTshirt(saved.tshirt);
      if (saved.shipping) setShipping(saved.shipping);
    } catch {
      /* ignore — empty/stale draft is fine */
    }
  }, [draftKey, distances]);
  // Persist on every change. Keep this serializable — coupon previews
  // re-validate server-side anyway so we don't bother saving them.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ distanceId, customData, tshirt, shipping }),
      );
    } catch {
      /* quota / serialise — local cache is a nice-to-have, not critical */
    }
  }, [draftKey, distanceId, customData, tshirt, shipping]);

  const missing = useMemo(() => missingProfileFields(meQ.data), [meQ.data]);

  const createReg = useCreateRegistration();
  const confirmReg = useConfirmRegistration();

  const selectedDistance = useMemo(
    () => distances.find((d) => d.id === distanceId) ?? null,
    [distances, distanceId],
  );

  const needsShipping = !!(extras.collectAddress || extras.shipsMedal);
  const needsTshirt = !!extras.collectTshirt;
  const tshirtSizes = extras.tshirtSizes ?? [];

  // Map common backend rejection messages to runner-friendly copy. Falls
  // back to the raw error if nothing matches.
  const friendlyError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes('sold out')) return 'This distance just sold out — pick another or try again later.';
    if (m.includes('already registered')) return 'You’re already registered for this distance.';
    if (m.includes('not open') || m.includes('not accepting'))
      return 'Registration isn’t open for this event right now.';
    if (m.includes('not found')) return 'This event or distance couldn’t be found. Try refreshing.';
    if (m.includes('coupon')) return raw; // coupon copy is already friendly
    if (m.includes('signature')) return 'Payment signature didn’t verify. Try again, and if it keeps happening contact support.';
    return raw;
  };

  const fail = (msg: string) => {
    setFormError(msg);
    setPayPhase('idle');
  };

  const onSubmit = async () => {
    if (submitting) return;
    setFormError(null);

    // 1. Distance
    if (!distanceId) {
      fail('Pick a distance to continue.');
      return;
    }
    // 2. Profile completeness — validate the inline draft.
    const stillMissing = profileDraftValidate(profile, missing);
    if (stillMissing) {
      fail(`Please fill in ${stillMissing}.`);
      return;
    }
    // 3. Custom questions
    const customCheck = validateCustomQuestions(customFields, customData);
    if (!customCheck.ok) {
      fail('Please answer the required questions.');
      const el = document.getElementById(`field-${customCheck.firstMissingId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // 4. T-shirt
    if (needsTshirt && tshirtSizes.length > 0 && !tshirt) {
      fail('Please pick a T-shirt size.');
      return;
    }
    // 5. Shipping
    if (needsShipping) {
      const s = validateShipping(shipping);
      if (!s.ok) {
        fail(s.reason);
        return;
      }
    }

    setPayPhase('saving_profile');
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

      setPayPhase('creating_order');
      const created = await createReg.mutateAsync({
        eventId: event.id,
        distanceCategoryId: distanceId,
        formData: customFields.length > 0 ? customData : null,
        tshirtSize: needsTshirt ? tshirt || null : null,
        shippingAddress: needsShipping ? shipping : null,
        couponCode: coupon?.code ?? null,
      });

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
        description: event.title,
        prefill: created.prefill,
        themeColor: '#0A0A0A',
      });

      if (!result.ok) {
        if (result.reason === 'dismissed') {
          // Not an error — the runner just closed the modal. Allow retry.
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

      // Confirm with backend.
      setPayPhase('confirming');
      try {
        await confirmReg.mutateAsync({
          registrationId: created.registrationId,
          body: {
            razorpayPaymentId: result.payload.razorpay_payment_id,
            razorpayOrderId: result.payload.razorpay_order_id,
            razorpaySignature: result.payload.razorpay_signature,
          },
        });
        toast.success('You’re registered!');
        // Clear the saved draft on durable success — the row is paid.
        try { window.localStorage.removeItem(draftKey); } catch {}
      } catch (e) {
        // /confirm failed but Razorpay says they paid. Webhook will
        // eventually mark paid via payment.captured. Land them on the
        // success page which polls + offers a Refresh button.
        console.warn('Registration confirm failed; polling on success page', e);
        toast.info('Payment received — confirming with the platform…');
      }

      const slug = event.slug || event.id;
      router.push(
        `/races/${encodeURIComponent(slug)}/register/success?id=${encodeURIComponent(created.registrationId)}`,
      );
    } catch (e) {
      fail(friendlyError(describeRunnerError(e)));
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
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onReady={() => setSdkReady(true)}
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
          {/* Persistent inline error — toasts auto-dismiss; this stays
              visible until the runner takes another action. */}
          {formError && (
            <div
              role="alert"
              className="mb-3 rounded-xl border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal flex items-start gap-2"
            >
              <span aria-hidden>⚠</span>
              <p className="leading-snug">{formError}</p>
            </div>
          )}
          <OrderSummary
            data={{
              distance: selectedDistance,
              currency: event.currency,
              coupon: coupon?.preview ?? null,
            }}
            payLabel={
              !sdkReady
                ? 'Loading payment…'
                : payPhase === 'saving_profile'
                  ? 'Saving profile…'
                  : payPhase === 'creating_order'
                    ? 'Creating order…'
                    : payPhase === 'opening_modal'
                      ? 'Opening payment…'
                      : payPhase === 'confirming'
                        ? 'Confirming…'
                        : !distanceId
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
            disabled={!distanceId || !sdkReady}
            loading={submitting || !sdkReady}
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
