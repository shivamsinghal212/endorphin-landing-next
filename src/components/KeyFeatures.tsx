'use client';

import FeatureRow from "./FeatureRow";
import { HomeScreen, EventScreen, ProfileScreen } from "./AppScreens";

const features = [
  {
    num: "01",
    title: "DISCOVER EVENTS NEAR YOU",
    description: "Browse 5Ks, half marathons, marathons and ultra runs across India. Smart filters by distance, city and date.",
    screen: <HomeScreen />,
  },
  {
    num: "02",
    title: "ONE TAP. YOU'RE IN.",
    description: "RSVP instantly. See real-time participant counts, who else is running, and track every race you've committed to.",
    screen: <EventScreen />,
    reverse: true,
  },
  {
    num: "03",
    title: "BUILD YOUR RUNNING CREW",
    description: "Follow runners. Get notified when friends sign up. Build a community that pushes you to show up.",
    screen: <ProfileScreen />,
  },
];

const KeyFeatures = () => (
  <section id="features" className="bg-jet">
    <h2 className="sr-only">App Features</h2>
    {features.map((f) => (
      <FeatureRow key={f.num} {...f} />
    ))}
  </section>
);

export default KeyFeatures;
