'use client';

import { motion } from "framer-motion";
import { PlusCircle, Users, MapPin } from "lucide-react";
import { fadeUp, stagger } from "@/lib/animations";

const cards = [
  {
    icon: PlusCircle,
    title: "Create",
    desc: "Set the distance, pace, and meeting point. Add a cover photo and publish in seconds.",
  },
  {
    icon: Users,
    title: "Join",
    desc: "Browse community runs near you. See who's going. RSVP with one tap.",
  },
  {
    icon: MapPin,
    title: "Run Together",
    desc: "Chat before race day. Share routes, carpool plans, and pace strategies in event discussions.",
  },
];

const CommunitySection = () => (
  <section className="bg-jet relative overflow-hidden">
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
          Community
        </span>
        <h2 className="mt-4 font-display font-semibold text-5xl md:text-8xl uppercase text-bone leading-[0.95]">
          CREATE YOUR<br />OWN RUNS
        </h2>
        <p className="mt-6 font-body text-base text-bone/40">
          Don't just find races — create them. Organize community runs, invite your crew, and chat with fellow runners before race day.
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-4xl mx-auto"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={fadeUp} className="text-center group">
            <div className="w-14 h-14 rounded-full bg-bone/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-signal transition-colors duration-300">
              <card.icon className="w-6 h-6 text-bone" />
            </div>
            <h3 className="font-display font-medium text-lg uppercase text-bone">
              {card.title}
            </h3>
            <p className="mt-2 font-body text-sm text-bone/40 leading-relaxed">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default CommunitySection;
