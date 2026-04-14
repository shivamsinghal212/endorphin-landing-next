'use client';

import Link from "next/link";
import Logo from "./Logo";
import { PLAY_STORE_URL, APP_STORE_URL } from "@/lib/store-links";

const Footer = () => (
  <footer className="bg-jet border-t border-bone/15">
    <div className="px-6 md:px-12">
      {/* Top row */}
      <div className="py-16 md:py-24 flex flex-col md:flex-row justify-between gap-12">
        {/* Brand */}
        <div className="max-w-sm">
          <Logo variant="light" />
          <p className="mt-4 font-body text-sm text-bone/60 leading-relaxed">
            India's running community. Discover events, RSVP instantly, build your crew.
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-16 md:gap-24">
          <nav aria-label="Product">
            <h3 className="font-body text-[11px] uppercase tracking-[0.2em] text-bone/70 mb-5">
              Product
            </h3>
            <ul className="space-y-3">
              {[
                { label: "About", href: "#about" },
                { label: "Features", href: "#features" },
                { label: "Download", href: "#download" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="font-body text-sm text-bone/60 hover:text-signal transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h3 className="font-body text-[11px] uppercase tracking-[0.2em] text-bone/70 mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              {[
                { label: "Privacy", to: "/privacy" },
                { label: "Terms", to: "/terms" },
                { label: "Support", to: "/support" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.to} className="font-body text-sm text-bone/60 hover:text-signal transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-bone/15 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-body text-xs text-bone/60">
          &copy; {new Date().getFullYear()} Endorfin. All rights reserved.
        </span>
        <div className="flex items-center gap-6">
          <a href="https://twitter.com/endorfinapp" target="_blank" rel="noopener noreferrer" className="font-body text-xs text-bone/60 hover:text-signal transition-colors" aria-label="Follow Endorfin on Twitter">
            Twitter
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-bone/60 hover:text-signal transition-colors" aria-label="Endorfin on Google Play">
            Google Play
          </a>
          {APP_STORE_URL && (
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-bone/60 hover:text-signal transition-colors" aria-label="Endorfin on App Store">
              App Store
            </a>
          )}
          <a href="mailto:hello@endorfin.run" className="font-body text-xs text-bone/60 hover:text-signal transition-colors">
            hello@endorfin.run
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
