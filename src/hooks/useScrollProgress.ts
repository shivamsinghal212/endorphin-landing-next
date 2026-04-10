'use client';

import { useRef } from "react";
import { useScroll, useTransform, type MotionValue } from "framer-motion";

export function useParallax(speed: number = 0.5): [React.RefObject<HTMLDivElement | null>, MotionValue<number>] {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-speed * 100, speed * 100]);
  return [ref, y];
}
