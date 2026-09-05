/**
 * Google Places proxy for the event composer's location field.
 *
 * Server-side so the key never reaches the browser — it can then be locked
 * to this deployment's IPs rather than an HTTP referrer, and we avoid
 * shipping the ~100KB Maps JS bundle to a public marketing page just to
 * autocomplete one field.
 *
 * Set `GOOGLE_MAPS_API_KEY` with the **Places API (New)** enabled. Without
 * it every call returns `{ configured: false }` and the field downgrades to
 * a plain text input rather than breaking.
 *
 *   GET /api/places?q=bandstand        → suggestions
 *   GET /api/places?placeId=ChIJ...    → resolved address + coordinates
 */
import { NextResponse } from 'next/server';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_FIELDS = 'id,displayName,formattedAddress,location';

export interface PlaceSuggestion {
  placeId: string;
  /** Venue or street name — what goes in "location". */
  mainText: string;
  /** City / area context — shown under the main text. */
  secondaryText: string;
}

export async function GET(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    // Not an error: the composer treats this as "typing only".
    return NextResponse.json({ configured: false, suggestions: [] });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const q = searchParams.get('q');

  try {
    if (placeId) {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAILS_FIELDS },
          cache: 'no-store',
        },
      );
      if (!res.ok) {
        return NextResponse.json(
          { configured: true, error: 'lookup failed' },
          { status: 502 },
        );
      }
      const d = await res.json();
      return NextResponse.json({
        configured: true,
        place: {
          name: d?.displayName?.text ?? '',
          address: d?.formattedAddress ?? '',
          latitude: d?.location?.latitude ?? null,
          longitude: d?.location?.longitude ?? null,
        },
      });
    }

    const input = (q ?? '').trim();
    // Two characters is where suggestions start being worth a request.
    if (input.length < 2) {
      return NextResponse.json({ configured: true, suggestions: [] });
    }

    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json' },
      // India-biased, matching the rest of the product. Not a hard filter —
      // `includedRegionCodes` still returns nothing outside it, which is the
      // intent for now; drop it when events go international.
      body: JSON.stringify({ input, includedRegionCodes: ['in'] }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, error: 'autocomplete failed', suggestions: [] },
        { status: 502 },
      );
    }
    const data = await res.json();
    const suggestions: PlaceSuggestion[] = (data?.suggestions ?? [])
      .map((s: Record<string, never>) => {
        const p = (s as Record<string, Record<string, unknown>>)?.placePrediction;
        if (!p) return null;
        const sf = p.structuredFormat as
          | { mainText?: { text?: string }; secondaryText?: { text?: string } }
          | undefined;
        return {
          placeId: String(p.placeId ?? ''),
          mainText:
            sf?.mainText?.text ??
            ((p.text as { text?: string } | undefined)?.text ?? ''),
          secondaryText: sf?.secondaryText?.text ?? '',
        };
      })
      .filter((s: PlaceSuggestion | null): s is PlaceSuggestion => !!s?.placeId)
      .slice(0, 6);

    return NextResponse.json({ configured: true, suggestions });
  } catch {
    // Network blip — the field stays usable as free text.
    return NextResponse.json(
      { configured: true, error: 'unavailable', suggestions: [] },
      { status: 502 },
    );
  }
}
