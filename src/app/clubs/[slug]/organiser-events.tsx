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

const fmtTime = (iso: string | null | undefined) =>
  fmtIn(iso, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s+/g, ' ');

const fmtDayNum = (iso: string | null | undefined) =>
  fmtIn(iso, { day: '2-digit' }).padStart(2, '0');
const fmtDay = (iso: string | null | undefined) => fmtIn(iso, { weekday: 'short' });
const fmtMonth = (iso: string | null | undefined) => fmtIn(iso, { month: 'short' });

// Upcoming ticketed races published by the organiser this club is linked to.
// Backend already filters to live + public + future events, so this only ever
// renders things worth registering for. Styled with the /for-clubs chromatic
// vibe so it pops off the otherwise-light club page.
export function OrganiserEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="lookout">
      <div className="lookout-inner">
        <div className="lookout-head">
          <span className="lookout-eyebrow">Don&apos;t miss out</span>
          <h2 className="lookout-title">
            Events to <em>look out for</em>
          </h2>
        </div>

        <div className="lookout-grid">
          {events.map((event) => {
            const poster = event.coverImageUrl || event.imageUrl;
            const meta = [fmtTime(event.startTime), event.locationName]
              .filter(Boolean)
              .join(' · ');
            return (
              <a
                key={event.id}
                href={eventPath(event)}
                className={`lookout-card${poster ? '' : ' lookout-card--noposter'}`}
              >
                {poster && (
                  <div className="lookout-poster">
                    {/* Blurred fill behind the contained flyer so portrait
                        posters show in full (no crop) without empty bars. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="lookout-poster-bg" src={poster} alt="" aria-hidden="true" loading="lazy" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="lookout-poster-fg" src={poster} alt={event.title} loading="lazy" />
                  </div>
                )}
                <div className="lookout-body">
                  <div className="lookout-row">
                    <div className="lookout-datenum">
                      <b>{fmtDayNum(event.startTime)}</b>
                      <small>
                        {fmtDay(event.startTime)} · {fmtMonth(event.startTime)}
                      </small>
                    </div>
                    <div className="lookout-info">
                      <h3 className="lookout-name">{event.title}</h3>
                      {meta && <div className="lookout-where">{meta}</div>}
                    </div>
                  </div>
                  <span className="lookout-cta">
                    Register
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
