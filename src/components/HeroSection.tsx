'use client';

import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { stagger, letterReveal, fadeUp } from "@/lib/animations";

const HeroParticles = lazy(() => import("./HeroParticles"));

const HERO_IMG = "/images/hero-race.jpg";

const words = ["FIND", "YOUR", "NEXT", "RACE"];

const HeroSection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return (
    <section className="relative h-screen min-h-[700px] flex flex-col items-center justify-center overflow-hidden bg-jet">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Runners at Delhi Half Marathon"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/60 to-transparent" />
      </div>

      {/* Particles */}
      {!isMobile && (
        <Suspense fallback={null}>
          <HeroParticles />
        </Suspense>
      )}

      {/* Content — centered */}
      <div className="relative z-10 text-center px-6 md:px-12">
        <h1 className="sr-only">Find Your Next Race — Running Events in India</h1>
        {/* Massive headline — staggered word reveal */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap justify-center gap-x-5 md:gap-x-8"
        >
          {words.map((word) => (
            <motion.span
              key={word}
              variants={letterReveal}
              className={`font-display font-semibold text-[15vw] md:text-[12vw] lg:text-[10vw] uppercase leading-[0.85] tracking-tight ${
                word === "RACE" ? "text-signal" : "text-bone"
              }`}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 md:mt-12 font-body text-base md:text-lg text-bone/50 max-w-lg mx-auto leading-relaxed"
        >
          Join 10,000+ runners discovering races, creating community runs, and building their crew — all in one app.
        </motion.p>

      </div>

      {/* Scroll indicator — fixed right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-16 right-6 md:right-12 flex items-center gap-3 z-10"
      >
        <div className="w-[1px] h-12 bg-signal" />
        <span className="font-body text-[11px] uppercase tracking-[0.3em] text-bone/30 animate-scroll-down">
          Scroll
        </span>
      </motion.div>

      {/* Accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-signal" />
    </section>
  );
};

export default HeroSection;
