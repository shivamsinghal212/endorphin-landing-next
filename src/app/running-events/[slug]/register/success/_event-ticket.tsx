'use client';

import { QRCodeSVG } from 'qrcode.react';

const IST = 'Asia/Kolkata';

function fmtWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST,
  });
}

/**
 * Clean, branded event ticket — replaces the race-bib look across all paid
 * events. Left "stub" carries a scannable QR (encodes the confirmation URL);
 * the body shows the event, when/where, the entry code, and attendees.
 */
export function EventTicket({
  eventTitle,
  code,
  codeLabel,
  admitsCount = 1,
  startTime,
  venue,
  attendees,
  qrValue,
  className = '',
  noun = 'ticket',
}: {
  eventTitle: string;
  code: string;
  codeLabel: string;
  admitsCount?: number;
  startTime?: string | null;
  venue?: string | null;
  attendees?: string[];
  qrValue: string;
  /** Width/positioning is caller-controlled (centered on success screens,
   *  full-width inside the My Events detail). */
  className?: string;
  /** What the pass is called — "ticket" for experiences, "registration" for
   *  runs. Drives the "Your …" label and the attendee count line. */
  noun?: string;
}) {
  const when = fmtWhen(startTime);
  const admits = admitsCount > 1 ? ` · admits ${admitsCount}` : '';

  return (
    <div className={`relative bg-white border border-jet/10 rounded-2xl shadow-[0_18px_50px_-24px_rgba(10,10,10,0.45)] overflow-hidden text-left ${className}`}>
      {/* top accent */}
      <div className="h-1.5 bg-signal" aria-hidden />

      <div className="p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-jet/45">Your {noun}</p>
        <h3 className="font-display uppercase text-xl md:text-2xl font-bold text-jet leading-tight mt-1">
          {eventTitle}
        </h3>

        <div className="mt-3 space-y-1 text-sm">
          {when && (
            <p className="text-jet/70 flex items-center gap-2">
              <span aria-hidden>📅</span> {when}
            </p>
          )}
          {venue && (
            <p className="text-jet/70 flex items-center gap-2">
              <span aria-hidden>📍</span> {venue}
            </p>
          )}
        </div>

        {/* code + QR */}
        <div className="mt-5 flex items-center gap-4 rounded-xl bg-bone border border-jet/10 p-4">
          <div className="bg-white rounded-lg p-1.5 border border-jet/10 flex-shrink-0">
            <QRCodeSVG value={qrValue} size={96} level="M" marginSize={0} />
          </div>
          <div className="min-w-0">
            {code ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.16em] text-jet/45">
                  {codeLabel}
                  {admits}
                </p>
                <p className="font-display font-bold text-jet text-2xl md:text-3xl leading-none mt-1 tracking-tight break-all">
                  {code}
                </p>
              </>
            ) : null}
            <p className="text-[11px] text-jet/45 mt-1.5">Show this QR at entry</p>
          </div>
        </div>

        {/* attendees */}
        {attendees && attendees.length > 1 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-jet/45 mb-1.5">
              {attendees.length} {noun}s
            </p>
            <ul className="flex flex-col gap-1">
              {attendees.map((name, i) => (
                <li key={i} className="text-sm text-jet flex items-baseline gap-2">
                  <span className="text-jet/35 tabular-nums">{i + 1}.</span>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
