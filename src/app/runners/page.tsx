import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RunnersView from './RunnersView';

export const metadata: Metadata = {
  title: 'Runners — find your running partner',
  description:
    'Search by name or pace. Follow the runners you know. Get pinged when your people head to a start line. You decide who follows you. Endorfin is India’s running community.',
  alternates: { canonical: 'https://www.endorfin.run/runners' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/runners',
    title: 'Runners — find your running partner | Endorfin',
    description:
      'Search by name or pace. Follow the runners you know. Get pinged when your people head to a start line. Endorfin is India’s running community.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Runners — find your running partner',
  description:
    'Search runners across India by name or pace. Follow the runners you chase, get real-time race-day pings, and stay private by default.',
  url: 'https://www.endorfin.run/runners',
  inLanguage: 'en-IN',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
  },
};

export default function RunnersPage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <div className="v1-runners-page">
        <RunnersView />
      </div>
      <Footer />
    </main>
  );
}
