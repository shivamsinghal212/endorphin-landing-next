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
    description: 'Discover 500+ running events across India. Marathons, half marathons, 10K & 5K races near you.',
    siteName: 'Endorfin',
    locale: 'en_IN',
    images: [{ url: 'https://www.endorfin.run/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Endorfin — Find Running Events & Marathons in India',
    description: 'Discover 500+ running events across India.',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Endorfin',
  url: 'https://www.endorfin.run',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Android',
  description: 'Discover running events, marathons, and races across India.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${poppins.variable}`}>
      <head>
        {/* Clash Display from Fontshare */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@500;600;700&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
