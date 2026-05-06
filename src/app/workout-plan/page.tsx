import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkoutPlanView from './WorkoutPlanView';
import { FAQS } from './faqs';
import {
  ApiError,
  kipWaitlistApi,
  type WaitlistMe,
  type WaitlistStats,
} from '@/lib/api';
import { getSessionToken } from '@/lib/session';

const PAGE_URL = 'https://www.endorfin.run/workout-plan';
const OG_IMAGE = 'https://www.endorfin.run/og-image.png';

const PAGE_TITLE =
  'Personalised Running Training Plan for India · Kip by Endorfin';
const PAGE_DESCRIPTION =
  'Kip writes a personalised running training plan, calibrated to the air and heat in your city — Delhi, Bengaluru, Mumbai. First 5K, half marathon, getting faster. Works with or without a watch. Waitlist open — launching soon.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'running training plan',
    'personalised training plan',
    'AI running coach',
    'running coach app',
    'half marathon training plan India',
    'first 5K training plan',
    'marathon training plan India',
    'running plan without watch',
    'training plan Delhi',
    'training plan Bengaluru',
    'running app India',
    'air quality running',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: 'Endorfin',
    locale: 'en_IN',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Kip — running coach app by Endorfin',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kip — personalised running training plan, written for India',
    description:
      'A running coach in your pocket. Two weeks at a time, calibrated to the air in your city. Waitlist open — launching soon.',
    images: [OG_IMAGE],
    site: '@endorfinapp',
  },
  other: {
    'geo.region': 'IN',
  },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kip — Endorfin Running Coach',
  alternateName: 'Endorfin Workout Plan',
  description:
    'Kip is a running coach app that writes a personalised two-week training plan, calibrated to the air and heat in your city. Backed by published methodology. Works with or without a watch — perceived effort is enough.',
  applicationCategory: 'HealthApplication',
  applicationSubCategory: 'Running',
  operatingSystem: 'Android, iOS',
  url: PAGE_URL,
  inLanguage: 'en-IN',
  audience: {
    '@type': 'PeopleAudience',
    audienceType:
      'Runners in India training for 5K, 10K, half marathon and marathon',
    geographicArea: { '@type': 'Country', name: 'India' },
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/PreOrder',
    // availabilityStarts intentionally omitted — date TBD ("launching soon").
  },
  featureList: [
    'Plans for first 5K, half-marathon, and getting faster',
    'Two-week training plan, written from your goal and recent runs',
    'Air-quality and heat-aware run scheduling',
    'Equipment-free indoor alternatives when air is bad',
    'Works with or without a watch — perceived effort is enough, a watch adds more',
    'Methodology backed by published running science',
  ],
  publisher: {
    '@type': 'Organization',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.endorfin.run',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Workout Plan',
      item: PAGE_URL,
    },
  ],
};

// Don't ISR cache — the counter must be fresh for the SSR snapshot, then
// the client refreshes every 30s. (The page is light enough that this is
// fine.)
export const dynamic = 'force-dynamic';

async function fetchInitialWaitlistData(): Promise<{
  stats: WaitlistStats;
  me: WaitlistMe | null;
  isSignedIn: boolean;
}> {
  const FALLBACK: WaitlistStats = { total: 0, capacity: 100, isOpen: true };
  const token = await getSessionToken();
  const isSignedIn = Boolean(token);

  // Fetch in parallel; degrade gracefully on backend hiccup so the page
  // still renders rather than 500ing.
  const [statsRes, meRes] = await Promise.allSettled([
    kipWaitlistApi.getStats(),
    token
      ? kipWaitlistApi.getMe(token).catch((e) => {
          if (e instanceof ApiError && e.status === 401) return null;
          throw e;
        })
      : Promise.resolve(null),
  ]);

  const stats = statsRes.status === 'fulfilled' ? statsRes.value : FALLBACK;
  const me = meRes.status === 'fulfilled' ? meRes.value : null;

  return { stats, me, isSignedIn };
}

export default async function WorkoutPlanPage() {
  const { stats, me, isSignedIn } = await fetchInitialWaitlistData();

  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <Header />
      <div className="v1-workout-page">
        <WorkoutPlanView
          initialStats={stats}
          initialMe={me}
          isSignedIn={isSignedIn}
        />
      </div>
      <Footer />
    </main>
  );
}
