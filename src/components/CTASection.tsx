'use client';

import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/animations";
import { AppStoreButtons } from "./AppStoreButtons";

const CTASection = () => (
  <section id="download" className="relative bg-bone overflow-hidden">
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="relative z-10 px-6 md:px-12 py-24 md:py-32 max-w-3xl mx-auto text-center"
    >
      <motion.span
        variants={fadeUp}
        className="font-body text-[11px] uppercase tracking-[0.2em] text-signal"
      >
        Download
      </motion.span>

      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display font-semibold text-5xl md:text-8xl uppercase text-jet leading-[0.95]"
      >
        YOUR NEXT<br />FINISH LINE<br />
        <span className="text-stroke-signal">IS WAITING</span>
      </motion.h2>

      <motion.p
        variants={fadeUp}
        className="mt-8 font-body text-base text-jet/50 max-w-md mx-auto"
      >
        10,000+ runners already discovering races, building their crew, and racing together
        on Endorfin.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10 flex justify-center">
        <AppStoreButtons variant="light" />
      </motion.div>
    </motion.div>
  </section>
);

export default CTASection;
