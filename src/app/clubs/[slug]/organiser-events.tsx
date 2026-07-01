import Link from 'next/link';
import type { Event } from '@/lib/api';
import { eventPath } from '@/lib/event-path';

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

const fmtDay = (iso: string | null | undefined) => fmtIn(iso, { weekday: 'short' });
const fmtDayNum = (iso: string | null | undefined) =>
  fmtIn(iso, { day: '2-digit' }).padStart(2, '0');
const fmtMonth = (iso: string | null | undefined) => fmtIn(iso, { month: 'short' });
const fmtTime = (iso: string | null | undefined) =>
  fmtIn(iso, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s+/g, ' ');

// Ticketed races this club publishes as a paid-events organiser. Distinct from
// the community runs served by /clubs/{slug}/events — these link out to the
// organiser event page (/running-events/{slug}) where registration happens.
export function OrganiserEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="upcoming">
      <div className="upcoming-header">
        <h2 className="upcoming-title">Races &amp; ticketed events</h2>
        <span className="kicker upcoming-count">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {events.map((event) => {
        const meta = [event.locationName, fmtTime(event.startTime)]
          .filter(Boolean)
          .join(' · ');
        const price =
          event.priceMin != null && event.priceMin > 0
            ? `From ₹${event.priceMin.toLocaleString('en-IN')}`
            : 'Free';
        return (
          <div className="upcoming-row-wrapper" key={event.id}>
            <Link href={eventPath(event)} className="upcoming-row org-event-row">
              <div className="upcoming-row-trigger">
                <div>
                  <div className="row-date">{fmtDayNum(event.startTime)}</div>
                  <div className="kicker row-date-sub">
                    {fmtDay(event.startTime)} · {fmtMonth(event.startTime)}
                  </div>
                </div>
                <div>
                  <span className="row-type row-type-race">Race event</span>
                  <div className="row-title">{event.title}</div>
                  <div className="row-meta">{meta}</div>
                </div>
              </div>
              <div className="row-actions">
                <span className="going-pill">{price}</span>
                <span className="btn btn-ghost">Register</span>
              </div>
            </Link>
          </div>
        );
      })}
    </section>
  );
}
