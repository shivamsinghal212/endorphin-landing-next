'use client';

import { useEffect, useState } from 'react';

const TOTAL = 12;

export default function NextButton() {
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    const sections = Array.from({ length: TOTAL }, (_, i) =>
      document.getElementById(`s${i + 1}`),
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!top) return;
        const n = Number(top.target.id.replace(/^s/, ''));
        if (Number.isFinite(n)) setCurrent(n);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const isLast = current >= TOTAL;
  const target = isLast ? 1 : current + 1;
  const label = isLast ? 'Back to top' : `Next slide (${target} of ${TOTAL})`;

  return (
    <a
      href={`#s${target}`}
      className="next-button"
      aria-label={label}
      data-direction={isLast ? 'up' : 'down'}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isLast ? (
          <>
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </>
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </>
        )}
      </svg>
    </a>
  );
}
