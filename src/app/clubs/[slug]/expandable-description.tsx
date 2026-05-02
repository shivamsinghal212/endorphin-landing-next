'use client';

import { useState } from 'react';

const COLLAPSED_CHARS = 220;

export function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const needsTruncation = trimmed.length > COLLAPSED_CHARS;

  if (!needsTruncation) {
    return <p className="hero-description">{trimmed}</p>;
  }

  const visible = expanded ? trimmed : `${trimmed.slice(0, COLLAPSED_CHARS).trimEnd()}…`;

  return (
    <p className="hero-description hero-description--expandable">
      {visible}{' '}
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
