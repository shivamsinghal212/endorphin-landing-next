import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import EventsShowcase from '@/components/EventsShowcase';
import KeyFeatures from '@/components/KeyFeatures';
import MoreFeatures from '@/components/MoreFeatures';
import CommunitySection from '@/components/CommunitySection';
import DiscussionHighlight from '@/components/DiscussionHighlight';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <Header />
      <HeroSection />
      <StatsBar />
      <EventsShowcase />
      <CommunitySection />
      <DiscussionHighlight />
      <KeyFeatures />
      <MoreFeatures />
      <CTASection />
      <Footer />
    </main>
  );
}
