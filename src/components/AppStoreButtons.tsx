'use client';

import { Apple, Play } from "lucide-react";

export const AppStoreButtons = ({ variant = "dark" }: { variant?: "dark" | "light" }) => {
  const base = variant === "dark"
    ? "bg-white/10 border-white/10 text-white hover:bg-signal hover:border-signal"
    : "bg-jet text-bone hover:bg-signal";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <a href="#" className={`relative flex items-center gap-3 px-6 py-4 border transition-all duration-300 ${base}`}>
        <Apple className="w-6 h-6" />
        <div className="text-left">
          <span className="block text-[10px] font-body uppercase tracking-wider opacity-60">Download on the</span>
          <span className="block text-sm font-display font-medium uppercase">App Store</span>
        </div>
        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[9px] font-body font-medium uppercase tracking-wider bg-signal text-white rounded-sm">
          Soon
        </span>
      </a>
      <a href="#" className={`flex items-center gap-3 px-6 py-4 border transition-all duration-300 ${base}`}>
        <Play className="w-6 h-6" />
        <div className="text-left">
          <span className="block text-[10px] font-body uppercase tracking-wider opacity-60">Get it on</span>
          <span className="block text-sm font-display font-medium uppercase">Google Play</span>
        </div>
      </a>
    </div>
  );
};
