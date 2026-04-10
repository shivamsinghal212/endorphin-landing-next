'use client';

import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";

const steps = [
  { num: "01", title: "Sign up with Google", desc: "No forms. No friction. Two taps and you're in." },
  { num: "02", title: "Discover nearby races", desc: "Browse events filtered by distance, category and location." },
  { num: "03", title: "RSVP & run", desc: "One tap to commit. Connect with your crew. Hit the road." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="bg-jet relative overflow-hidden">
    {/* Marquee accent */}
    <div className="overflow-hidden border-y border-bone/5 py-4">
      <div className="flex animate-marquee whitespace-nowrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="font-display text-[14px] uppercase tracking-[0.4em] text-bone/10 mx-8">
            Sign Up · Discover · Run · Repeat ·
          </span>
        ))}
      </div>
    </div>

    <div className="px-6 md:px-12 py-24 md:py-32">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mb-20 md:mb-28"
      >
        <span className="font-body text-[11px] uppercase tracking-[0.3em] text-signal">
          How it works
        </span>
        <h2 className="mt-4 font-display font-semibold text-5xl md:text-8xl uppercase text-bone leading-[0.95]">
          THREE<br />STEPS
        </h2>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid md:grid-cols-3 gap-0"
      >
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            variants={fadeUp}
            className={`relative py-12 md:py-16 md:px-10 ${
              i < steps.length - 1 ? "border-b md:border-b-0 md:border-r border-bone/10" : ""
            }`}
          >
            <span className="absolute top-4 md:top-6 left-0 md:left-10 font-display text-[7rem] md:text-[9rem] font-semibold leading-none text-bone/[0.03] select-none pointer-events-none">
              {step.num}
            </span>
            <div className="relative z-10">
              <span className="font-display text-sm font-medium text-signal">{step.num}</span>
              <h3 className="mt-3 font-display font-medium text-2xl md:text-3xl uppercase text-bone leading-tight">
                {step.title}
              </h3>
              <p className="mt-4 font-body text-sm text-bone/40 leading-relaxed max-w-xs">
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default HowItWorks;
