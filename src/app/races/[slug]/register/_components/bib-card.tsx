'use client';

import { toast } from 'sonner';

const IST = 'Asia/Kolkata';

export function fmtBibDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST,
  });
}

/** Race bib visual.
 *  Real-bib feel: red header band, participant name on top, BIG bib
 *  number filling the body in a single line, dashed divider with the
 *  distance chip and a faux timing-barcode on the right edge for
 *  print-poster character. Heavy jet border + corner perforations
 *  carry the chest-pinned-paper look.
 *
 *  Shared by `AlreadyRegisteredView` (registration page when the runner
 *  already has a paid registration) and the post-payment success
 *  screen — keeping the visual identical across both surfaces.
 */
export function BibCard({
  eventTitle,
  bibNumber,
  participantName,
  distance,
}: {
  eventTitle: string;
  bibNumber: string;
  participantName: string;
  distance: string;
}) {
  // Strip "10K · 10 km" → "10 km" (or just first segment if no dot).
  // Organiser-stored fullTitle is "10K · 10 km"; categoryName is "10K".
  // We want the most concise human label.
  const distanceLabel = (() => {
    const raw = (distance || '').trim();
    if (!raw) return '';
    const segments = raw.split('·').map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) return raw;
    // Prefer the segment with a km/mi unit if present.
    const withUnit = segments.find((s) => /(km|mi)\b/i.test(s));
    return withUnit ?? segments[segments.length - 1];
  })();

  const year = new Date().getFullYear();

  return (
    <div className="relative bg-bone border-2 border-jet rounded-xl mx-auto max-w-md shadow-[0_18px_40px_-16px_rgba(10,10,10,0.45)] overflow-hidden">
      {/* Corner perforations */}
      <span aria-hidden className="absolute top-2 left-2 w-2 h-2 rounded-full bg-jet z-10" />
      <span aria-hidden className="absolute top-2 right-2 w-2 h-2 rounded-full bg-jet z-10" />
      <span aria-hidden className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-jet z-10" />
      <span aria-hidden className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-jet z-10" />

      {/* Header band — Endorfin lockup + event title + year */}
      <div className="relative bg-signal text-bone px-6 py-3.5 border-b-2 border-jet overflow-hidden">
        {/* Decorative diagonal stripes — adds texture to the red band */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 8px, rgba(245,240,235,0.6) 8px 9px)',
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <span className="font-display uppercase text-[10px] tracking-[0.18em] text-bone/85 leading-none">
            Endorfin
          </span>
          <span className="font-display uppercase text-[10px] tracking-[0.18em] text-bone/85 leading-none">
            #{year}
          </span>
        </div>
        <p className="relative font-display uppercase font-bold text-lg md:text-xl mt-1 leading-tight text-center truncate">
          {eventTitle}
        </p>
      </div>

      {/* Body */}
      <div className="px-6 pt-5 pb-5">
        {/* Participant name */}
        <p className="text-[9px] uppercase tracking-[0.2em] text-jet/45 text-center">
          Participant
        </p>
        <p className="font-display uppercase font-bold text-jet text-lg md:text-xl text-center leading-tight mt-0.5 truncate">
          {participantName || '—'}
        </p>

        {/* Hairline divider */}
        <div className="my-4 flex items-center gap-2">
          <span aria-hidden className="flex-1 h-px bg-jet/20" />
          <span aria-hidden className="w-1 h-1 rounded-full bg-jet/30" />
          <span aria-hidden className="flex-1 h-px bg-jet/20" />
        </div>

        {/* The number — single line, fluid sizing that respects the
         *  bib width so 8-char numbers like END-0002 never wrap. */}
        <p className="text-[9px] uppercase tracking-[0.2em] text-jet/45 text-center">
          Bib number
        </p>
        <p
          className="font-display font-bold text-jet text-center leading-[0.95] tracking-tight whitespace-nowrap mt-1"
          style={{ fontSize: 'clamp(48px, 14vw, 80px)' }}
        >
          {bibNumber}
        </p>
      </div>

      {/* Dashed divider — looks like a perforated tear line */}
      <div aria-hidden className="border-t-2 border-dashed border-jet/60 mx-4" />

      {/* Footer — distance pill + faux barcode for character */}
      <div className="px-6 py-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-jet text-bone font-display uppercase text-xs font-bold tracking-wider leading-none">
            {distanceLabel || 'Distance'}
          </span>
        </div>
        {/* Faux timing barcode — pure decoration, evokes the timing-chip
         *  strip on real race bibs. Deterministic stripes. */}
        <span aria-hidden className="inline-flex items-center gap-[2px] opacity-80">
          {[2, 1, 3, 1, 2, 1, 4, 1, 2, 1, 3, 1, 2, 1, 2].map((w, i) => (
            <span
              key={i}
              className="bg-jet"
              style={{ width: `${w}px`, height: '20px' }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/** Sharing toolbar — Web Share API as the primary action (mobile-native),
 *  with explicit WhatsApp/Instagram/Copy fallbacks for desktop. */
export function ShareRow({
  eventTitle,
  bibNumber,
  distance,
  eventSlug,
}: {
  eventTitle: string;
  bibNumber: string;
  distance: string;
  eventSlug: string;
}) {
  const buildShareText = () => {
    const distancePart = distance ? ` (${distance})` : '';
    return `Just registered for ${eventTitle}${distancePart} on @Endorfin 🏃 My bib is ${bibNumber}.`;
  };
  const buildShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/races/${encodeURIComponent(eventSlug)}`;
  };

  const copyLink = async () => {
    const text = `${buildShareText()} ${buildShareUrl()}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied — paste it anywhere');
    } catch {
      toast.error('Couldn’t copy. Long-press to copy from the address bar.');
    }
  };

  const handleNativeShare = async () => {
    const url = buildShareUrl();
    const text = buildShareText();
    if (
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share
    ) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: eventTitle,
          text,
          url,
        });
      } catch {
        /* user dismissed — no-op */
      }
    } else {
      void copyLink();
    }
  };

  const whatsAppUrl = () => {
    const text = `${buildShareText()} ${buildShareUrl()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const openInstagram = () => {
    void copyLink();
    if (typeof window === 'undefined') return;
    window.open('https://www.instagram.com/', '_blank', 'noopener');
  };

  return (
    <div className="mt-6">
      <p className="text-[10px] uppercase tracking-widest text-jet/45 mb-2">
        Share your bib
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
        <a
          href={whatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm font-medium hover:bg-jet/5"
          aria-label="Share on WhatsApp"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.43 0 .07 5.36.07 11.97c0 2.11.55 4.16 1.6 5.98L0 24l6.2-1.62a11.96 11.96 0 0 0 5.84 1.49h.01c6.6 0 11.96-5.36 11.96-11.97 0-3.2-1.24-6.2-3.49-8.42zM12.04 21.7h-.01a9.7 9.7 0 0 1-4.95-1.36l-.36-.21-3.68.97.98-3.6-.23-.37a9.7 9.7 0 0 1-1.49-5.17c0-5.36 4.36-9.72 9.74-9.72 2.6 0 5.04 1.01 6.88 2.85a9.66 9.66 0 0 1 2.85 6.87c0 5.37-4.36 9.73-9.73 9.73zm5.34-7.28c-.29-.15-1.74-.86-2-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.15-.17.2-.34.22-.63.07-.29-.14-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.14-.17.19-.29.29-.49.1-.2.05-.36-.02-.51-.07-.15-.66-1.6-.91-2.18-.24-.57-.49-.5-.66-.51l-.56-.01c-.2 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.44 0 1.44 1.04 2.83 1.19 3.03.15.2 2.06 3.14 4.99 4.4.7.3 1.24.48 1.66.62.7.22 1.33.19 1.84.12.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34z" />
          </svg>
          WhatsApp
        </a>
        <button
          type="button"
          onClick={openInstagram}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm font-medium hover:bg-jet/5"
          aria-label="Share on Instagram (copies caption)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          Instagram
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-jet/15 text-jet text-sm font-medium hover:bg-jet/5"
          aria-label="Copy share link"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>
      <p className="mt-2 text-[11px] text-jet/40">
        Instagram doesn’t accept pre-filled posts — the caption is copied so you can paste it.
      </p>
    </div>
  );
}
