'use client';

import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/animations";
import { AppStoreButtons } from "./AppStoreButtons";

const CTA_IMG = "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1920&q=80&auto=format&fit=crop";

const CTASection = () => (
  <section id="download" className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0">
      <img src={CTA_IMG} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-jet/75" />
    </div>

    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="relative z-10 px-6 md:px-12 py-24 md:py-32 max-w-3xl text-center"
    >
      <motion.span
        variants={fadeUp}
        className="font-body text-[11px] uppercase tracking-[0.3em] text-signal"
      >
        Download
      </motion.span>

      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display font-semibold text-5xl md:text-8xl uppercase text-bone leading-[0.95]"
      >
        YOUR NEXT<br />FINISH LINE<br />
        <span className="text-stroke-signal">IS WAITING</span>
      </motion.h2>

      <motion.p
        variants={fadeUp}
        className="mt-8 font-body text-base text-bone/40 max-w-md mx-auto"
      >
        10,000+ runners already discovering races, building their crew, and racing together
        on Endorfin.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10 flex justify-center">
        <AppStoreButtons variant="dark" />
      </motion.div>
    </motion.div>
  </section>
);

export default CTASection;
