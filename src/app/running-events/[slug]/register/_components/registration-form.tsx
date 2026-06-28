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
  useMyRegistrations,
  usePatchMe,
} from '@/lib/runner-hooks';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { eventPath } from '@/lib/event-path';
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
import { ShareRow } from './bib-card';
import { EventTicket } from '../success/_event-ticket';
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
  // Inline error rendered NEXT TO the section that failed. Sidebar
  // banner was confusing — runner couldn't tell which field needed
  // fixing. Backend / payment failures still surface as a global
  // formError because they aren't tied to a single field.
  type FieldKey = 'distance' | 'profile' | 'customQuestions' | 'tshirt' | 'shipping';
  type FieldErrors = Partial<Record<FieldKey, string>>;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const sectionRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
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

  /** Section-level failure: marks the field, scrolls to it, resets the
   *  pay phase. Used for client-side validation errors. */
  const failField = (key: FieldKey, msg: string) => {
    setFieldErrors({ [key]: msg });
    setPayPhase('idle');
    // Scroll to the section so the runner sees the error pill.
    const el = sectionRefs.current[key];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /** Cross-cutting failure (network, payment, sold-out) — rendered in the
   *  sidebar above the Pay button. Not field-specific. */
  const fail = (msg: string) => {
    setFormError(msg);
    setPayPhase('idle');
  };

  const onSubmit = async () => {
    if (submitting) return;
    setFormError(null);
    setFieldErrors({});

    // 1. Distance
    if (!distanceId) {
      failField('distance', 'Pick a distance to continue.');
      return;
    }
    // 2. Profile completeness — validate the inline draft.
    const stillMissing = profileDraftValidate(profile, missing);
    if (stillMissing) {
      failField('profile', `Please fill in ${stillMissing}.`);
      return;
    }
    // 3. Custom questions
    const customCheck = validateCustomQuestions(customFields, customData);
    if (!customCheck.ok) {
      failField('customQuestions', 'Please answer the required questions.');
      const el = document.getElementById(`field-${customCheck.firstMissingId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // 4. T-shirt
    if (needsTshirt && tshirtSizes.length > 0 && !tshirt) {
      failField('tshirt', 'Please pick a T-shirt size.');
      return;
    }
    // 5. Shipping
    if (needsShipping) {
      const s = validateShipping(shipping);
      if (!s.ok) {
        failField('shipping', s.reason);
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

      // Free registration (₹0 — 100%-off coupon): already confirmed
      // server-side, no Razorpay order. Skip checkout → success.
      if (created.free) {
        try { window.localStorage.removeItem(draftKey); } catch {}
        toast.success('You’re in — it’s on the house!');
        router.push(
          `${eventPath(event, '/register/success')}?id=${encodeURIComponent(created.registrationId)}`,
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

      // Confirm with backend — fire-and-forget. We don't `await` because
      // /confirm can do non-trivial work (signature verify, FOR UPDATE
      // locks, bib generation, email send) and the runner shouldn't sit
      // on the form waiting. The success page polls /me/registrations
      // and the webhook also marks paid, so worst-case we converge there.
      void confirmReg
        .mutateAsync({
          registrationId: created.registrationId,
          body: {
            razorpayPaymentId: result.payload.razorpay_payment_id,
            razorpayOrderId: result.payload.razorpay_order_id,
            razorpaySignature: result.payload.razorpay_signature,
          },
        })
        .then(() => {
          // Clear the saved draft on durable success — row is paid.
          try { window.localStorage.removeItem(draftKey); } catch {}
        })
        .catch((e) => {
          console.warn('Registration confirm failed; webhook will reconcile', e);
        });

      toast.success('Payment received — confirming…');
      router.push(
        `${eventPath(event, '/register/success')}?id=${encodeURIComponent(created.registrationId)}`,
      );
    } catch (e) {
      fail(friendlyError(describeRunnerError(e)));
    }
  };

  // Block the form when the runner already has an active (paid + non-
  // cancelled) registration for this event. The partial unique index
  // would 409 anyway, but it's a bad first impression to show a Pay
  // button to someone who's already registered. Send them to their
  // existing bib instead.
  const myRegsQ = useMyRegistrations();
  const existingPaid = myRegsQ.data?.items.find(
    (r) =>
      r.eventId === event.id &&
      r.registrationStatus !== 'cancelled' &&
      (r.paymentStatus === 'paid' || r.paymentStatus === 'free'),
  );
  // Hold the page in a skeleton until we know whether the runner is
  // already registered. Without this gate the form flashes for ~2s
  // before being replaced by AlreadyRegisteredView, which felt buggy.
  if (myRegsQ.isLoading) {
    return <RegistrationFormSkeleton />;
  }
  if (existingPaid) {
    return <AlreadyRegisteredView reg={existingPaid} eventSlug={event.slug || event.id} />;
  }

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
          href={eventPath(event)}
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

      {/* Form-mode page header. AlreadyRegisteredView renders its own
       *  hero ("See you at the start line") so this only appears when
       *  the runner is actually registering. */}
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest text-signal mb-2 font-semibold">
          Register
        </p>
        <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight text-jet mb-2">
          {event.title}
        </h1>
        <p className="text-sm text-jet/60 max-w-2xl">
          {event.locationName ? `${event.locationName} · ` : ''}Payment is
          processed securely via Razorpay.
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
        {/* `<fieldset disabled>` natively disables every nested input,
            select, textarea and button. We pair it with reduced opacity
            so the lock is visually obvious — runner can't edit fields
            mid-payment and desync from the in-flight request. */}
        <fieldset
          disabled={submitting}
          className={`contents ${submitting ? 'opacity-60' : ''}`}
        >
          <div ref={(el) => { sectionRefs.current.profile = el; }}>
            <ProfileGate draft={profile} setDraft={setProfile} missing={missing} />
            <InlineFieldError error={fieldErrors.profile} />
          </div>

          <div ref={(el) => { sectionRefs.current.distance = el; }}>
            <DistancePicker
              distances={distances}
              value={distanceId}
              onChange={(v) => {
                setDistanceId(v);
                if (fieldErrors.distance) setFieldErrors((p) => ({ ...p, distance: undefined }));
              }}
              currency={event.currency}
            />
            <InlineFieldError error={fieldErrors.distance} />
          </div>

          {customFields.length > 0 && (
            <div ref={(el) => { sectionRefs.current.customQuestions = el; }}>
              <CustomQuestions
                fields={customFields}
                values={customData}
                onChange={(next) => {
                  setCustomData(next);
                  if (fieldErrors.customQuestions)
                    setFieldErrors((p) => ({ ...p, customQuestions: undefined }));
                }}
              />
              <InlineFieldError error={fieldErrors.customQuestions} />
            </div>
          )}

          {needsTshirt && tshirtSizes.length > 0 && (
            <section
              ref={(el) => { sectionRefs.current.tshirt = el; }}
              className={`bg-white border rounded-2xl p-5 md:p-6 mb-4 ${
                fieldErrors.tshirt ? 'border-signal' : 'border-jet/10'
              }`}
            >
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
                      onClick={() => {
                        setTshirt(s);
                        if (fieldErrors.tshirt)
                          setFieldErrors((p) => ({ ...p, tshirt: undefined }));
                      }}
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
              {fieldErrors.tshirt && (
                <p
                  role="alert"
                  className="mt-3 text-xs text-signal flex items-center gap-1.5 leading-snug"
                >
                  <span aria-hidden className="text-[11px]">⚠</span>
                  {fieldErrors.tshirt}
                </p>
              )}
            </section>
          )}

          {needsShipping && (
            <div ref={(el) => { sectionRefs.current.shipping = el; }}>
              <ShippingAddressFields
                value={shipping}
                onChange={(next) => {
                  setShipping(next);
                  if (fieldErrors.shipping)
                    setFieldErrors((p) => ({ ...p, shipping: undefined }));
                }}
                title={extras.shipsMedal ? 'Medal shipping address' : 'Shipping address'}
                hint={
                  extras.shipsMedal
                    ? 'We&rsquo;ll ship your finisher medal here after the event.'
                    : undefined
                }
              />
              <InlineFieldError error={fieldErrors.shipping} />
            </div>
          )}
        </fieldset>
        </form>

        <aside className="lg:sticky lg:top-24">
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
            termsHref={eventPath(event)}
            // Coupon lives inside the order summary so the runner sees
            // the discount line item and the "Apply" button in the same
            // box where they decide to pay.
            coupon={
              distanceId ? (
                <CouponInput
                  variant="embedded"
                  eventId={event.id}
                  distanceCategoryId={distanceId}
                  applied={coupon}
                  onApplied={setCoupon}
                  onCleared={() => setCoupon(null)}
                />
              ) : null
            }
            // Backend / payment failures still surface here in the sidebar
            // — they're cross-cutting, not tied to a single form field.
            error={formError}
          />
          <p className="mt-3 text-xs text-jet/50 text-center">
            <Link
              href={eventPath(event)}
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

/** Inline field-level error. Lightweight: small red text right under the
 *  failing section, no chunky card. Tucks visually into the section
 *  above via a negative top margin so the two read as a single unit. */
function InlineFieldError({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="-mt-3 mb-4 px-1 text-xs text-signal flex items-start gap-1.5 leading-snug"
    >
      <span aria-hidden className="text-[11px]">⚠</span>
      <span>{error}</span>
    </p>
  );
}

/** Rendered when the runner lands on the registration page but already
 *  has a paid + non-cancelled registration for this event. We replace
 *  the form with a real bib design + share actions + app install push. */
export function AlreadyRegisteredView({
  reg,
  eventSlug,
}: {
  reg: import('@/lib/runner-api').MyRegistrationItem;
  eventSlug: string;
}) {
  // The runner viewing this is the one who registered (the parent query
  // already filtered to my-registrations), so `useMe()` is the right
  // source for their name.
  const isVirtual = reg.event?.eventFormat === 'virtual';
  const isRunning = reg.event?.category === 'running';
  const eventTitle = reg.event?.title ?? 'this event';
  const bibNumber = reg.bibNumber ?? '—';
  const distance = reg.distance?.fullTitle ?? reg.distance?.categoryName ?? '';

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium uppercase tracking-wider mb-4">
        <span aria-hidden>✓</span> You’re in
      </div>
      <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight mb-3">
        {isRunning ? 'See you at the start line' : 'You’re all set'}
      </h1>
      <p className="text-sm text-jet/65 mb-7 mx-auto max-w-md">
        Here’s your {isRunning ? 'registration' : 'ticket'} for <strong>{eventTitle}</strong>. Screenshot it,
        share it, or show the QR at entry.
      </p>

      <EventTicket
        className="max-w-md mx-auto"
        eventTitle={eventTitle}
        code={bibNumber}
        codeLabel={isRunning ? 'Bib no.' : 'Entry code'}
        startTime={reg.event?.startTime ?? null}
        venue={reg.event?.venueName || reg.event?.locationName || null}
        qrValue={typeof window !== 'undefined' ? window.location.origin + `/me/registrations/${reg.id}` : ''}
        noun={isRunning ? 'registration' : 'ticket'}
      />

      <div className="mt-6">
        <ShareRow
          eventTitle={eventTitle}
          bibNumber={bibNumber}
          distance={distance}
          eventSlug={eventSlug}
        />
      </div>

      {/* App install nudge — primary path for "manage my registration"
       *  lives in the app. Uses the site-wide AppStoreButtons so it
       *  matches the homepage CTA, footer, and other install touchpoints. */}
      <div className="mt-8 bg-jet text-bone rounded-2xl px-5 md:px-6 py-7 text-center">
        <p className="font-display uppercase text-base md:text-lg font-bold mb-2">
          Get the Endorfin app
        </p>
        <p className="text-sm text-bone/70 mb-5 leading-relaxed max-w-md mx-auto">
          {isVirtual
            ? 'Track your run and upload your result directly from the app — that’s how you collect your medal.'
            : 'Bib on your lock screen, event-day reminders, and a record of every event you’ve run.'}
        </p>
        <AppStoreButtons variant="dark" />
      </div>

      <div className="mt-6">
        <Link
          href={`/running-events/${encodeURIComponent(eventSlug)}`}
          className="text-sm text-jet/55 hover:text-jet underline-offset-2 hover:underline"
        >
          ← Back to event details
        </Link>
      </div>
    </div>
  );
}

/** Sharing toolbar — Web Share API as the primary action (mobile-native),
 *  with explicit WhatsApp/Instagram/Copy fallbacks for desktop. */
/** Skeleton shown while we resolve whether the runner is already
 *  registered. Without this gate the form mounts, then immediately
 *  swaps to the AlreadyRegisteredView once useMyRegistrations resolves,
 *  which reads as a flash bug. Match the basic shape of either branch
 *  so layout doesn't jump on resolve. */
function RegistrationFormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-24 bg-jet/10 rounded mb-3" />
        <div className="h-8 w-72 bg-jet/15 rounded mb-2" />
        <div className="h-4 w-96 max-w-full bg-jet/10 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="bg-white border border-jet/10 rounded-2xl p-6 h-32" />
          <div className="bg-white border border-jet/10 rounded-2xl p-6 h-48" />
        </div>
        <div className="bg-jet/[0.04] border border-jet/10 rounded-2xl p-6 h-64" />
      </div>
    </div>
  );
}

