'use client';

// Sibling reel for recap videos. Mirrors the visual rhythm of `last-run-reel.tsx`
// but renders <video> tiles. Each tile preloads metadata only and gates the
// real `src` via IntersectionObserver to avoid burning cellular bandwidth on
// off-screen tiles. Tap → native fullscreen.

import { useEffect, useRef, useState } from 'react';
import type { ClubEventRecapVideo } from '@/lib/admin-api';

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

function VideoTile({
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

  // Only assign src when the tile is near the viewport. preload="metadata"
  // means even after we set src, the browser only fetches the moov atom
  // (small) — the body is fetched on play.
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
      el.requestFullscreen().catch(() => {
        // Fallback: iOS Safari uses webkitEnterFullscreen.
        el.webkitEnterFullscreen?.();
      });
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
          // Honor user motion preference — disable any implicit transitions.
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

export function RecapVideoReel({ videos }: { videos: ClubEventRecapVideo[] }) {
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

  const total = videos.length;

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
      <div className="last-run-progress" role="tablist" aria-label="Video progress">
        {videos.map((_, i) => (
          <button
            key={i}
            className="last-run-seg"
            data-idx={i}
            data-active={i <= idx ? true : undefined}
            aria-label={`Video ${i + 1}`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      <div
        ref={reelRef}
        className="last-run-reel"
        tabIndex={0}
        aria-label="Video reel"
        onScroll={update}
      >
        {videos.map((v, i) => (
          <VideoTile
            key={`${v.url}-${i}`}
            video={v}
            index={i}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <div className="last-run-footer">
        <div className="last-run-counter">
          <span className="now">{String(idx + 1).padStart(2, '0')}</span>
          {' / '}
          {String(total).padStart(2, '0')}
          {' · Videos'}
        </div>
        <div className="last-run-arrows">
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Previous video"
            disabled={atStart}
            onClick={() => scrollBy(-step())}
          >
            <svg aria-hidden="true"><use href="#i-chev-left" /></svg>
          </button>
          <button
            className="last-run-arrow"
            type="button"
            aria-label="Next video"
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
