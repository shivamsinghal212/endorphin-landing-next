'use client';

import { useEffect } from 'react';

export default function RaceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[races/[slug]] render error:', error);
  }, [error]);

  return (
    <div
      style={{
        background: '#F5F0EB',
        color: '#0A0A0A',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          Couldn’t load this race.
        </h1>
        <p style={{ color: '#8A8278', marginBottom: 24, lineHeight: 1.6 }}>
          The race data didn’t load. This is usually a brief network blip — try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 26px',
            background: '#E6232A',
            color: '#fff',
            fontFamily: 'Oswald, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            border: 0,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
