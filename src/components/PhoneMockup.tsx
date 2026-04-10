'use client';

const PhoneMockup = () => (
  <div className="relative w-[280px] md:w-[300px]">
    {/* Phone body */}
    <div className="rounded-[3rem] border border-bone/10 bg-slate p-3 shadow-2xl shadow-black/50">
      {/* Dynamic island */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-jet rounded-full z-20" />

      {/* Screen */}
      <div className="rounded-[2.4rem] overflow-hidden bg-jet aspect-[9/19.5]">
        <div className="p-5 pt-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="font-display text-xs text-bone/50 uppercase tracking-wider">Endorfin</span>
            <div className="w-6 h-6 rounded-full bg-signal/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-signal" />
            </div>
          </div>

          {/* Map area */}
          <div className="flex-1 rounded-2xl bg-slate/80 mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-signal/5 via-transparent to-signal/3" />
            <div className="absolute top-[30%] left-[40%] w-3 h-3 rounded-full bg-signal animate-ping opacity-40" />
            <div className="absolute top-[30%] left-[40%] w-2 h-2 rounded-full bg-signal" />
            <div className="absolute top-[55%] right-[30%] w-2 h-2 rounded-full bg-bone/20" />
            <div className="absolute bottom-[25%] left-[25%] w-2 h-2 rounded-full bg-bone/20" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <span className="font-body text-[9px] uppercase tracking-[0.2em] text-bone/20">Events near you</span>
            </div>
          </div>

          {/* Event cards */}
          {["Mumbai Marathon", "Bangalore 10K"].map((name, i) => (
            <div key={name} className="flex items-center gap-3 p-3 bg-slate/60 rounded-xl mb-2 border border-bone/5">
              <div className={`w-9 h-9 rounded-lg ${i === 0 ? "bg-signal/20" : "bg-bone/5"}`} />
              <div className="flex-1 min-w-0">
                <div className="font-body text-[11px] text-bone/80 truncate">{name}</div>
                <div className="font-body text-[9px] text-bone/30 mt-0.5">{i === 0 ? "Jan 19" : "Feb 8"} · {i === 0 ? "42K" : "10K"}</div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-signal text-[8px] font-body font-medium text-white uppercase tracking-wider shrink-0">
                Going
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default PhoneMockup;
