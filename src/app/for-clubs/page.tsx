import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ForClubsView from './ForClubsView';
import './for-clubs.css';

const PAGE_URL = 'https://www.endorfin.run/for-clubs';
const PAGE_TITLE = 'For Club Owners — Free Platform for Run Clubs in India';
const PAGE_DESCRIPTION =
  'List your run club, host your runs, and get found by runners in your city — free. SEO club pages, free event hosting, in-app chat, member management, and auto-import from Instagram.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'run club platform India',
    'free run club platform',
    'host running events free',
    'manage run club',
    'run club software',
    'list my run club',
    'run club app',
    'club event hosting',
    'run club discoverability',
    'auto import events instagram',
    'run club management India',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    site: '@endorfinapp',
  },
  other: { 'geo.region': 'IN' },
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Endorfin for Run Clubs',
  serviceType: 'Run club hosting, discovery, and management platform',
  description:
    'A free platform for Indian run clubs: SEO-optimised club pages that rank on Google, free event hosting with RSVPs, in-app member chat, member management, and auto-import of events from Instagram.',
  url: PAGE_URL,
  provider: {
    '@type': 'Organization',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
    logo: 'https://www.endorfin.run/icon.png',
  },
  areaServed: { '@type': 'Country', name: 'India' },
  audience: {
    '@type': 'PeopleAudience',
    audienceType: 'Run club founders and organisers in India',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    description: 'Free forever for clubs.',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is it really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. There is no fee for clubs to list, host runs, or manage members. We earn from event ticketing and partners.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does hosting an event cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Hosting is free. For ticketed events, standard payment processing applies — and we run free Instagram and Google ads to help fill it.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I have to share my phone number?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Members reach you through in-app chat. Your number stays private.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do members find my club?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your page ranks on Google, shows in the in-app discover feed, and gets featured in city roundups.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can you set the page up for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — our concierge option imports your last runs, pulls your next event from Instagram, and hands you the keys. Free, limited slots.',
      },
    },
    {
      '@type': 'Question',
      name: 'What kinds of clubs is this for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Any run club in India — training groups, weekend crews, beginner pods, women-only clubs.',
      },
    },
  ],
};

export default function ForClubsPage() {
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <ForClubsView />
      <Footer />
    </>
  );
}
