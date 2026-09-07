'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DESKTOP = '(min-width: 768px)';

/** Leave the composer: back where they came from, or home when /create was
 *  opened cold in a fresh tab and there is no history to pop. Mirrors the
 *  composer's own inline X, which is the mobile equivalent. */
function useLeave() {
  const router = useRouter();
  return () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };
}

/**
 * Presents /create as a modal on desktop and as a plain full-page composer
 * on mobile — where a sheet holding a cover upload and eight fields is the
 * whole screen anyway, so an overlay would only add chrome.
 *
 * The split is pure CSS (`md:` variants), NOT a matchMedia branch: rendering
 * a Dialog only above 768px would mean the desktop first paint is the page
 * layout, which then snaps into a modal on hydration. Media queries have no
 * such flash and no SSR/client divergence.
 *
 * This deliberately isn't an intercepting route — /create stays a real,
 * directly-loadable URL, which the nav CTA, shared links and the mobile app
 * all depend on. The trade: the ground behind the scrim is neutral rather
 * than the page you came from (that needs parallel routes).
 */
export default function CreateModalShell({ children }: { children: React.ReactNode }) {
  const leave = useLeave();

  // Esc closes, desktop only — on mobile this is a page, and Esc closing a
  // page would be a surprise (and would fire from an on-screen keyboard).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!window.matchMedia(DESKTOP).matches) return;
      leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  return (
    <div
      className="md:fixed md:inset-0 md:z-[120] md:bg-[rgba(6,5,9,0.82)] md:p-6 md:flex md:items-center md:justify-center"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return; // ignore clicks inside the card
        if (!window.matchMedia(DESKTOP).matches) return;
        leave();
      }}
    >
      {/* The ground the glass refracts, INSIDE the scrim: as a sibling of the
          overlay it painted underneath, so the card blurred the scrim and the
          colour never reached it. Fixed, so it holds while a long draft
          scrolls; inert to pointer events so backdrop-click still closes. */}
      <div className="cx-ground fixed inset-0">
        <span className="cx-blob cx-blob-red" />
        <span className="cx-blob cx-blob-violet" />
        <span className="cx-blob cx-blob-lime" />
        <span className="cx-blob cx-blob-cyan" />
        <span className="cx-grain" />
      </div>

      {/* Column so the header stays put and only the body scrolls. A close
          that scrolls out of reach is the complaint that started this, and
          the composer is always taller than one screen. */}
      <div className="cx-card relative md:backdrop-blur-[26px] md:backdrop-saturate-150 md:flex md:flex-col md:w-full md:max-w-[720px] md:max-h-[calc(100dvh-48px)] rounded-none md:rounded-[22px] md:overflow-hidden">
        <header className="hidden md:flex items-center justify-end shrink-0 h-14 pr-3 pl-6 border-b border-bone/[0.10]">
          <button
            type="button"
            aria-label="Close"
            onClick={leave}
            /* 44px hit area (w-11) with no ring at rest — a static outlined
               circle reads as bolted-on furniture. The surface only appears
               under the cursor, which is the Material state-layer idea. */
            className="grid place-items-center w-11 h-11 rounded-full text-bone/45 transition-colors duration-150 hover:text-bone hover:bg-bone/[0.08] active:bg-bone/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone/30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="md:overflow-y-auto md:overscroll-contain md:min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
