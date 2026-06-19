// Twitter share card for /clubs — identical to the Open Graph card. The
// root layout sets a site-wide twitter.images default, so the
// opengraph-image file convention alone doesn't override twitter:image for
// this route; this twitter-image convention does. Re-exports the same
// generator so both cards stay in sync.
export const runtime = 'nodejs';
export { default, alt, size, contentType } from './opengraph-image';
