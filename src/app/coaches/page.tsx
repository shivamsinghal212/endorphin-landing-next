import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CoachesView from './CoachesView';

export const metadata: Metadata = {
  title: "Train with Elites — learn from India's fastest runners | Endorfin",
  description:
    "India's fastest runners. Real race-tested training from athletes who've podium'd at TCS Mumbai, Satara, and beyond — not textbook coaches. Coming Summer 2026 — join the waitlist.",
  alternates: { canonical: 'https://www.endorfin.run/coaches' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/coaches',
    title: "Train with Elites — learn from India's fastest runners | Endorfin",
    description:
      "Real race-tested training from India's fastest runners. Verified elites only. Launching Summer 2026.",
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: "Train with Elites — learn from India's fastest runners",
  description:
    "Match with elite Indian runners who have raced — and podium'd — the events you're targeting. Verified identity, verified race history, verified references. Launching Summer 2026.",
  url: 'https://www.endorfin.run/coaches',
  inLanguage: 'en-IN',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
  },
};

export default function CoachesPage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <div className="v1-coaches-page">
        <CoachesView />
      </div>
      <Footer />
    </main>
  );
}
