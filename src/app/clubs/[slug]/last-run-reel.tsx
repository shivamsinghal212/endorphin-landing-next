'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClubEventRecapPhoto } from '@/lib/admin-api';

type ClubLastRunPhoto = ClubEventRecapPhoto;

// Client-side reel: scroll-snap with progress segments, arrow buttons,
// and a live "01 / 06" counter. Mirrors the mockup's inline script 1:1.

export function LastRunReel({ photos }: { photos: ClubLastRunPhoto[] }) {
  const reelRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const total = photos.length;

  const step = () => {
    const reel = reelRef.current;
    if (!reel) return 340;
    const card = reel.querySelector<HTMLElement>('.last-run-card');
    if (!card) return 340;
    const cs = getComputedStyle(reel);
    const gap = parseFloat(cs.columnGap || cs.gap || '18') || 18;
    return card.getBoundingClientRect().width + gap;
  };

  const update = () => {
    const reel = reelRef.current;
    if (!reel) return;
    const s = step();
    const current = Math.round(reel.scrollLeft / s);
    const clamped = Math.min(total - 1, Math.max(0, current));
    setIdx(clamped);
    const max = reel.scrollWidth - reel.clientWidth - 1;
    setAtStart(reel.scrollLeft <= 0);
    setAtEnd(reel.scrollLeft >= max);
  };

  useEffect(() => {
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollBy = (delta: number) => {
    reelRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollTo = (i: number) => {
    reelRef.current?.scrollTo({ left: i * step(), behavior: 'smooth' });
  };

  return (
    <>
      <div className="last-run-progress" role="tablist" aria-label="Photo progress">
        {photos.map((_, i) => (
          <button
            key={i}
            className="last-run-seg"
            data-idx={i}
            data-active={i <= idx ? true : undefined}
            aria-label={`Photo ${i + 1}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      <div
        ref={reelRef}
        className="last-run-reel"
        tabIndex={0}
        aria-label="Photo reel"
        onScroll={update}
      >
        {photos.map((photo, i) => (
          <figure key={i} className="last-run-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.captionTitle || `Photo ${i + 1}`}
              loading="lazy"
              width={900}
              height={1125}
            />
            <div className="last-run-card-scrim" />
            {(photo.captionTitle || photo.captionMeta) && (
              <figcaption className="last-run-card-cap">
                {photo.captionTitle && <div className="t">{photo.captionTitle}</div>}
                {photo.captionMeta && <div className="m">{photo.captionMeta}</div>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <div className="last-run-footer">
        <div className="last-run-counter">
          <span className="now">{String(idx + 1).padStart(2, '0')}</span>
          {' / '}
          {String(total).padStart(2, '0')}
          {' · Photos'}
        </div>
        <div className="last-run-arrows">
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Previous photo"
            disabled={atStart}
            onClick={() => scrollBy(-step())}
          >
            <svg aria-hidden="true"><use href="#i-chev-left" /></svg>
          </button>
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Next photo"
            disabled={atEnd}
            onClick={() => scrollBy(step())}
          >
            <svg aria-hidden="true"><use href="#i-chev-right" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}
