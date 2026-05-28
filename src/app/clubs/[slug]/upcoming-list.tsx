'use client';

import { useState } from 'react';
import type { Club } from '@/lib/admin-api';
import type { MyMembership } from '@/lib/api';
import type { ClubEvent } from '../page';
import { RsvpButton } from './rsvp-button';

const TZ = 'Asia/Kolkata';
const INITIAL_VISIBLE = 5;

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtIn(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  const d = parseDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(d);
}

const fmtDay = (iso: string | null | undefined) => fmtIn(iso, { weekday: 'short' });
const fmtDayNum = (iso: string | null | undefined) =>
  fmtIn(iso, { day: '2-digit' }).padStart(2, '0');
const fmtMonth = (iso: string | null | undefined) => fmtIn(iso, { month: 'short' });
const fmtTime = (iso: string | null | undefined) =>
  fmtIn(iso, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s+/g, ' ');

export function UpcomingList({
  events,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: {
  events: ClubEvent[];
  slug: string;
  clubName: string;
  joinForm: Club['joinForm'];
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflow = events.length > INITIAL_VISIBLE;
  const hiddenCount = events.length - INITIAL_VISIBLE;

  return (
    <section className="upcoming">
      <div className="upcoming-header">
        <h2 className="upcoming-title">Upcoming</h2>
        <span className="kicker upcoming-count">
          {events.length} {events.length === 1 ? 'run' : 'runs'} scheduled
        </span>
      </div>

      {/* Render every row in HTML so Googlebot and AI crawlers index all
          upcoming events without needing client hydration. Overflow rows
          beyond INITIAL_VISIBLE are hidden via CSS until the user expands. */}
      {events.map((event, i) => {
        const isOverflow = overflow && i >= INITIAL_VISIBLE && !expanded;
        return (
          <UpcomingRow
            key={event.id}
            event={event}
            hidden={isOverflow}
            slug={slug}
            clubName={clubName}
            joinForm={joinForm}
            requiresApproval={requiresApproval}
            isAuthed={isAuthed}
            myMembership={myMembership}
          />
        );
      })}

      {overflow && (
        <div className="upcoming-more">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        </div>
      )}
    </section>
  );
}

function UpcomingRow({
  event,
  hidden = false,
  slug,
  clubName,
  joinForm,
  requiresApproval,
  isAuthed,
  myMembership,
}: {
  event: ClubEvent;
  hidden?: boolean;
  slug: string;
  clubName: string;
  joinForm: Club['joinForm'];
  requiresApproval: boolean;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  const isRace = event.eventType === 'race_event';
  const tagLabel = isRace ? 'Race event' : 'Club run';
  const meta = [event.locationName, fmtTime(event.startTime)].filter(Boolean).join(' · ');

  // Only render the expand affordance if there's something worth showing
  // beyond what the compact row already covers.
  const description = event.description?.trim();
  const hasExtra = !!event.coverImageUrl || !!description;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`upcoming-row-wrapper${hidden ? ' upcoming-row--hidden' : ''}${expanded ? ' is-expanded' : ''}`}
      aria-hidden={hidden ? 'true' : undefined}
    >
      <div className="upcoming-row">
        <button
          type="button"
          className="upcoming-row-trigger"
          aria-expanded={expanded}
          aria-controls={hasExtra ? `event-${event.id}-details` : undefined}
          onClick={() => hasExtra && setExpanded((x) => !x)}
          disabled={!hasExtra}
        >
          <div>
            <div className="row-date">{fmtDayNum(event.startTime)}</div>
            <div className="kicker row-date-sub">
              {fmtDay(event.startTime)} · {fmtMonth(event.startTime)}
            </div>
          </div>
          <div>
            <span className={`row-type ${isRace ? 'row-type-race' : 'row-type-club'}`}>
              {tagLabel}
            </span>
            <div className="row-title">
              {event.title}
              {hasExtra && (
                <span className="row-chevron" aria-hidden="true">
                  {expanded ? '▾' : '▸'}
                </span>
              )}
            </div>
            <div className="row-meta" data-going={event.goingCount}>
              {meta}
            </div>
          </div>
        </button>
        <div className="row-actions">
          {event.goingCount > 0 && (
            <span className="going-pill">{event.goingCount} going</span>
          )}
          {isRace ? (
            <button className="btn btn-ghost" type="button">
              Details
            </button>
          ) : (
            <RsvpButton
              slug={slug}
              clubName={clubName}
              eventId={event.id}
              joinForm={joinForm}
              requiresApproval={requiresApproval}
              isAuthed={isAuthed}
              myMembership={myMembership}
              variant="primary"
            />
          )}
        </div>
      </div>
      {hasExtra && expanded && (
        <div
          id={`event-${event.id}-details`}
          className="upcoming-row-details"
        >
          {event.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="upcoming-row-flyer"
              src={event.coverImageUrl}
              alt=""
              loading="lazy"
            />
          )}
          {description && (
            <p className="upcoming-row-description">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}
