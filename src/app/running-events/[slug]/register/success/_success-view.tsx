'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyRegistration } from '@/lib/runner-hooks';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { ShareRow } from '../_components/bib-card';
import { EventTicket } from './_event-ticket';
import type { MyRegistrationItem } from '@/lib/runner-api';

function fmtRupees(paise: number | null, currency: string | null) {
  if (paise == null) return '—';
  const cur = currency || 'INR';
  if (cur === 'INR') {
    return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `${cur} ${(paise / 100).toLocaleString('en')}`;
}

export function SuccessView({
  registrationId,
  slug,
}: {
  registrationId: string;
  slug: string;
}) {
  // While the row is `pending` (race between confirm POST + payment.captured
  // webhook), poll every 5s. After 120s of being stuck pending we stop the
  // auto-poll and let the runner trigger refresh manually — Razorpay test
  // payments sometimes take longer than this; that's not an error.
  const eventBase = (usePathname() || '').startsWith('/experiences')
    ? '/experiences'
    : '/running-events';
  const pollStart = useRef<number | null>(null);
  const POLL_BUDGET_MS = 120_000;
  const reg = useMyRegistration(registrationId, { refetchIntervalMs: 5_000 });
  const data = reg.data;

  useEffect(() => {
    if (!data) return;
    if (data.paymentStatus !== 'pending') return;
    if (pollStart.current == null) pollStart.current = Date.now();
  }, [data]);

  const stillPolling =
    data?.paymentStatus === 'pending' &&
    (pollStart.current == null ||
      Date.now() - (pollStart.current ?? 0) < POLL_BUDGET_MS);

  if (reg.isLoading) {
    return <Wrap>Loading your registration…</Wrap>;
  }
  if (reg.error || !data) {
    return (
      <Wrap>
        <h1 className="font-display uppercase text-2xl md:text-3xl font-bold mb-3">
          Couldn&rsquo;t find that registration
        </h1>
        <p className="text-sm text-jet/70 mb-6">
          The link may have expired or the registration belongs to a different
          account. Try opening it from My Events.
        </p>
        <Link
          href="/me/registrations"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90"
        >
          Open My Events
        </Link>
      </Wrap>
    );
  }

  if (data.paymentStatus === 'paid' || data.paymentStatus === 'free') {
    return <PaidView data={data} />;
  }

  if (data.paymentStatus === 'failed') {
    return (
      <Wrap>
        <h1 className="font-display uppercase text-2xl md:text-3xl font-bold mb-3">
          Payment didn&rsquo;t go through
        </h1>
        <p className="text-sm text-jet/70 mb-6">
          We received a failure signal from the payment provider. No charge was
          made — try the registration again to grab a fresh order.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${eventBase}/${encodeURIComponent(slug)}/register`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-signal text-bone text-sm hover:bg-signal/90"
          >
            Try again
          </Link>
          <Link
            href={`${eventBase}/${encodeURIComponent(slug)}`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm hover:bg-jet/5"
          >
            Back to event
          </Link>
        </div>
      </Wrap>
    );
  }

  // pending
  return (
    <Wrap>
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex w-3 h-3 rounded-full bg-signal animate-pulse" />
        <h1 className="font-display uppercase text-2xl md:text-3xl font-bold">
          Confirming your payment…
        </h1>
      </div>
      <p className="text-sm text-jet/70 mb-6">
        {stillPolling
          ? 'Hold tight — Razorpay sometimes takes a few seconds to settle. This page will update automatically.'
          : 'Still pending. The payment provider hasn’t reported back yet. Try refreshing — if nothing changes you can safely leave; we’ll email when it captures.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reg.refetch()}
          disabled={reg.isFetching}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90 disabled:opacity-50"
        >
          {reg.isFetching ? 'Checking…' : 'Refresh status'}
        </button>
        <Link
          href="/me/registrations"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm hover:bg-jet/5"
        >
          Open My Events
        </Link>
      </div>
    </Wrap>
  );
}

function PaidView({ data }: { data: MyRegistrationItem }) {
  const eventTitle = data.event.title;
  const bibNumber = data.bibNumber ?? '—';
  const distance = data.distance?.fullTitle ?? data.distance?.categoryName ?? '';
  const eventSlug = data.event.slug ?? data.event.id;
  const isRunning = data.event.category === 'running';
  const passNoun = isRunning ? 'registration' : 'ticket';

  return (
    <Wrap centered>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium uppercase tracking-wider mb-3">
        <span aria-hidden>✓</span> Registration confirmed
      </div>
      <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight mb-3">
        {isRunning ? 'See you at the start line' : 'You’re all set'}
      </h1>
      <p className="text-sm text-jet/65 mb-7 mx-auto max-w-md">
        We&rsquo;ve emailed your confirmation
        {data.amountPaid != null
          ? ` along with a receipt for ${fmtRupees(data.amountPaid, data.currency)}`
          : ''}
        . Here&rsquo;s your {passNoun} — show the QR at entry.
      </p>

      <EventTicket
        className="max-w-md mx-auto"
        eventTitle={eventTitle}
        code={data.bibNumber || data.bookingCode || ''}
        codeLabel={data.bibNumber ? (isRunning ? 'Bib no.' : 'Entry code') : 'Booking code'}
        startTime={data.event.startTime}
        venue={data.event.venueName || data.event.locationName || null}
        qrValue={typeof window !== 'undefined' ? window.location.href : ''}
        noun={passNoun}
      />

      <div className="mt-6">
        <ShareRow
          eventTitle={eventTitle}
          bibNumber={bibNumber}
          distance={distance}
          eventSlug={eventSlug}
        />
      </div>

      {/* Install-the-app nudge. Uses the site-wide AppStoreButtons so it
       *  matches the homepage CTA, footer, and other install touchpoints. */}
      <div className="bg-jet text-bone rounded-2xl px-5 md:px-6 py-7 mb-6 mt-8 text-center">
        <p className="font-display uppercase text-base md:text-lg font-bold mb-2">
          Get the Endorfin app
        </p>
        <p className="text-sm text-bone/70 mb-5 leading-relaxed max-w-md mx-auto">
          {isRunning
            ? 'Event-day reminders, your pass on your lock screen, and a record of every event you’ve done.'
            : 'Event-day reminders, your pass on your lock screen, and every event you’ve booked in one place.'}
        </p>
        <AppStoreButtons variant="dark" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/me/registrations"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90"
        >
          Open My Events
        </Link>
        <Link
          href="/running-events"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm hover:bg-jet/5"
        >
          Find more events
        </Link>
      </div>
    </Wrap>
  );
}

function Wrap({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  /** Center the content horizontally — used by the PaidView so the bib
   *  card and supporting copy line up symmetrically on desktop. */
  centered?: boolean;
}) {
  return (
    <div
      className={`max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-16 ${centered ? 'text-center' : ''}`}
    >
      {children}
    </div>
  );
}
