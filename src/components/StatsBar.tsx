'use client';

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useCountUp } from "react-countup";
import { useRef, useEffect } from "react";
import { stagger, fadeUp } from "@/lib/animations";

const stats = [
  { value: 500, suffix: "+", label: "Races Listed" },
  { value: 10, suffix: "K+", label: "Runners Joined" },
  { value: 25, suffix: "+", label: "Cities Across India" },
  { value: 4.8, suffix: "", label: "App Rating", decimals: 1 },
];

function Counter({ value, suffix, decimals = 0, active }: { value: number; suffix: string; decimals?: number; active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { start } = useCountUp({ ref: ref as React.RefObject<HTMLElement>, end: value, suffix, duration: 2, decimals, startOnMount: false });
  useEffect(() => { if (active) start(); }, [active, start]);
  return <span ref={ref}>0{suffix}</span>;
}

const StatsBar = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });

  return (
    <section id="about" className="bg-signal relative grain">
      <h2 className="sr-only">Community Metrics</h2>
      <motion.dl
        ref={ref}
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative z-10 grid grid-cols-2 md:grid-cols-4"
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className={`py-12 md:py-20 px-6 md:px-10 text-center ${
              i < stats.length - 1 ? "border-r border-white/10" : ""
            }`}
          >
            <dd className="font-display font-semibold text-5xl md:text-7xl text-white">
              <Counter value={s.value} suffix={s.suffix} decimals={s.decimals} active={inView} />
            </dd>
            <dt className="mt-3 font-body text-[11px] uppercase tracking-[0.25em] text-white/60">
              {s.label}
            </dt>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
};

export default StatsBar;
