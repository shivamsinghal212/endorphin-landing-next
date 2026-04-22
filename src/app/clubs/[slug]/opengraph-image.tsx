import { ImageResponse } from 'next/og';
import { getClub } from '@/lib/admin-api';

// 1200×630 share card generated on-demand from the DB record.
// Next's file convention wires this to /clubs/[slug]/opengraph-image
// and sets og:image + twitter:image automatically. Edge runtime.

export const runtime = 'edge';
export const alt = 'Endorfin running club';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

// ─── palette (duplicated from CSS tokens — must be literal for next/og) ──
const BONE = '#F5F0EB';
const JET = '#0A0A0A';
const RED = '#E6232A';
const MUTED = '#8A8278';
const HAIRLINE = 'rgba(10, 10, 10, 0.14)';

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const club = await getClub(slug).catch(() => null);

  // Fallback for missing/unpublished clubs — plain bone card with wordmark.
  if (!club || !club.publishedAt) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%',
            background: BONE, color: JET,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 56, fontWeight: 700, letterSpacing: '-0.01em',
          }}
        >
          endorfin
        </div>
      ),
      size,
    );
  }

  const stats = [
    { n: club.stats.members, l: 'Members' },
    { n: club.stats.runsThisMonth, l: 'Runs / mo' },
    { n: club.stats.kmThisMonth, l: 'KM / mo' },
    { n: club.stats.yearsRunning, l: 'Years' },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: BONE, color: JET,
          display: 'flex', flexDirection: 'column',
          padding: '56px 72px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Red accent stripe on the left edge */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: 8, height: '100%', background: RED,
          }}
        />

        {/* Top row: endorfin wordmark + breadcrumb */}
        <div
          style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>endorfin</div>
          <div
            style={{
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: MUTED,
            }}
          >
            clubs · {club.city}
          </div>
        </div>

        {/* Middle: logo + name + subtitle */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 40,
            flexGrow: 1, marginTop: 40,
          }}
        >
          {club.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={club.logoUrl}
              width={200}
              height={200}
              style={{
                width: 200, height: 200, borderRadius: 9999,
                objectFit: 'cover',
                background: JET,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            {club.kicker && (
              <div
                style={{
                  fontSize: 18,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: MUTED,
                  marginBottom: 12,
                }}
              >
                {club.kicker}
              </div>
            )}
            <div
              style={{
                fontSize: 104,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 0.95,
                color: JET,
              }}
            >
              {club.name}
            </div>
            {club.subtitle && (
              <div
                style={{
                  fontSize: 32,
                  fontStyle: 'italic',
                  color: JET,
                  lineHeight: 1.3,
                  marginTop: 20,
                  maxWidth: 760,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {club.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: stats strip */}
        <div
          style={{
            display: 'flex',
            borderTop: `1px solid ${HAIRLINE}`,
            paddingTop: 24,
            marginTop: 16,
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.l}
              style={{
                display: 'flex', flexDirection: 'column',
                flex: 1,
                paddingLeft: i === 0 ? 0 : 24,
                borderLeft: i === 0 ? 'none' : `1px solid ${HAIRLINE}`,
              }}
            >
              <div style={{ fontSize: 52, fontWeight: 700, color: JET, lineHeight: 1 }}>
                {s.n.toLocaleString('en-IN')}
              </div>
              <div
                style={{
                  fontSize: 16,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: MUTED,
                  marginTop: 10,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

      </div>
    ),
    size,
  );
}
