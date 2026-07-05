import { NextRequest, NextResponse } from 'next/server';

const IOS = 'https://apps.apple.com/app/id6762107286';
const ANDROID = 'https://play.google.com/store/apps/details?id=com.endorfin.app';
const SITE = 'https://endorfin.run';

// Smart app link. link.endorfin.run (and /get on any host, for testing) sends
// phones straight to the right store; everything else — desktop, bots — goes
// to the marketing site, which has its own download CTAs. Server-side so
// there's no redirect flash for ad clicks.
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  if (!host.startsWith('link.') && req.nextUrl.pathname !== '/get') {
    return NextResponse.next();
  }

  const ua = req.headers.get('user-agent') || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return NextResponse.redirect(IOS);
  }
  if (/Android/i.test(ua)) {
    // forward the ad's query string as the Play Store install referrer
    const ref = req.nextUrl.search.slice(1) || 'src=meta';
    return NextResponse.redirect(`${ANDROID}&referrer=${encodeURIComponent(ref)}`);
  }
  return NextResponse.redirect(SITE);
}

export const config = {
  matcher: ['/', '/get'],
};
