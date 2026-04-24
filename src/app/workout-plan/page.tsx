import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkoutPlanView from './WorkoutPlanView';

export const metadata: Metadata = {
  title: 'Workout Plan — training that adapts every week',
  description:
    'Meet Kip — an AI run coach that reads your Health Connect data and rewrites your weekly plan every Sunday. Dynamic pace targets, race-prep blocks, recovery built in. Coming soon — join the waitlist.',
  alternates: { canonical: 'https://www.endorfin.run/workout-plan' },
  openGraph: {
    type: 'website',
    url: 'https://www.endorfin.run/workout-plan',
    title: 'Workout Plan — training that adapts every week | Endorfin',
    description:
      'An AI run coach that reads your Health Connect data and rewrites your weekly plan every Sunday. Beta in July 2026.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Endorfin Workout Plan · Kip',
  description:
    'An AI run coach that reads your Health Connect data and rewrites your weekly training plan every Sunday. Dynamic pace targets, race-prep blocks, recovery built in.',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Android',
  url: 'https://www.endorfin.run/workout-plan',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/PreOrder',
  },
  featureList: [
    'Dynamic pace targets',
    'Pace-group splits (easy / tempo / long / recovery)',
    'Race-prep blocks (10K, half, full)',
    'Recovery built in — HRV, sleep, load monitoring',
    'Weekly re-plan based on actual runs',
    'Health Connect integration (Garmin, Samsung Health, Fitbit, Google Fit)',
  ],
};

export default function WorkoutPlanPage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <div className="v1-workout-page">
        <WorkoutPlanView />
      </div>
      <Footer />
    </main>
  );
}
