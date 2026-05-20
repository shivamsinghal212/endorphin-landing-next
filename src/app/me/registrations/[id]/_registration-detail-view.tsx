'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMyRegistration } from '@/lib/runner-hooks';
import type { MyRegistrationItem } from '@/lib/runner-api';

const IST = 'Asia/Kolkata';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST,
  });
}

function fmtRupees(paise: number | null, currency: string | null) {
  if (paise == null) return '—';
  const cur = currency || 'INR';
  if (cur === 'INR') {
    return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `${cur} ${(paise / 100).toLocaleString('en')}`;
}

type StepKey = 'paid' | 'submitted' | 'verified' | 'medal';

interface StepDef {
  key: StepKey;
  label: string;
  state: 'done' | 'current' | 'todo' | 'skipped';
  detail?: string;
}

function buildTimeline(r: MyRegistrationItem): StepDef[] {
  const steps: StepDef[] = [];
  steps.push({
    key: 'paid',
    label: 'Payment captured',
    state:
      r.paymentStatus === 'paid' || r.paymentStatus === 'free'
        ? 'done'
        : r.paymentStatus === 'pending'
          ? 'current'
          : 'todo',
    detail:
      r.paymentStatus === 'failed'
        ? 'Failed — try registering again.'
        : r.paymentStatus === 'refunded'
          ? 'Refund issued.'
          : undefined,
  });

  if (r.event.eventFormat === 'virtual') {
    steps.push({
      key: 'submitted',
      label: 'Result submitted',
      state:
        r.resultStatus === 'submitted' || r.resultStatus === 'verified'
          ? 'done'
          : r.paymentStatus === 'paid' || r.paymentStatus === 'free'
            ? 'current'
            : 'todo',
    });
    steps.push({
      key: 'verified',
      label: 'Verified',
      state:
        r.resultStatus === 'verified'
          ? 'done'
          : r.resultStatus === 'submitted'
            ? 'current'
            : r.resultStatus === 'rejected'
              ? 'todo'
              : 'todo',
      detail: r.resultStatus === 'rejected' ? 'Rejected — re-submit proof.' : undefined,
    });
  }

  steps.push({
    key: 'medal',
    label: 'Medal',
    state:
      r.medalStatus === 'delivered'
        ? 'done'
        : r.medalStatus === 'dispatched'
          ? 'current'
          : r.medalStatus === 'not_applicable'
            ? 'skipped'
            : 'todo',
    detail:
      r.medalStatus === 'not_applicable'
        ? 'No medal for this event.'
        : r.medalStatus === 'dispatched'
          ? 'On its way.'
          : r.medalStatus === 'delivered'
            ? 'Delivered.'
            : undefined,
  });
  return steps;
}

export function RegistrationDetailView({
  registrationId,
}: {
  registrationId: string;
}) {
  const q = useMyRegistration(registrationId);

  if (q.isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-sm text-jet/60">
        Loading…
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <p className="text-sm text-signal mb-4">
          Couldn&rsquo;t load this registration.
        </p>
        <Link
          href="/me/registrations"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm hover:bg-jet/5"
        >
          Back to My events
        </Link>
      </div>
    );
  }

  const r = q.data;
  const timeline = buildTimeline(r);
  const eventHref = `/races/${r.event.slug || r.event.id}`;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <nav className="text-xs text-jet/50 mb-4">
        <Link href="/me/registrations" className="hover:underline">
          ← My events
        </Link>
      </nav>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-jet/5 relative">
          {r.event.coverImageUrl ? (
            <Image
              src={r.event.coverImageUrl}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display uppercase text-2xl md:text-3xl font-bold leading-tight text-jet">
            {r.event.title}
          </h1>
          <p className="text-sm text-jet/60 mt-1">
            {r.distance?.fullTitle ?? r.distance?.categoryName ?? '—'}
            {r.bibNumber ? ` · Bib ${r.bibNumber}` : ''}
          </p>
          <Link
            href={eventHref}
            className="text-xs text-signal hover:underline mt-1 inline-block"
          >
            View event page →
          </Link>
        </div>
      </div>

      <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet mb-4">
          Order
        </p>
        <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <dt className="text-jet/60 text-[11px] uppercase tracking-wider">
            Amount paid
          </dt>
          <dd className="text-jet font-medium">
            {fmtRupees(r.amountPaid, r.currency)}
          </dd>
          {r.discountAmount > 0 && (
            <>
              <dt className="text-jet/60 text-[11px] uppercase tracking-wider">
                Discount
              </dt>
              <dd className="text-jet">−{fmtRupees(r.discountAmount, r.currency)}</dd>
            </>
          )}
          <dt className="text-jet/60 text-[11px] uppercase tracking-wider">
            Registered on
          </dt>
          <dd className="text-jet">{fmtDate(r.createdAt)}</dd>
          {r.tshirtSize && (
            <>
              <dt className="text-jet/60 text-[11px] uppercase tracking-wider">
                T-shirt
              </dt>
              <dd className="text-jet">{r.tshirtSize}</dd>
            </>
          )}
        </dl>
        <p className="text-[11px] text-jet/40 mt-4">
          Receipt download coming soon.
        </p>
      </section>

      <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet mb-4">
          Status
        </p>
        <ol className="flex flex-col gap-3">
          {timeline.map((step) => (
            <li key={step.key} className="flex items-start gap-3">
              <span
                className={`mt-1 inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  step.state === 'done'
                    ? 'bg-emerald-500'
                    : step.state === 'current'
                      ? 'bg-signal animate-pulse'
                      : step.state === 'skipped'
                        ? 'bg-jet/15'
                        : 'bg-jet/15'
                }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.state === 'skipped' ? 'text-jet/40' : 'text-jet'
                  }`}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-jet/60 mt-0.5">{step.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {r.shippingAddress && (
        <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
          <p className="font-display uppercase text-sm font-bold text-jet mb-3">
            Shipping address
          </p>
          <address className="not-italic text-sm text-jet leading-relaxed">
            <p>{r.shippingAddress.name}</p>
            <p>{r.shippingAddress.line1}</p>
            {r.shippingAddress.line2 && <p>{r.shippingAddress.line2}</p>}
            <p>
              {r.shippingAddress.city}, {r.shippingAddress.state} {r.shippingAddress.pincode}
            </p>
            <p className="text-jet/60 mt-1">Phone {r.shippingAddress.phone}</p>
          </address>
        </section>
      )}
    </div>
  );
}
