import type { Metadata } from 'next';
import { Oswald, Poppins, Fraunces } from 'next/font/google';
import './globals.css';

const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['italic', 'normal'], variable: '--font-fraunces', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Endorfin — Find Running Events, Marathons & Races in India', template: '%s | Endorfin' },
  description: 'Discover 500+ running events across India. Find marathons, half marathons, 10K & 5K races near you. RSVP instantly, create community runs, and connect with runners.',
  keywords: ['running events India', 'marathon India', 'half marathon', '10K run', '5K run', 'running app', 'race finder', 'marathon near me', 'running events Mumbai', 'running events Delhi', 'running events Bangalore', 'community runs', 'trail running India', 'fun run', 'race registration', 'running community'],
  authors: [{ name: 'Endorfin' }],
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  alternates: { canonical: 'https://www.endorfin.run/' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/',
    title: 'Endorfin — Find Running Events, Marathons & Races in India',
    description: 'Discover 500+ running events across India. Find marathons, half marathons, 10K & 5K races near you. RSVP instantly and connect with runners.',
    siteName: 'Endorfin',
    locale: 'en_IN',
    images: [{ url: 'https://www.endorfin.run/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Endorfin — Find Running Events & Marathons in India',
    description: 'Discover 500+ running events across India. Find marathons, half marathons, 10K & 5K races near you. RSVP instantly and connect with runners.',
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

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Endorfin',
  url: 'https://www.endorfin.run',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Android',
  description: 'Discover 500+ running events across India. Find marathons, half marathons, 10K and 5K races near you. RSVP instantly, create community runs, and connect with runners.',
  featureList: [
    'Running event discovery across 25+ Indian cities',
    'One-tap RSVP for marathons and races',
    'Create and host community runs',
    'Per-event discussion threads',
    'Runner social profiles and following',
    'City-based smart search and filters',
    'Push notifications for new events',
    'Curated event feed',
  ],
  screenshot: 'https://www.endorfin.run/og-image.png',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    bestRating: '5',
    ratingCount: '120',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    url: 'https://play.google.com/store/apps/details?id=com.endorfin.app',
  },
  installUrl: 'https://play.google.com/store/apps/details?id=com.endorfin.app',
};

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
  description: "India's running community app. Discover events, RSVP instantly, and build your running crew.",
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
  description: 'Discover 500+ running events across India. Find marathons, half marathons, 10K and 5K races near you.',
  inLanguage: 'en-IN',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${poppins.variable} ${fraunces.variable}`}>
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
        <meta property="og:logo" content="https://www.endorfin.run/logo.png" />
        {/* Runtime config bridge — exposes server-only env to client components.
            Google client IDs are public-by-design (sent in every OAuth flow), so
            inlining is safe. Lets us reuse GOOGLE_CLIENT_ID without a NEXT_PUBLIC_ duplicate. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__endorfinConfig = ${JSON.stringify({
              googleClientId: process.env.GOOGLE_CLIENT_ID || '',
            })};`,
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-P6TL1FG85X" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-P6TL1FG85X');
        `}} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
