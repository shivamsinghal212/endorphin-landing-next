/**
 * Shared correctness helpers for Event JSON-LD.
 *
 * Three places serialise an Event — the /running-events hub, the
 * /running-events/[slug] detail page, and the
 * /running-events/[slug]/[city] landers — and each had drifted into its own
 * bugs. These live here so a fix lands in all three at once.
 */

/** Schema.org attendance-mode + location pair for one event. */
export interface EventAttendance {
  eventAttendanceMode: string;
  location:
    | { '@type': 'VirtualLocation'; url: string }
    | {
        '@type': 'Place';
        name: string;
        address: Record<string, string | undefined> & { '@type': 'PostalAddress' };
      };
}

/**
 * Is this event virtual?
 *
 * `eventFormat` is the authoritative column; `eventType` is not. They
 * disagree on 37 rows (`event_format='in_person'` alongside
 * `event_type='virtual'`), and 4 genuinely-virtual rows carry
 * `event_format='virtual'` with `event_type=null`. All three builders used
 * to test `eventType === 'virtual'`, so those 4 were served as in-person —
 * e.g. the Great Himalaya Day virtual marathon shipped
 * OfflineEventAttendanceMode with "Virtual · run anywhere" stuffed into
 * PostalAddress.addressLocality.
 */
export function isVirtualEvent(ev: { eventFormat?: string | null }): boolean {
  return ev.eventFormat === 'virtual';
}

/**
 * Never emit an endDate earlier than startDate — Google's Event validator
 * hard-fails it, and 25 of our upcoming events tripped it. Upstream populates
 * `endTime` from the race's *reporting* time ("Reporting 5:00, start 5:30"),
 * which precedes the start and lands on the previous day once converted to
 * UTC. Until the ingest is fixed, fall back to startDate.
 */
export function safeEndDate(startTime: string, endTime?: string | null): string {
  if (!endTime) return startTime;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return startTime;
  return endTime;
}

/**
 * The attendance mode and matching location for one event.
 *
 * A virtual event gets a VirtualLocation with a real URL, never a fabricated
 * PostalAddress. An in-person event gets the Place the caller supplies —
 * callers pass the fullest address they hold, which is why the landers can
 * include addressRegion and the hub cannot.
 */
export function eventAttendance(
  ev: { eventFormat?: string | null; registrationUrl?: string | null },
  place: { name: string; address: Record<string, string | undefined> },
  eventUrl: string,
): EventAttendance {
  if (isVirtualEvent(ev)) {
    return {
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: {
        '@type': 'VirtualLocation',
        url: ev.registrationUrl || eventUrl,
      },
    };
  }
  return {
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: place.name,
      address: { '@type': 'PostalAddress', ...place.address },
    },
  };
}
