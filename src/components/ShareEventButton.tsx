'use client';

import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { toast } from 'sonner';

/**
 * Share entry point for a club event. On devices with the Web Share API
 * (most phones — the Instagram-bio / WhatsApp case) the primary button fires
 * the native sheet. Elsewhere it opens a small popover with explicit
 * WhatsApp / Instagram / Copy actions.
 *
 * Every outbound link carries per-channel UTM tags so PostHog/GA can
 * attribute RSVPs back to a share. The page's canonical tag is param-free,
 * so the tagged URLs never create duplicate-content problems for SEO.
 */

type Channel = 'native' | 'whatsapp' | 'instagram' | 'copy';

export interface ShareEventButtonProps {
  /** Canonical, param-free event URL. */
  url: string;
  title: string;
  /** Pre-formatted date/time label, e.g. "Sat 14 Jun · 6:00 am". */
  dateLabel?: string;
  locationLabel?: string | null;
  clubName?: string | null;
  /** For analytics — which surface the share fired from. */
  source?: string;
  /** 'button' = full size (matches Remind Me); 'compact' = shorter (event rows). */
  variant?: 'button' | 'compact';
  eventSlug?: string;
  className?: string;
}

function withUtm(url: string, channel: Channel): string {
  // 'native' shares the bare canonical link — the OS sheet hands off to an
  // app we can't tag per-destination, so adding a fixed source would lie.
  if (channel === 'native') return url;
  const sep = url.includes('?') ? '&' : '?';
  const params = new URLSearchParams({
    utm_source: channel,
    utm_medium: 'share',
    utm_campaign: 'club_event',
  });
  return `${url}${sep}${params.toString()}`;
}

export default function ShareEventButton({
  url,
  title,
  dateLabel,
  locationLabel,
  clubName,
  source = 'event_page',
  variant = 'button',
  eventSlug,
  className,
}: ShareEventButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const metaBits = [dateLabel, locationLabel].filter(Boolean).join(' · ');
  const withClub = clubName ? ` with ${clubName}` : '';
  const caption = `${title}${metaBits ? ` · ${metaBits}` : ''}${withClub}. RSVP on Endorfin:`;

  const track = (channel: Channel) => {
    posthog.capture('club_event_share_clicked', {
      channel,
      source,
      event_slug: eventSlug,
    });
  };

  const copyText = async (channel: Channel) => {
    const text = `${caption} ${withUtm(url, channel)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied — paste it anywhere');
    } catch {
      toast.error('Couldn’t copy. Long-press the link to copy it.');
    }
  };

  const nativeShare = async () => {
    track('native');
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof navigator !== 'undefined' && nav.share) {
      try {
        await nav.share({ title, text: caption, url: withUtm(url, 'native') });
      } catch {
        /* user dismissed — no-op */
      }
      return;
    }
    // No native sheet (desktop) — reveal the explicit channels instead.
    setOpen((v) => !v);
  };

  const openWhatsApp = () => {
    track('whatsapp');
    const text = `${caption} ${withUtm(url, 'whatsapp')}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener',
    );
    setOpen(false);
  };

  const openInstagram = () => {
    track('instagram');
    void copyText('instagram');
    // IG accepts no pre-filled text — copy the caption, send them to IG to paste.
    window.open('https://www.instagram.com/', '_blank', 'noopener');
    setOpen(false);
  };

  const copyLink = () => {
    track('copy');
    void copyText('copy');
    setOpen(false);
  };

  const ShareIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );

  // Reuse the global Remind-Me button styling so Share sits flush beside it:
  // bordered ghost, uppercase Oswald, jet→fill on hover. `is-compact` shrinks
  // it to match the compact reminder button used in event rows.
  const btnClass =
    className ?? `v1-remind-btn${variant === 'compact' ? ' is-compact' : ''}`;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={nativeShare}
        aria-label="Share this event"
        aria-haspopup="menu"
        aria-expanded={open}
        className={btnClass}
      >
        {ShareIcon}
        <span className="v1-remind-label">Share</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-20 top-full mt-2 right-0 w-44 rounded-xl border border-jet/15 bg-white shadow-lg p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openWhatsApp}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-jet hover:bg-jet/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.43 0 .07 5.36.07 11.97c0 2.11.55 4.16 1.6 5.98L0 24l6.2-1.62a11.96 11.96 0 0 0 5.84 1.49h.01c6.6 0 11.96-5.36 11.96-11.97 0-3.2-1.24-6.2-3.49-8.42zM12.04 21.7h-.01a9.7 9.7 0 0 1-4.95-1.36l-.36-.21-3.68.97.98-3.6-.23-.37a9.7 9.7 0 0 1-1.49-5.17c0-5.36 4.36-9.72 9.74-9.72 2.6 0 5.04 1.01 6.88 2.85a9.66 9.66 0 0 1 2.85 6.87c0 5.37-4.36 9.73-9.73 9.73zm5.34-7.28c-.29-.15-1.74-.86-2-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.15-.17.2-.34.22-.63.07-.29-.14-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.14-.17.19-.29.29-.49.1-.2.05-.36-.02-.51-.07-.15-.66-1.6-.91-2.18-.24-.57-.49-.5-.66-.51l-.56-.01c-.2 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.44 0 1.44 1.04 2.83 1.19 3.03.15.2 2.06 3.14 4.99 4.4.7.3 1.24.48 1.66.62.7.22 1.33.19 1.84.12.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34z" />
            </svg>
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={openInstagram}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-jet hover:bg-jet/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            Instagram
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-jet hover:bg-jet/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy link
          </button>
        </div>
      )}
    </div>
  );
}
