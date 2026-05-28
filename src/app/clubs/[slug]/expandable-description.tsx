'use client';

import { useState } from 'react';

const COLLAPSED_CHARS = 220;

export function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const needsTruncation = trimmed.length > COLLAPSED_CHARS;

  if (!needsTruncation) {
    return (
      <p className="hero-description">
        <span className="hero-description-text">{trimmed}</span>
      </p>
    );
  }

  // On desktop the slice keeps the visible text under COLLAPSED_CHARS.
  // On mobile the text span is also CSS-line-clamped to 2 lines so the
  // section stays compact regardless of where the slice happens to land.
  const visible = expanded
    ? trimmed
    : `${trimmed.slice(0, COLLAPSED_CHARS).trimEnd()}…`;

  return (
    <p
      className="hero-description hero-description--expandable"
      data-expanded={expanded}
    >
      <span className="hero-description-text">{visible}</span>
      <button
        type="button"
        className="hero-description-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? 'View less' : 'View more'}
      </button>
    </p>
  );
}
