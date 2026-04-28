'use client';

import { useEffect, useState } from 'react';
import { resolveStoreUrl } from './store-links';

/**
 * Returns the right destination for a "Download" CTA based on UA:
 *  - iOS  → App Store deep link
 *  - Android → Play Store deep link
 *  - Desktop / unknown → fallbackHref (default `/#download`, the
 *    homepage download section that shows both store buttons)
 *
 * Hydration-safe: returns fallbackHref on first render (SSR + initial
 * client paint), then swaps to the resolved URL after mount. The value
 * change is on an <a href> attribute only, so no visible flicker — but
 * if the user taps before mount they still land on the right page.
 */
export function useStoreLink(fallbackHref = '/#download'): string {
  const [href, setHref] = useState<string>(fallbackHref);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setHref(
      resolveStoreUrl(
        navigator.userAgent || '',
        navigator.platform || '',
        navigator.maxTouchPoints || 0,
        fallbackHref,
      ),
    );
  }, [fallbackHref]);

  return href;
}
