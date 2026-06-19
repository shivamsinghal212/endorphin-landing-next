'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClubCoach } from '@/lib/admin-api';

// "Coaches" section for the public club page. Renders a grid of coach
// cards (a horizontal swipe carousel on mobile); tapping a card opens a
// modal with the full bio, a photo slider, and an Instagram link.
//
// Server-rendered data, client interactivity — the whole section is a
// client component because the modal/slider need state. It sits above
// "Led by" and only renders when the club has at least one coach.

// Split the long-form experience into paragraphs. Authors separate
// paragraphs with blank lines; we tolerate single newlines too.
function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// One-line teaser for the card, derived from the first paragraph so the
// backend doesn't need a separate field. CSS clamps it; this just caps
// the work and avoids a giant string in the DOM.
function toTeaser(text: string | null | undefined): string {
  const first = toParagraphs(text)[0] || '';
  return first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
}

export function Coaches({ coaches }: { coaches: ClubCoach[] }) {
  const list = (coaches ?? [])
    .filter((c) => c.name)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (list.length === 0) return null;

  return (
    <section className="coaches" aria-labelledby="coaches-title">
      <header className="coaches-head">
        <h2 className="coaches-title" id="coaches-title">Coaches</h2>
        <span className="kicker coaches-count">
          {list.length} {list.length === 1 ? 'coach' : 'coaches'}
        </span>
      </header>

      <div className="coaches-grid">
        {list.map((coach, i) => (
          <CoachCard key={coach.id ?? i} coach={coach} onOpen={() => setOpenIdx(i)} />
        ))}
      </div>

      {openIdx !== null && (
        <CoachModal
          coaches={list}
          index={openIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </section>
  );
}

function CoachCard({ coach, onOpen }: { coach: ClubCoach; onOpen: () => void }) {
  const cover = coach.photos?.[0] || null;
  const count = coach.photos?.length ?? 0;
  const teaser = toTeaser(coach.experience);

  return (
    <button type="button" className="coach-card" onClick={onOpen} aria-label={`View ${coach.name}'s profile`}>
      <div className="coach-photo">
        {count > 1 && (
          <span className="coach-photo-count">
            <svg aria-hidden="true"><use href="#i-chev-right" /></svg>
            {count}
          </span>
        )}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={coach.name} loading="lazy" width={600} height={750} />
        ) : (
          <div className="coach-photo-empty" aria-hidden="true">
            {(coach.name.trim()[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="coach-photo-overlay">
          <div className="coach-card-name">{coach.name}</div>
          {coach.designation && <div className="coach-card-role">{coach.designation}</div>}
        </div>
      </div>
      <div className="coach-card-body">
        {teaser && <p className="coach-card-teaser">{teaser}</p>}
        <div className="coach-card-foot">
          <span className="coach-card-view">
            View profile
            <svg aria-hidden="true"><use href="#i-arrow-right" /></svg>
          </span>
          {coach.instagramUrl && (
            <span className="icon-btn sm" data-brand="instagram" aria-hidden="true">
              <svg><use href="#i-instagram" /></svg>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CoachModal({
  coaches,
  index,
  onClose,
}: {
  coaches: ClubCoach[];
  index: number;
  onClose: () => void;
}) {
  const coach = coaches[index];
  const photos = coach.photos ?? [];
  const paragraphs = toParagraphs(coach.experience);
  const [slide, setSlide] = useState(0);
  const touchX = useRef<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (photos.length <= 1) return;
      setSlide((s) => (s + delta + photos.length) % photos.length);
    },
    [photos.length],
  );

  // Esc to close, arrows to navigate; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, step]);

  return (
    <div
      className="coach-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${coach.name} — coach profile`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="coach-modal">
        <button type="button" className="coach-modal-close" onClick={onClose} aria-label="Close">
          <svg aria-hidden="true"><use href="#i-close" /></svg>
        </button>

        <div
          className="coach-slider"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <span className="coach-modal-handle" aria-hidden="true" />
          {photos.length > 0 ? (
            <>
              <div
                className="coach-slides"
                style={{ transform: `translateX(-${slide * 100}%)` }}
              >
                {photos.map((src, i) => (
                  <div className="coach-slide" key={`${src}-${i}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${coach.name} — photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
                  </div>
                ))}
              </div>
              {photos.length > 1 && (
                <>
                  <button type="button" className="coach-slider-btn prev" onClick={() => step(-1)} aria-label="Previous photo">
                    <svg aria-hidden="true"><use href="#i-chev-left" /></svg>
                  </button>
                  <button type="button" className="coach-slider-btn next" onClick={() => step(1)} aria-label="Next photo">
                    <svg aria-hidden="true"><use href="#i-chev-right" /></svg>
                  </button>
                  <div className="coach-dots">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`coach-dot ${i === slide ? 'active' : ''}`}
                        onClick={() => setSlide(i)}
                        aria-label={`Photo ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="coach-slider-empty" aria-hidden="true">
              {(coach.name.trim()[0] || '?').toUpperCase()}
            </div>
          )}
        </div>

        <div className="coach-modal-content">
          <span className="coach-modal-kicker">Coach</span>
          <h3 className="coach-modal-name">{coach.name}</h3>
          {coach.designation && <p className="coach-modal-role">{coach.designation}</p>}
          {coach.specialisations?.length > 0 && (
            <div className="coach-modal-tags">
              {coach.specialisations.map((s) => (
                <span className="coach-tag" key={s}>{s}</span>
              ))}
            </div>
          )}
          {paragraphs.length > 0 && (
            <div className="coach-modal-bio">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          {coach.instagramUrl && (
            <div className="coach-modal-actions">
              <a
                className="coach-ig-btn"
                href={coach.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg aria-hidden="true"><use href="#i-instagram" /></svg>
                Instagram
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
