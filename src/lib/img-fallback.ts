'use client';

import { useCallback, useState } from 'react';

/**
 * Tracks <img> sources that fail to load, so callers can render a fallback
 * instead of the browser's broken-image icon (which also sprawls the alt
 * text across the frame). Imported race covers point at third-party URLs
 * that go dead — townscript S3 returns 403 for some — so this is a live
 * condition on real data, not a defensive nicety.
 *
 * Spread `imgProps(url)` onto the <img>. The ref matters as much as onError:
 * these images are server-rendered, so a load failure can land BEFORE React
 * hydrates and the error event is never replayed. The ref re-checks
 * `complete && naturalWidth === 0` on mount to catch exactly that case.
 *
 *   const { isFailed, imgProps } = useImgFallback();
 *   return isFailed(url) ? <Fallback /> : <img src={url} {...imgProps(url)} />;
 */
export function useImgFallback() {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const mark = useCallback((url: string) => {
    setFailed((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  const imgProps = useCallback(
    (url: string) => ({
      // Hotlink protection: race-registration-cdn.indiarunning.com serves
      // these covers with 200 for an absent Referer but 403 for
      // "https://www.endorfin.run/" — so they loaded on localhost and broke
      // in production. Suppressing the referrer restores them. Harmless on
      // our own buckets, which don't check it.
      referrerPolicy: 'no-referrer' as const,
      onError: () => mark(url),
      ref: (el: HTMLImageElement | null) => {
        if (el && el.complete && el.naturalWidth === 0) mark(url);
      },
    }),
    [mark],
  );

  const isFailed = useCallback((url: string) => failed.has(url), [failed]);

  return { isFailed, imgProps };
}
