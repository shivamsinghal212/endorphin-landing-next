/**
 * Self-check for the Event JSON-LD helpers. No test framework — run it:
 *
 *   node src/lib/event-schema.check.ts
 *
 * Node strips the types natively (v22.6+). Exits non-zero on failure.
 */
import assert from 'node:assert/strict';
import { eventAttendance, isVirtualEvent, safeEndDate } from './event-schema.ts';

// ---- safeEndDate: never earlier than the start -------------------------
const start = '2026-09-13T00:00:00Z';

// The real bug: reporting time lands on the previous day.
assert.equal(safeEndDate(start, '2026-09-12T23:30:00Z'), start, 'end before start must fall back');
// A genuine finish time survives.
assert.equal(safeEndDate(start, '2026-09-13T04:00:00Z'), '2026-09-13T04:00:00Z', 'valid end kept');
// Equal is allowed — Google requires end >= start, not strictly greater.
assert.equal(safeEndDate(start, start), start, 'equal end kept');
// Absent or unparseable end times degrade to the start.
assert.equal(safeEndDate(start, null), start, 'null end -> start');
assert.equal(safeEndDate(start, undefined), start, 'undefined end -> start');
assert.equal(safeEndDate(start, 'not-a-date'), start, 'garbage end -> start');
// Offset forms must compare as instants, not strings: this end is LATER than
// the start despite sorting earlier lexicographically.
assert.equal(
  safeEndDate('2026-09-13T00:00:00Z', '2026-09-12T20:00:00-05:00'),
  '2026-09-12T20:00:00-05:00',
  'offset end later in real time must be kept',
);

// ---- isVirtualEvent: eventFormat is authoritative, eventType is not ----
assert.equal(isVirtualEvent({ eventFormat: 'virtual' }), true, 'eventFormat virtual');
assert.equal(isVirtualEvent({ eventFormat: 'in_person' }), false, 'eventFormat in_person');
assert.equal(isVirtualEvent({}), false, 'missing eventFormat is not virtual');
// The 37 rows that say event_type='virtual' while event_format='in_person'
// must NOT be treated as virtual.
assert.equal(
  isVirtualEvent({ eventFormat: 'in_person', eventType: 'virtual' } as { eventFormat: string }),
  false,
  'eventType must not win over eventFormat',
);

// ---- eventAttendance: no fabricated PostalAddress on virtual events ----
const place = { name: 'Marine Drive', address: { addressLocality: 'Mumbai', addressCountry: 'IN' } };

const online = eventAttendance(
  { eventFormat: 'virtual', registrationUrl: 'https://example.test/reg' },
  place,
  'https://www.endorfin.run/running-events/x',
);
assert.equal(online.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
assert.equal(online.location['@type'], 'VirtualLocation');
assert.equal(
  (online.location as { url: string }).url,
  'https://example.test/reg',
  'virtual uses the registration URL',
);
assert.ok(!('address' in online.location), 'virtual must not carry a PostalAddress');

// Falls back to the event URL when there is no registration URL.
const onlineNoReg = eventAttendance({ eventFormat: 'virtual' }, place, 'https://www.endorfin.run/e');
assert.equal((onlineNoReg.location as { url: string }).url, 'https://www.endorfin.run/e');

const offline = eventAttendance({ eventFormat: 'in_person' }, place, 'https://www.endorfin.run/e');
assert.equal(offline.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
assert.equal(offline.location['@type'], 'Place');
const addr = (offline.location as { address: Record<string, string> }).address;
assert.equal(addr['@type'], 'PostalAddress', 'Place address is typed');
assert.equal(addr.addressLocality, 'Mumbai');

console.log('event-schema: all checks passed');
