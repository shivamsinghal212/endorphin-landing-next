'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClubEventRecapPhoto, ClubEventRecapVideo } from '@/lib/admin-api';

// Unified gallery reel: merges photos and videos into a single horizontal
// scroller with shared progress segments, counter, and arrow controls.
// Videos render first (motion content draws attention up-front), then photos.

type GalleryItem =
  | { kind: 'video'; data: ClubEventRecapVideo }
  | { kind: 'photo'; data: ClubEventRecapPhoto };

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface FullscreenableVideo extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

function PhotoCard({ photo, index }: { photo: ClubEventRecapPhoto; index: number }) {
  return (
    <figure className="last-run-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.captionTitle || `Photo ${index + 1}`}
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
  );
}

function VideoCard({
  video,
  index,
  reduceMotion,
}: {
  video: ClubEventRecapVideo;
  index: number;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [armed, setArmed] = useState(false);

  // Lazy-load video src only when the tile nears the viewport. preload="metadata"
  // keeps the initial fetch tiny even after src is assigned.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setArmed(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setArmed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const enterFullscreen = () => {
    const el = ref.current as FullscreenableVideo | null;
    if (!el) return;
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => el.webkitEnterFullscreen?.());
    } else {
      el.webkitEnterFullscreen?.();
    }
  };

  const dur = formatDuration(video.durationSec);

  return (
    <figure className="last-run-card">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={armed ? video.url : undefined}
        poster={video.posterUrl ?? undefined}
        controls
        muted
        playsInline
        preload="metadata"
        width={900}
        height={1125}
        onClick={enterFullscreen}
        onDoubleClick={enterFullscreen}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: '#000',
          transition: reduceMotion ? 'none' : undefined,
        }}
        aria-label={video.captionTitle || `Video ${index + 1}`}
      />
      <div className="last-run-card-scrim" />
      {(video.captionTitle || video.captionMeta || dur) && (
        <figcaption className="last-run-card-cap">
          {video.captionTitle && <div className="t">{video.captionTitle}</div>}
          {(video.captionMeta || dur) && (
            <div className="m">
              {[video.captionMeta, dur].filter(Boolean).join(' · ')}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export function RunGallery({
  photos,
  videos,
}: {
  photos: ClubEventRecapPhoto[];
  videos: ClubEventRecapVideo[];
}) {
  const reelRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const items: GalleryItem[] = [
    ...videos.map((v) => ({ kind: 'video' as const, data: v })),
    ...photos.map((p) => ({ kind: 'photo' as const, data: p })),
  ];
  const total = items.length;

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
  }, [total]);

  const scrollByAmount = (delta: number) => {
    reelRef.current?.scrollBy({
      left: delta,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const scrollTo = (i: number) => {
    reelRef.current?.scrollTo({
      left: i * step(),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  if (total === 0) return null;

  return (
    <>
      <div className="last-run-progress" role="tablist" aria-label="Gallery progress">
        {items.map((_, i) => (
          <button
            key={i}
            className="last-run-seg"
            data-idx={i}
            data-active={i <= idx ? true : undefined}
            aria-label={`Item ${i + 1}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      <div
        ref={reelRef}
        className="last-run-reel"
        tabIndex={0}
        aria-label="Gallery"
        onScroll={update}
      >
        {items.map((item, i) =>
          item.kind === 'video' ? (
            <VideoCard
              key={`v-${item.data.url}-${i}`}
              video={item.data}
              index={i}
              reduceMotion={reduceMotion}
            />
          ) : (
            <PhotoCard key={`p-${item.data.url}-${i}`} photo={item.data} index={i} />
          ),
        )}
      </div>

      <div className="last-run-footer">
        <div className="last-run-counter">
          <span className="now">{String(idx + 1).padStart(2, '0')}</span>
          {' / '}
          {String(total).padStart(2, '0')}
          {' · Gallery'}
        </div>
        <div className="last-run-arrows">
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Previous"
            disabled={atStart}
            onClick={() => scrollByAmount(-step())}
          >
            <svg aria-hidden="true"><use href="#i-chev-left" /></svg>
          </button>
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Next"
            disabled={atEnd}
            onClick={() => scrollByAmount(step())}
          >
            <svg aria-hidden="true"><use href="#i-chev-right" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}
