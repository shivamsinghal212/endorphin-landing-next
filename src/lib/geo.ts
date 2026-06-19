import 'server-only';
import { headers } from 'next/headers';

/**
 * Approximate visitor location from Vercel's edge geo headers. Vercel injects
 * `x-vercel-ip-city` (URL-encoded, e.g. "New%20Delhi"), `x-vercel-ip-country`
 * (ISO-2), and `x-vercel-ip-country-region` on every request. Off Vercel
 * (local dev, other hosts) these are absent → we return nulls and callers
 * fall back to national results.
 *
 * Reading headers() opts a route into dynamic rendering; /clubs is already
 * dynamic (it reads the session cookie), so this adds no caching cost there.
 */
export interface GeoLocation {
  city: string | null;
  country: string | null;
}

export async function getRequestGeo(): Promise<GeoLocation> {
  const h = await headers();
  const rawCity = h.get('x-vercel-ip-city');
  const country = h.get('x-vercel-ip-country');
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity).trim() || null;
    } catch {
      city = rawCity.trim() || null;
    }
  }
  // Dev/QA override: Vercel's geo headers don't exist on localhost, so without
  // this the rail always hits the national fallback. Set DEV_GEO_CITY in
  // .env.local (e.g. "Delhi") to simulate a visitor's city. Never set in
  // production — the real edge header is always preferred when present.
  if (!city && process.env.NODE_ENV !== 'production') {
    const devCity = process.env.DEV_GEO_CITY?.trim();
    if (devCity) return { city: devCity, country: country?.toUpperCase() ?? 'IN' };
  }
  return { city, country: country?.toUpperCase() ?? null };
}
