'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyBooking } from '@/lib/runner-hooks';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { EventTicket } from './_event-ticket';
import type { MyBookingItem } from '@/lib/runner-api';

function fmtRupees(paise: number | null, currency: string | null) {
  if (paise == null) return '—';
  const cur = currency || 'INR';
  if (cur === 'INR') {
    return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `${cur} ${(paise / 100).toLocaleString('en')}`;
}

export function BookingSuccessView({
  bookingId,
  slug,
}: {
  bookingId: string;
  slug: string;
}) {
  // Poll while pending (race between the confirm POST and the
  // payment.captured webhook). Stop auto-polling after 120s — Razorpay test
  // payments occasionally settle slowly; that's not an error.
  // We're already on the event's correct prefix (the booking form pushed us
  // here via eventPath). Mirror it on the back/try-again links so an
  // experience stays under /experiences.
  const eventBase = (usePathname() || '').startsWith('/experiences')
    ? '/experiences'
    : '/running-events';
  const pollStart = useRef<number | null>(null);
  const POLL_BUDGET_MS = 120_000;
  const q = useMyBooking(bookingId, { refetchIntervalMs: 5_000 });
  const data = q.data;

  useEffect(() => {
    if (!data) return;
    if (data.paymentStatus !== 'pending') return;
    if (pollStart.current == null) pollStart.current = Date.now();
  }, [data]);

  const stillPolling =
    data?.paymentStatus === 'pending' &&
    (pollStart.current == null ||
      Date.now() - (pollStart.current ?? 0) < POLL_BUDGET_MS);

  if (q.isLoading) {
    return <Wrap>Loading your booking…</Wrap>;
  }
  if (q.error || !data) {
    return (
      <Wrap>
        <h1 className="font-display uppercase text-2xl md:text-3xl font-bold mb-3">
          Couldn&rsquo;t find that booking
        </h1>
        <p className="text-sm text-jet/70 mb-6">
          The link may have expired or the booking belongs to a different
          account.
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

  if (data.paymentStatus === 'paid') {
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
          made — try booking again to grab a fresh order.
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
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-jet text-bone text-sm hover:bg-jet/90 disabled:opacity-50"
        >
          {q.isFetching ? 'Checking…' : 'Refresh status'}
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

function PaidView({ data }: { data: MyBookingItem }) {
  const eventTitle = data.event?.title ?? 'this event';
  const isVirtual = data.event?.eventFormat === 'virtual';

  return (
    <Wrap centered>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium uppercase tracking-wider mb-3">
        <span aria-hidden>✓</span> Booking confirmed
      </div>
      <h1 className="font-display uppercase text-3xl md:text-4xl font-bold leading-tight mb-3">
        You&rsquo;re all set
      </h1>
      <p className="text-sm text-jet/65 mb-7 mx-auto max-w-md">
        We&rsquo;ve emailed your confirmation
        {data.totalPaise != null
          ? ` along with a receipt for ${fmtRupees(data.totalPaise, data.currency)}`
          : ''}
        . Show this booking code at entry — it admits your whole group.
      </p>

      <EventTicket
        className="max-w-md mx-auto"
        eventTitle={eventTitle}
        code={data.bookingCode ?? '—'}
        codeLabel="Booking code"
        admitsCount={data.ticketCount}
        startTime={data.event?.startTime ?? null}
        venue={data.event?.venueName || data.event?.locationName || null}
        attendees={data.attendees.map((a) => a.attendeeName || 'Guest')}
        qrValue={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <div className="bg-jet text-bone rounded-2xl px-5 md:px-6 py-7 mb-6 mt-8 text-center">
        <p className="font-display uppercase text-base md:text-lg font-bold mb-2">
          Get the Endorfin app
        </p>
        <p className="text-sm text-bone/70 mb-5 leading-relaxed max-w-md mx-auto">
          {isVirtual
            ? 'Manage your booking and event details from the app.'
            : 'Event-day reminders, your booking on your lock screen, and a record of every event you’ve booked.'}
        </p>
        <AppStoreButtons variant="dark" />
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
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
