import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Endorfin',
  robots: { index: false },
};

// Desktop fallback for the smart app link (middleware.ts redirects phones
// straight to the store). Ad clicks on desktop land here.
export default function GetPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
        background: '#F5F0EB',
        color: '#0A0A0A',
        fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>Get Endorfin</h1>
        <p style={{ margin: '0 0 24px', opacity: 0.7 }}>
          Open this on your phone, or grab the app:
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://apps.apple.com/app/id6762107286">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Download on the App Store"
              height={56}
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            />
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.endorfin.app">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Get it on Google Play"
              height={56}
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            />
          </a>
        </div>
      </div>
    </main>
  );
}
