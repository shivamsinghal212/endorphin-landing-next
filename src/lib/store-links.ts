export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.endorfin.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/endorfin/id6762107286';

/**
 * Detect the visitor's mobile platform from a User-Agent string. Returns
 * 'ios' for iPhone/iPad/iPod, 'android' for Android, or null otherwise.
 *
 * Note: iPadOS 13+ identifies as desktop Safari by default, so we also
 * sniff the touch + Mac platform combination as a heuristic.
 */
export function detectMobilePlatform(
  ua: string,
  platform = '',
  maxTouchPoints = 0,
): 'ios' | 'android' | null {
  if (!ua) return null;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  // iPadOS 13+ desktop-Safari mode: Mac platform + touch support
  if (/macintosh/i.test(ua) && maxTouchPoints > 1 && /mac/i.test(platform)) return 'ios';
  return null;
}

/**
 * Resolve the correct store URL for the current device. Falls back to
 * fallbackHref (typically the homepage download section anchor) for
 * desktop or unknown UAs.
 */
export function resolveStoreUrl(
  ua: string,
  platform = '',
  maxTouchPoints = 0,
  fallbackHref = '/#download',
): string {
  const p = detectMobilePlatform(ua, platform, maxTouchPoints);
  if (p === 'ios') return APP_STORE_URL;
  if (p === 'android') return PLAY_STORE_URL;
  return fallbackHref;
}
