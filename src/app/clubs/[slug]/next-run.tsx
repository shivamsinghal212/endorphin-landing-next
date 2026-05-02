import type { CSSProperties } from 'react';
import type { Club } from '@/lib/admin-api';
import type { MyMembership } from '@/lib/api';
import type { ClubEvent } from '../page';
import { RsvpButton } from './rsvp-button';

// ─── helpers ────────────────────────────────────────

// Render dates/times in IST regardless of where the page renders (Vercel
// serverless runs in UTC, which would otherwise show the wrong hour).
const TZ = 'Asia/Kolkata';

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

function fmtWeekdayShort(iso: string | null | undefined) {
  return fmtIn(iso, { weekday: 'short' });
}

function fmtTime12h(iso: string | null | undefined) {
  return fmtIn(iso, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function fmtDayNum(iso: string | null | undefined) {
  return fmtIn(iso, { day: 'numeric' });
}

function fmtMonthLong(iso: string | null | undefined) {
  return fmtIn(iso, { month: 'long' });
}

function fmtFullDate(iso: string | null | undefined) {
  return fmtIn(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtDistance(km: number | null | undefined) {
  if (km == null) return '';
  return `${km}K`;
}

function stripTitleEnd(title: string) {
  return title.trim().replace(/[.!?…]+$/, '');
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
  const kickerBits = ['Next run', club.name, time].filter(Boolean);
  const kicker = kickerBits.join(' · ');
  const headerEyebrow = fmtFullDate(event.startTime);
  const summary = event.description || '';

  const distance = event.distanceKm != null ? fmtDistance(event.distanceKm) : '—';
  const where = event.locationName || '—';
  const after = event.recap?.after?.trim() || '';

  const fgStyle: CSSProperties | undefined = hasImage
    ? ({
        ['--nr-flyer' as string]: `url('${event.coverImageUrl}')`,
      } as CSSProperties)
    : undefined;

  return (
    <section className="nr-section" aria-label="Next run">
      <div className="nr-inner">
        {hasImage ? (
          <div className="nr-photo" style={fgStyle}>
            <div className="nr-photo-bg" aria-hidden="true" />
            <div className="nr-photo-fg" aria-hidden="true" />
            <div className="nr-photo-scrim" aria-hidden="true" />
          </div>
        ) : (
          <div className="nr-empty">
            <div className="nr-empty-date" aria-hidden="true">
              <span className="nr-empty-weekday">{fmtWeekdayShort(event.startTime)}</span>
              <span className="nr-empty-num">{fmtDayNum(event.startTime)}</span>
              <span className="nr-empty-month">{fmtMonthLong(event.startTime)}</span>
            </div>
            <span className="sr-only">{headerEyebrow}</span>
            <span className="nr-empty-stencil">
              {[event.locationName, time].filter(Boolean).join(' · ')}
            </span>
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
            {after && (
              <div>
                <dt>After</dt>
                <dd>{after}</dd>
              </div>
            )}
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
      </div>
    </section>
  );
}
