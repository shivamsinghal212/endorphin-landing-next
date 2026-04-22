import type { Metadata } from 'next';
import { Oswald, Poppins } from 'next/font/google';
import './globals.css';

const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });

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
    <html lang="en" className={`${oswald.variable} ${poppins.variable}`}>
      <head>
        {/* Clash Display from Fontshare — preconnect to CDN so the woff2
            file fetch overlaps with other network work on mobile. The
            stylesheet sits on api.fontshare.com; font binaries on
            cdn.fontshare.com. Without these, the fallback sans-serif
            shows on slow mobile connections. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@500;600;700&display=swap" rel="stylesheet" />
        <meta property="og:logo" content="https://www.endorfin.run/logo.png" />
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
