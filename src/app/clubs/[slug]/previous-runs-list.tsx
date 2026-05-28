'use client';

import { useState } from 'react';
import type { ClubEvent } from '../page';
import { RunGallery } from './run-gallery';

// All formatters pin to Asia/Kolkata so the server (Vercel runs in
// UTC) and the client (typically IST = UTC+5:30) produce identical
// strings. Without this, events near midnight UTC render with a
// different day-of-month on each side and trigger React hydration
// error #418.
const TZ = 'Asia/Kolkata';

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtIn(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions,
): string {
  const d = parseDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(d);
}

function fmtDay(iso: string | null | undefined) {
  return fmtIn(iso, { weekday: 'short' });
}

function fmtDayNum(iso: string | null | undefined) {
  // Intl always emits at least 1 digit; pad to 2 for consistent UI
  // (some events render "9" vs others "10").
  return fmtIn(iso, { day: '2-digit' }).padStart(2, '0');
}

function fmtMonth(iso: string | null | undefined) {
  return fmtIn(iso, { month: 'short' });
}

function RunRow({ event }: { event: ClubEvent }) {
  const [open, setOpen] = useState(false);
  const isRace = event.eventType === 'race_event';
  const recap = event.recap;
  const photos = recap?.photos ?? [];
  const videos = recap?.videos ?? [];

  const showedUp = recap?.showedUp;
  const distance = event.distanceKm;
  const after = recap?.after;

  return (
    <article className="prev-row" data-open={open}>
      <button
        type="button"
        className="prev-row-header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="prev-row-date">
          {fmtDayNum(event.startTime)}
          <span className="month">{fmtDay(event.startTime)} · {fmtMonth(event.startTime)}</span>
        </div>
        <div className="prev-row-id">
          <span className={`prev-row-tag ${isRace ? 'race' : ''}`}>{isRace ? 'Race event' : 'Club run'}</span>
          <h4 className="prev-row-title">{event.title}</h4>
        </div>
      </button>

      <div className="prev-row-body-wrap" aria-hidden={!open}>
        <div className="prev-row-body">
          <div className="prev-row-body-inner">
            {recap?.summary && <p className="last-run-summary">{recap.summary}</p>}

            <div className="last-run-meta" aria-label="Run summary">
              {showedUp != null && (
                <div className="row">
                  <span className="row-label">Showed up</span>
                  <span className="row-value">{showedUp}</span>
                </div>
              )}
              {distance != null && (
                <div className="row">
                  <span className="row-label">Distance</span>
                  <span className="row-value">{distance}<span className="unit">km</span></span>
                </div>
              )}
              {recap?.paceGroups && (
                <div className="row">
                  <span className="row-label">Pace</span>
                  <span className="row-value">{recap.paceGroups}</span>
                </div>
              )}
              {after && (
                <div className="row">
                  <span className="row-label">After</span>
                  <span className="row-value">{after}</span>
                </div>
              )}
            </div>

            {(photos.length > 0 || videos.length > 0) && (
              <RunGallery photos={photos} videos={videos} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const INITIAL_VISIBLE = 5;

export function PreviousRunsList({ events }: { events: ClubEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  if (events.length === 0) return null;
  const overflow = events.length > INITIAL_VISIBLE;
  const visible = expanded || !overflow ? events : events.slice(0, INITIAL_VISIBLE);
  const hiddenCount = events.length - INITIAL_VISIBLE;

  return (
    <div className="prev-rows">
      <div className="prev-rows-hint kicker">Click any run to expand</div>
      <div className="prev-rows-list">
        {visible.map((e) => <RunRow key={e.id} event={e} />)}
      </div>
      {overflow && (
        <div className="prev-rows-more">
          <button
            type="button"
            className="btn btn-ghost-light"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        </div>
      )}
    </div>
  );
}
