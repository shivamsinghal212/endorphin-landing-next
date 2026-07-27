/**
 * Self-check for eventPlaceJsonLd — the guard that keeps Event JSON-LD out of
 * Search Console's "Missing field 'location'" error bucket.
 *
 * Run: node --experimental-strip-types src/lib/event-seo.check.mts
 */
import assert from 'node:assert';
import { eventPlaceJsonLd } from './event-seo.ts';

type Addr = { streetAddress?: string; addressLocality?: string; addressRegion?: string; addressCountry?: string };

// The two Search Console failures: club events with no venue filled in.
const bare = eventPlaceJsonLd({ locationName: null, locationAddress: null, city: 'New Delhi' });
assert.equal(bare.name, 'New Delhi');
assert.equal((bare.address as Addr).addressLocality, 'New Delhi');

// Nothing known at all — still a valid Place, never undefined.
const nothing = eventPlaceJsonLd({});
assert.equal(nothing.name, 'India');
assert.equal((nothing.address as Addr).addressCountry, 'IN');

// Full data still wins, street address and region preserved.
const full = eventPlaceJsonLd({
  locationName: 'Sunder Nursery',
  locationAddress: 'Bharat Scouts Rd',
  city: 'New Delhi',
  region: 'Delhi',
});
assert.equal(full.name, 'Sunder Nursery');
assert.equal((full.address as Addr).streetAddress, 'Bharat Scouts Rd');
assert.equal((full.address as Addr).addressRegion, 'Delhi');

// No emitter can produce a location-less Event again, whatever it passes in.
for (const c of [{}, { city: null }, { locationName: '' }, { locationAddress: '' }]) {
  assert.ok(eventPlaceJsonLd(c).name, `empty name for ${JSON.stringify(c)}`);
}

console.log('ok — location always present');
