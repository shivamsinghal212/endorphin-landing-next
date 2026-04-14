'use client';

import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/animations";

const DiscussionHighlight = () => (
  <section className="relative py-24 md:py-32 bg-jet overflow-hidden">
    <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.p
          variants={fadeUp}
          className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal mb-4"
        >
          What Others Don't Have
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-bone leading-[1.1] uppercase"
        >
          EVERY RACE HAS A<br />
          <span className="text-signal">CONVERSATION</span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-6 font-body text-bone/50 text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Ask about parking. Plan carpools. Discuss pace strategies. Share route photos.
          Every event on Endorfin has a live discussion — so you're never racing into the unknown.
        </motion.p>

        {/* Chat preview mockup */}
        <motion.div
          variants={fadeUp}
          className="mt-12 max-w-md mx-auto"
        >
          <div className="bg-bone rounded-2xl p-6 text-left space-y-4">
            {/* Sample messages */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-signal/20 flex items-center justify-center shrink-0">
                <span className="font-display text-xs font-bold text-signal">R</span>
              </div>
              <div>
                <p className="font-body text-xs text-dim font-medium">Rahul</p>
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 mt-0.5">
                  <p className="font-body text-sm text-jet">Anyone carpooling from Andheri? 🚗</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-signal/20 flex items-center justify-center shrink-0">
                <span className="font-display text-xs font-bold text-signal">P</span>
              </div>
              <div>
                <p className="font-body text-xs text-dim font-medium">Priya</p>
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 mt-0.5">
                  <p className="font-body text-sm text-jet">What's the parking situation at the venue?</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div>
                <div className="bg-signal rounded-xl rounded-tr-sm px-3 py-2">
                  <p className="font-body text-sm text-white">I'm driving from Bandra, can pick up 2!</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-signal/20 flex items-center justify-center shrink-0">
                <span className="font-display text-xs font-bold text-signal">A</span>
              </div>
              <div>
                <p className="font-body text-xs text-dim font-medium">Amit</p>
                <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 mt-0.5 space-y-2">
                  <p className="font-body text-xs font-semibold text-signal uppercase tracking-wider">Poll: What pace?</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-signal/20 rounded-full overflow-hidden">
                        <div className="h-full bg-signal rounded-full" style={{ width: '65%' }} />
                      </div>
                      <span className="font-body text-xs text-dim">5:30/km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-signal/20 rounded-full overflow-hidden">
                        <div className="h-full bg-signal rounded-full" style={{ width: '35%' }} />
                      </div>
                      <span className="font-body text-xs text-dim">6:00/km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-8 font-body text-bone/30 text-sm"
        >
          Text, photos, polls, reactions — everything you need before race day.
        </motion.p>
      </motion.div>
    </div>
  </section>
);

export default DiscussionHighlight;
