'use client';

import { motion } from "framer-motion";
import { Search, Bell, LayoutGrid, Shield } from "lucide-react";
import { fadeUp, stagger } from "@/lib/animations";

const features = [
  { icon: Search, title: "Smart Search", desc: "Search by distance, city, date, or terrain. Find your perfect race in seconds." },
  { icon: Bell, title: "Push Alerts", desc: "Get notified when friends RSVP, new races drop in your city, or events you saved go live." },
  { icon: LayoutGrid, title: "Curated Feed", desc: "See what runners you follow are racing. Discover events through your community." },
  { icon: Shield, title: "Private Mode", desc: "Control who sees your profile and race history. Go public or stay private — your call." },
];

const MoreFeatures = () => (
  <section id="app" className="bg-bone relative overflow-hidden">
    <div className="px-6 md:px-12 py-24 md:py-40">
      {/* Section header — centered */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-16 md:mb-24 max-w-2xl mx-auto"
      >
        <span className="font-body text-[11px] uppercase tracking-[0.3em] text-signal">
          The App
        </span>
        <h2 className="mt-4 font-display font-semibold text-5xl md:text-8xl uppercase text-jet leading-[0.95]">
          YOUR RACE<br />HEADQUARTERS
        </h2>
        <p className="mt-6 font-body text-base text-jet/40">
          Discover events, RSVP instantly, follow runners, and track your races —
          all in one beautifully designed app.
        </p>
      </motion.div>

      {/* Features grid — centered */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 max-w-5xl mx-auto"
      >
        {features.map((f) => (
          <motion.div key={f.title} variants={fadeUp} className="text-center group">
            <div className="w-14 h-14 rounded-full bg-jet flex items-center justify-center mx-auto mb-5 group-hover:bg-signal transition-colors duration-300">
              <f.icon className="w-6 h-6 text-bone" />
            </div>
            <h3 className="font-display font-medium text-lg uppercase text-jet">
              {f.title}
            </h3>
            <p className="mt-2 font-body text-sm text-jet/40 leading-relaxed">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default MoreFeatures;
