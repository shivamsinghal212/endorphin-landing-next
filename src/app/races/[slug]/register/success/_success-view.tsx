'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMyRegistration } from '@/lib/runner-hooks';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import type { MyRegistrationItem } from '@/lib/runner-api';

const IST = 'Asia/Kolkata';

function fmtFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
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
            href={`/races/${encodeURIComponent(slug)}/register`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-signal text-bone text-sm hover:bg-signal/90"
          >
            Try again
          </Link>
          <Link
            href={`/races/${encodeURIComponent(slug)}`}
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
  const startTime = data.event.resultWindowStart;
  const endTime = data.event.resultWindowEnd;
  return (
    <Wrap>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium uppercase tracking-wider mb-3">
        <span aria-hidden>✓</span> Registration confirmed
      </div>
      <h1 className="font-display uppercase text-3xl md:text-5xl font-bold leading-tight mb-4">
        See you at the start line
      </h1>
      <p className="text-sm text-jet/70 mb-8">
        We&rsquo;ve emailed your confirmation. Here&rsquo;s your bib for the day.
      </p>

      <div className="bg-jet text-bone rounded-2xl p-6 md:p-8 mb-8">
        <p className="text-xs uppercase tracking-widest text-bone/60 mb-2">Bib</p>
        <p className="font-display uppercase text-5xl md:text-6xl font-bold leading-none">
          {data.bibNumber ?? '—'}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-bone/60 text-[11px] uppercase tracking-wider mb-0.5">
              Event
            </p>
            <p className="font-medium">{data.event.title}</p>
          </div>
          <div>
            <p className="text-bone/60 text-[11px] uppercase tracking-wider mb-0.5">
              Distance
            </p>
            <p className="font-medium">
              {data.distance?.fullTitle ?? data.distance?.categoryName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-bone/60 text-[11px] uppercase tracking-wider mb-0.5">
              Amount paid
            </p>
            <p className="font-medium">{fmtRupees(data.amountPaid, data.currency)}</p>
          </div>
          <div>
            <p className="text-bone/60 text-[11px] uppercase tracking-wider mb-0.5">
              Format
            </p>
            <p className="font-medium capitalize">
              {data.event.eventFormat.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-6">
        <p className="font-display uppercase text-sm font-bold mb-3">What&rsquo;s next</p>
        {data.event.eventFormat === 'virtual' ? (
          <p className="text-sm text-jet/80 leading-relaxed">
            Run any time during the result window
            {startTime && endTime ? (
              <>
                {' '}
                (<strong>{fmtFullDate(startTime)}</strong> –{' '}
                <strong>{fmtFullDate(endTime)}</strong>)
              </>
            ) : null}
            . When the window opens, upload your run screenshot or proof from My
            Events and we&rsquo;ll verify it within 48 hours.
          </p>
        ) : (
          <p className="text-sm text-jet/80 leading-relaxed">
            Bring a printout or screenshot of your bib number on race day. Details
            on venue and start times are on the event page.
          </p>
        )}
      </div>

      {/* Install-the-app nudge. Uses the site-wide AppStoreButtons so it
       *  matches the homepage CTA, footer, and other install touchpoints. */}
      <div className="bg-jet text-bone rounded-2xl px-5 md:px-6 py-7 mb-6 text-center">
        <p className="font-display uppercase text-base md:text-lg font-bold mb-2">
          Get the Endorfin app
        </p>
        <p className="text-sm text-bone/70 mb-5 leading-relaxed max-w-md mx-auto">
          {data.event.eventFormat === 'virtual'
            ? 'Track your run and upload the result directly from the app. Faster than emailing screenshots.'
            : 'Race-day reminders, bib on your lock screen, and a record of every event you’ve done.'}
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
          href="/races"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm hover:bg-jet/5"
        >
          Find more races
        </Link>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-16">{children}</div>
  );
}
