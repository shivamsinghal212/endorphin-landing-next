import type { Variants } from "framer-motion";

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ease = [0.25, 0.1, 0.25, 1] as const;
const sharp = [0.77, 0, 0.175, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: prefersReducedMotion() ? 0 : 60 },
  visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion() ? 0 : 0.8, ease } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: prefersReducedMotion() ? 0 : -80 },
  visible: { opacity: 1, x: 0, transition: { duration: prefersReducedMotion() ? 0 : 0.8, ease } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: prefersReducedMotion() ? 0 : 80 },
  visible: { opacity: 1, x: 0, transition: { duration: prefersReducedMotion() ? 0 : 0.8, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: prefersReducedMotion() ? 1 : 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: prefersReducedMotion() ? 0 : 0.7, ease } },
};

export const clipRevealUp: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)" },
  visible: { clipPath: "inset(0% 0 0 0)", transition: { duration: prefersReducedMotion() ? 0 : 1, ease: sharp } },
};

export const clipRevealLeft: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  visible: { clipPath: "inset(0 0% 0 0)", transition: { duration: prefersReducedMotion() ? 0 : 0.9, ease: sharp } },
};

export const clipRevealRight: Variants = {
  hidden: { clipPath: "inset(0 0 0 100%)" },
  visible: { clipPath: "inset(0 0 0 0%)", transition: { duration: prefersReducedMotion() ? 0 : 0.9, ease: sharp } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: prefersReducedMotion() ? 0 : 0.1, delayChildren: prefersReducedMotion() ? 0 : 0.15 } },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: prefersReducedMotion() ? 0 : 0.05 } },
};

export const letterReveal: Variants = {
  hidden: { opacity: 0, y: prefersReducedMotion() ? 0 : 40 },
  visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion() ? 0 : 0.5, ease } },
};
