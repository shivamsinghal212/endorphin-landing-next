'use client';

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, scaleIn } from "@/lib/animations";

interface FeatureRowProps {
  num: string;
  title: string;
  description: string;
  screen: ReactNode;
  reverse?: boolean;
}

const FeatureRow = ({ num, title, description, screen, reverse = false }: FeatureRowProps) => {
  return (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-0`}>
      {/* Phone mockup — takes 55% */}
      <motion.div
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="w-full md:w-[55%] flex items-center justify-center py-12 md:py-20 px-8"
      >
        {screen}
      </motion.div>

      {/* Text — takes 45% */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className={`w-full md:w-[45%] flex flex-col justify-center px-8 md:px-16 py-12 md:py-0 ${
          reverse ? "md:items-end md:text-right" : ""
        }`}
      >
        <span className="font-display text-[8rem] md:text-[12rem] font-semibold leading-none text-signal/10">
          {num}
        </span>
        <h3 className="font-display font-semibold text-3xl md:text-5xl uppercase text-bone leading-[1.05] -mt-16 md:-mt-24">
          {title}
        </h3>
        <p className="mt-6 font-body text-base text-bone/40 leading-relaxed max-w-sm">
          {description}
        </p>
        <div className="mt-8 w-12 h-[2px] bg-signal" />
      </motion.div>
    </div>
  );
};

export default FeatureRow;
