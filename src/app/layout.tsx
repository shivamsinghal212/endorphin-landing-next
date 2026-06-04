import type { Metadata } from 'next';
import Script from 'next/script';
import { Oswald, Poppins, Fraunces } from 'next/font/google';
import './globals.css';

const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['italic', 'normal'], variable: '--font-fraunces', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Endorfin — Find Running Events, Marathons & 10Ks in India', template: '%s | Endorfin' },
  description: "India's platform for run clubs and running events. Find verified clubs near you, RSVP to the next group run, and discover 500+ marathons, 10K & 5K events.",
  keywords: ['run clubs India', 'run clubs near me', 'run clubs in Delhi', 'run clubs in Mumbai', 'run clubs in Bangalore', 'running club', 'join a run club', 'running events India', 'marathon India', 'half marathon', '10K run', '5K run', 'running app', 'running event finder', 'marathon near me', 'running events Mumbai', 'running events Delhi', 'running events Bangalore', 'community runs', 'trail running India', 'fun run', 'event registration', 'running community'],
  authors: [{ name: 'Endorfin' }],
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  alternates: { canonical: 'https://www.endorfin.run/' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/',
    title: 'Endorfin — Find Running Events, Marathons & 10Ks in India',
    description: "India's platform for run clubs and running events. Find verified clubs near you, RSVP to the next group run, and discover 500+ marathons, 10K & 5K events.",
    siteName: 'Endorfin',
    locale: 'en_IN',
    images: [{ url: 'https://www.endorfin.run/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Endorfin — Find Running Events & Marathons in India',
    description: "India's platform for run clubs and running events. Find verified clubs near you, RSVP to the next group run, and discover 500+ marathons, 10K & 5K events.",
    images: ['https://www.endorfin.run/og-image.png'],
    site: '@endorfinapp',
  },
  other: {
    'theme-color': '#E6232A',
    'al:android:package': 'com.endorfin.app',
    'al:android:app_name': 'Endorfin',
    'geo.region': 'IN',
  },
};

// One app, two store listings. Each MobileApplication node carries the
// aggregateRating for its own store so the figure matches a verifiable
// source (Play Store / App Store) — Google surfaces whichever fits the
// query. Shared fields flow through buildAppJsonLd to stay in sync.
function buildAppJsonLd({
  operatingSystem,
  ratingValue,
  ratingCount,
  storeUrl,
}: {
  operatingSystem: string;
  ratingValue: string;
  ratingCount: string;
  storeUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
    applicationCategory: 'SportsApplication',
    operatingSystem,
    description: "India's platform for run clubs and running events. Discover verified run clubs in your city, join the next group run, and browse 500+ marathons, half marathons, 10K and 5K events. RSVP instantly, host community runs, and connect with runners.",
    featureList: [
      'Verified run club directory across 25+ Indian cities',
      'Discover and join local run clubs',
      'Running event discovery — marathons, half marathons, 10K & 5K',
      'One-tap RSVP for club runs and events',
      'Create and host community runs',
      'Per-event and club discussion threads',
      'Runner social profiles and following',
      'City-based smart search and filters',
      'Push notifications for new runs and events',
    ],
    screenshot: 'https://www.endorfin.run/og-image.png',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      bestRating: '5',
      ratingCount,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      url: storeUrl,
    },
    installUrl: storeUrl,
  };
}

const appJsonLdAndroid = buildAppJsonLd({
  operatingSystem: 'Android',
  ratingValue: '4.8',
  ratingCount: '120',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.endorfin.app',
});

const appJsonLdIos = buildAppJsonLd({
  operatingSystem: 'iOS',
  ratingValue: '4.7',
  ratingCount: '87',
  storeUrl: 'https://apps.apple.com/app/endorfin/id6762107286',
});

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Endorfin',
  url: 'https://www.endorfin.run',
  logo: {
    '@type': 'ImageObject',
    url: 'https://www.endorfin.run/logo.png',
    width: 512,
    height: 512,
  },
  description: "India's platform for run clubs and running events. Discover clubs and events, RSVP instantly, and build your running community.",
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@endorfin.run',
    contactType: 'customer support',
    areaServed: 'IN',
    availableLanguage: 'English',
  },
  sameAs: [
    'https://play.google.com/store/apps/details?id=com.endorfin.app',
    'https://twitter.com/endorfinapp',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Endorfin',
  url: 'https://www.endorfin.run',
  description: "India's platform for run clubs and running events. Find verified clubs near you and discover 500+ marathons, 10K & 5K events.",
  inLanguage: 'en-IN',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.endorfin.run/running-events?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${oswald.variable} ${poppins.variable} ${fraunces.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Clash Display — @font-face rules live in globals.css so we
            don't depend on Fontshare's CSS endpoint (which has returned
            500s). Preconnect + preload the weight-600 woff2 (the one
            used by the wordmark) so it's cached before stylesheet
            parsing completes. */}
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="preload"
          href="https://cdn.fontshare.com/wf/FPDAZ2S6SW4QMSRIIKNNGTPM6VIXYMKO/5HNPQ453FRLIQWV2FNOBUU3FKTDZQVSG/Z3MGHFHX6DCTLQ55LJYRJ5MDCZPMFZU6.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        {/* Image proxies used by the comment roller on /clubs/[slug].
            Pre-warm the connection so the first avatar fetch isn't
            blocked on DNS + TCP + TLS handshake. */}
        <link rel="preconnect" href="https://images.weserv.nl" crossOrigin="" />
        <link rel="dns-prefetch" href="https://unavatar.io" />
        <meta property="og:logo" content="https://www.endorfin.run/logo.png" />
        {/* JSON-LD: native <script type="application/ld+json"> per Next 16 docs.
            type="application/ld+json" is non-executable so React doesn't try to
            run it (no "script tag in component" warning). next/script is for
            executable JS only. The \\u003c escape sanitizes any embedded `<`
            against XSS. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(appJsonLdAndroid).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(appJsonLdIos).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      {/* suppressHydrationWarning silences false positives from browser
          extensions (ColorZilla cz-shortcut-listen, Grammarly data-* attrs)
          that mutate <body> before React hydrates. Scoped to this element
          only; child mismatches still warn normally. */}
      <body className="antialiased" suppressHydrationWarning>
        {/* Google Analytics — executable JS, so next/script is correct here.
            afterInteractive defers loading until after page hydration. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-P6TL1FG85X" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-P6TL1FG85X');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
