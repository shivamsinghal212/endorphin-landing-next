'use client';

import Link from 'next/link';
import type { RaceCardData } from '@/lib/race-card-data';
import { eventPath } from '@/lib/event-path';
import { useImgFallback } from '@/lib/img-fallback';

/**
 * One upcoming race, in the site's card language.
 *
 * Shared deliberately: the /running-events hub and the
 * /running-events/{scope}/{city} landers used to ship two different race
 * cards, which made the landers read as a different product. One component
 * means they cannot drift again.
 */

const IST = 'Asia/Kolkata';

function fmtDay(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: IST });
}

const RunIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="13" cy="4" r="1.6" />
    <path d="M5 20l3-5 3 2 1-4-3-3 4-1 2 3 3 1" />
  </svg>
);

/** Shortest honest distance label from the race's categories. */
function distanceLabel(r: RaceCardData): string | null {
  const cats = (r.distanceCategories ?? [])
    .map((c) => (c.categoryName || '').trim())
    .filter(Boolean);
  if (!cats.length) return null;
  const pretty = cats[0].toUpperCase().replace(/\s+/g, '');
  if (pretty === 'M') return 'Marathon';
  if (pretty === 'HM') return 'Half marathon';
  return cats[0];
}

export default function RaceCard({ r, hidden = false }: { r: RaceCardData; hidden?: boolean }) {
  const { isFailed, imgProps } = useImgFallback();
  const img = r.imageUrl;
  const showImg = Boolean(img) && !isFailed(img!);
  const day = fmtDay(r.startTime);
  const where = r.locationName || null;
  const dist = distanceLabel(r);

  return (
    <Link
      href={eventPath(r)}
      className="v1c-exp-card is-landscape"
      hidden={hidden}
      aria-label={r.title}
    >
      <div className="v1c-exp-media is-landscape">
        {showImg ? (
          <>
            {/* Blurred backdrop that fills the letterbox bars behind a
                landscape cover (the sharp copy below is object-fit: contain).
                An <img loading="lazy">, NOT a CSS background-image: a
                background on a visible element is fetched eagerly, which
                silently defeated loading="lazy" on the sharp copy and made
                every one of the ~243 covers on /running-events download at
                once — 166 MB, 35s mobile LCP. Same src, so the browser still
                issues a single request. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="v1c-exp-bg" src={img!} alt="" loading="lazy" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img!} alt={r.title} loading="lazy" {...imgProps(img!)} />
          </>
        ) : (
          // Name, not initials — two letters say nothing about a race.
          <div className="v1c-exp-media-fallback is-title" aria-hidden>
            <span>{r.title}</span>
          </div>
        )}
        <span className="v1c-exp-badge">
          <RunIcon />
          {dist ?? 'Race'}
        </span>
      </div>
      <div className="v1c-exp-body">
        <h3 className="v1c-exp-title">{r.title}</h3>
        <div className="v1c-exp-evtmeta">
          {day}
          {where && (
            <>
              <span className="v1c-exp-sep">·</span>
              {where}
            </>
          )}
          {r.priceMin != null && (
            <>
              <span className="v1c-exp-sep">·</span>
              {r.priceMin === 0 ? 'Free' : `₹${r.priceMin.toLocaleString('en-IN')}`}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
