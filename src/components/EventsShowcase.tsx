'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { fadeUp, stagger } from "@/lib/animations";

interface Event {
  id: string;
  title: string;
  imageUrl?: string;
  startTime: string;
  locationName?: string;
  priceMin?: number;
  currency?: string;
  distanceCategories?: { categoryName: string }[];
}

const CITIES = ["All", "Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"];
const API_BASE = "https://api.endorfin.run/api/v1";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.endorfin.app";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const tags = (event.distanceCategories ?? []).map((d) => d.categoryName).slice(0, 4);
  const price = event.priceMin != null ? `₹${event.priceMin}` : "Free";

  return (
    <motion.article
      variants={fadeUp}
      custom={index}
      className="group bg-white rounded-2xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300"
    >
    <a
      href={`${API_BASE.replace("/api/v1", "")}/e/${event.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE7E0]">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-[#B0A89E]">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M3 7a4 4 0 014-4h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="font-display text-sm font-semibold text-jet">{price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-jet leading-tight line-clamp-2 group-hover:text-signal transition-colors duration-200">
          {event.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-dim">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-body text-sm">
            {formatDate(event.startTime)}
            {event.locationName ? ` · ${event.locationName}` : ""}
          </span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-bone text-dim font-display text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
    </motion.article>
  );
}

export default function EventsShowcase() {
  const [city, setCity] = useState("All");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "6" });
    if (city !== "All") params.set("city", city);

    fetch(`${API_BASE}/events?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.items ?? []);
        setTotalCount(data.total ?? 0);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <section className="relative py-24 lg:py-32 bg-bone overflow-hidden">
      {/* Subtle grain texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none grain" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal mb-4"
          >
            Upcoming Races
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-jet leading-[1.1]"
          >
            FIND YOUR NEXT
            <br />
            <span className="text-signal">FINISH LINE</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 font-body text-dim text-lg max-w-lg mx-auto"
          >
            Discover marathons, half marathons, and fun runs happening across India
          </motion.p>
        </motion.div>

        {/* City Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              aria-pressed={city === c}
              className={`
                font-display text-sm font-medium uppercase tracking-wider
                px-5 py-2.5 rounded-full transition-all duration-200 cursor-pointer
                ${city === c
                  ? "bg-jet text-white shadow-lg shadow-jet/20"
                  : "bg-white text-dim hover:bg-jet hover:text-white hover:shadow-lg hover:shadow-jet/10"
                }
              `}
            >
              {c}
            </button>
          ))}
        </motion.div>

        {/* Events Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-busy={true}
              aria-label="Loading events"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                  <div className="aspect-[16/10] bg-[#EDE7E0]" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-[#EDE7E0] rounded-md w-3/4" />
                    <div className="h-4 bg-[#EDE7E0] rounded-md w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-[#EDE7E0] rounded-md w-12" />
                      <div className="h-6 bg-[#EDE7E0] rounded-md w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : events.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <p className="font-display text-xl text-dim">No events found in {city}</p>
              <p className="font-body text-dim/60 mt-2">Try a different city</p>
            </motion.div>
          ) : (
            <motion.div
              key={city}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="font-body text-dim mb-6" role="status">
            {totalCount > 6 ? (
              <>
                Showing 6 of <span className="font-semibold text-jet">{totalCount}+</span> events
              </>
            ) : (
              "Discover more events on the app"
            )}
          </p>
          <a
            href={PLAY_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-3
              bg-jet text-white font-display text-base font-semibold uppercase tracking-wider
              px-10 py-4 rounded-full
              hover:bg-signal hover:shadow-xl hover:shadow-signal/20
              transition-all duration-300 cursor-pointer
            "
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download Endorfin
          </a>
        </motion.div>
      </div>
    </section>
  );
}
