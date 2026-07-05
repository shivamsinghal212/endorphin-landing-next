import { NextRequest, NextResponse } from 'next/server';

const IOS = 'https://apps.apple.com/app/id6762107286';
const ANDROID = 'https://play.google.com/store/apps/details?id=com.endorfin.app';

// Smart app link. link.endorfin.run (and /get on any host, for testing) sends
// phones straight to the right store; desktop falls through to the /get page
// with both badges. Server-side so there's no redirect flash for ad clicks.
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const isLinkHost = host.startsWith('link.');
  if (!isLinkHost && req.nextUrl.pathname !== '/get') {
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

  // desktop / bots: show the badges page
  if (req.nextUrl.pathname !== '/get') {
    return NextResponse.rewrite(new URL('/get', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/get'],
};
