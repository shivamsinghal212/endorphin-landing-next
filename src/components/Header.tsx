'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";

const links = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "App", href: "#app" },
  { label: "Download", href: "#download" },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-jet/90 backdrop-blur-md" : ""
        }`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-signal focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-body focus:text-sm">
          Skip to main content
        </a>
        <div className="flex items-center justify-between px-6 md:px-12 h-20">
          <Logo variant="light" />

          <nav className="hidden md:flex items-center gap-10">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-body text-[13px] uppercase tracking-[0.2em] text-bone/50 hover:text-signal transition-colors duration-300"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden relative w-8 h-8 flex items-center justify-center z-50"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span className={`block absolute w-6 h-[1.5px] bg-bone transition-all duration-300 ${open ? "rotate-45" : "-translate-y-1.5"}`} />
            <span className={`block absolute w-6 h-[1.5px] bg-bone transition-all duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`block absolute w-6 h-[1.5px] bg-bone transition-all duration-300 ${open ? "-rotate-45" : "translate-y-1.5"}`} />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 40px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
            id="mobile-menu"
            className="fixed inset-0 z-40 bg-signal flex flex-col items-center justify-center gap-6"
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="font-display text-5xl sm:text-7xl font-semibold uppercase text-white hover:text-jet transition-colors"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
