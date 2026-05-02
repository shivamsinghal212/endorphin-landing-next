import type { CSSProperties } from 'react';
import type { Club } from '@/lib/admin-api';
import type { MyMembership } from '@/lib/api';
import type { ClubEvent } from '../page';
import { RsvpButton } from './rsvp-button';

// ─── helpers ────────────────────────────────────────

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtWeekdayShort(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? d.toLocaleString('en', { weekday: 'short' }) : '';
}

function fmtDayMonth(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
}

function fmtTime12h(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function fmtDayNum(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? String(d.getDate()) : '';
}

function fmtMonthLong(iso: string | null | undefined) {
  const d = parseDate(iso);
  return d ? d.toLocaleString('en', { month: 'long' }) : '';
}

function fmtFullDate(iso: string | null | undefined) {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toLocaleString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function fmtDistance(km: number | null | undefined) {
  if (km == null) return '';
  return `${km}K`;
}

function stripTitleEnd(title: string) {
  return title.trim().replace(/[.!?…]+$/, '');
}

// Stencil pill text in the photo footer / empty state.
function buildPhotoTag(clubName: string, iso: string) {
  const dm = fmtDayMonth(iso);
  return [`${clubName} flyer`, dm].filter(Boolean).join(' · ');
}

// ─── component ──────────────────────────────────────

export function NextRun({
  event,
  club,
  isAuthed,
  myMembership,
}: {
  event: ClubEvent | null;
  club: Club;
  isAuthed: boolean;
  myMembership: MyMembership | null;
}) {
  if (!event) return null;

  const hasImage = !!event.coverImageUrl;
  const isRace = event.eventType === 'race_event';
  const time = fmtTime12h(event.startTime);
  const titleClean = stripTitleEnd(event.title);
  const kickerBits = [club.name, time].filter(Boolean);
  const kicker = kickerBits.join(' · ');
  const headerEyebrow = fmtFullDate(event.startTime);
  const summary = event.description || '';

  const distance = event.distanceKm != null ? fmtDistance(event.distanceKm) : '—';
  const where = event.locationName || '—';

  const fgStyle: CSSProperties | undefined = hasImage
    ? ({
        ['--nr-flyer' as string]: `url('${event.coverImageUrl}')`,
      } as CSSProperties)
    : undefined;

  return (
    <section className="nr-section" aria-label="Next run">
      <div className="nr-section-rule">
        <h2 className="nr-section-title">Next run.</h2>
        <span className="nr-rule" aria-hidden="true" />
        {headerEyebrow && (
          <span className="nr-section-eyebrow">{headerEyebrow}</span>
        )}
      </div>

      <article className="nr-card">
        {hasImage ? (
          <div className="nr-photo" style={fgStyle}>
            <div className="nr-photo-bg" aria-hidden="true" />
            <div className="nr-photo-fg" aria-hidden="true" />
            <div className="nr-photo-scrim" aria-hidden="true" />
            <span className="nr-photo-tag" aria-hidden="true">
              {buildPhotoTag(club.name, event.startTime)}
            </span>
          </div>
        ) : (
          <div className="nr-empty">
            <span className="nr-empty-eyebrow">{titleClean || 'Next run'}</span>
            <span className="nr-empty-num" aria-hidden="true">
              {fmtDayNum(event.startTime)}
            </span>
            <span className="sr-only">{headerEyebrow}</span>
            <div className="nr-empty-foot">
              <div className="nr-empty-runner" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="13" cy="4" r="2" />
                  <path d="m4 22 4-7-2-3 2-5 4 1 1 4 4 2-2 4 1 4" />
                </svg>
              </div>
              <span className="nr-empty-month">
                {fmtWeekdayShort(event.startTime)} · {fmtMonthLong(event.startTime)}
              </span>
              <span className="nr-empty-stencil">
                {[event.locationName, time].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        )}

        <div className="nr-content">
          <div className="nr-content-top">
            {kicker && <span className="nr-kicker">{kicker}</span>}
            <h3 className="nr-title">
              {titleClean}
              <span aria-hidden="true">.</span>
            </h3>
            {summary && <p className="nr-summary">{summary}</p>}
          </div>

          <dl className="nr-meta">
            <div>
              <dt>Distance</dt>
              <dd>{distance}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd>{time || '—'}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{where}</dd>
            </div>
            <div>
              <dt>After</dt>
              <dd>—</dd>
            </div>
          </dl>

          <div className="nr-cta">
            {!isRace && (
              <RsvpButton
                slug={club.slug}
                clubName={club.name}
                eventId={event.id}
                joinForm={club.joinForm}
                requiresApproval={club.requiresApproval}
                isAuthed={isAuthed}
                myMembership={myMembership}
                variant="primary"
              />
            )}
            <span className="nr-going">
              <strong>{event.goingCount}</strong> going
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}
