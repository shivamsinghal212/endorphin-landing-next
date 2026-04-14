import { PLAY_STORE_URL } from "@/lib/store-links";

const AboutSection = () => (
  <section id="about" className="py-24 md:py-32 bg-jet">
    <div className="max-w-4xl mx-auto px-6 md:px-12">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-signal mb-4">
        About Endorfin
      </p>
      <h2 className="font-display text-3xl md:text-4xl font-bold uppercase text-bone mb-8">
        Built for Indian Runners
      </h2>
      <div className="font-body text-base text-bone/60 leading-relaxed space-y-4">
        <p>
          Endorfin is a free running app purpose-built for the Indian running community. It
          aggregates 500+ running events across India — from 5K fun runs and 10K charity
          races to half marathons and full marathons — with filters by city, distance, and
          date. Runners can RSVP with one tap, see real-time participant counts, and follow
          friends to stay informed when their crew signs up for a race.
        </p>
        <p>
          Beyond event discovery, Endorfin lets any runner create their own community run —
          set the meeting point, pace, and distance, and invite others to join. Each event
          includes a live discussion thread where runners coordinate logistics like
          carpooling, parking, hydration points, and pace groups.
        </p>
        <p>
          Endorfin currently covers 25+ cities including Mumbai, Delhi, Bangalore, Pune,
          Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, and Chandigarh — with new cities
          and events added weekly. The app is available free on{' '}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal hover:underline"
          >
            Google Play
          </a>
          , with an iOS version coming soon.
        </p>
      </div>
    </div>
  </section>
);

export default AboutSection;
