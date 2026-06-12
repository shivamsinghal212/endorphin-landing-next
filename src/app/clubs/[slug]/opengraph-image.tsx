import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getClub } from '@/lib/admin-api';

// 1200×630 share card generated on-demand from the DB record.
// Next's file convention wires this to /clubs/[slug]/opengraph-image
// and sets og:image + twitter:image automatically.
//
// Node runtime (not edge): we read the brand TTFs + endorfin mark from
// disk via process.cwd() — the pattern Next documents for custom fonts —
// so the card renders in Oswald + Fraunces italic (matching the live
// club hero) instead of a generic system sans.

export const runtime = 'nodejs';
export const alt = 'Endorfin running club';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

// ─── palette (duplicated from CSS tokens — must be literal for next/og) ──
const BONE = '#F5F0EB';
const JET = '#0A0A0A';
const RED = '#E6232A';
const BONE_70 = 'rgba(245, 240, 235, 0.62)';
const HAIRLINE = 'rgba(245, 240, 235, 0.16)';

// Load brand assets from disk once per cold start. process.cwd() is the
// Next.js project root at runtime.
const asset = (...p: string[]) => readFile(join(process.cwd(), ...p));
const fontsPromise = Promise.all([
  asset('assets', 'og', 'Oswald-Medium.ttf'),
  asset('assets', 'og', 'Oswald-SemiBold.ttf'),
  asset('assets', 'og', 'Fraunces-Italic.ttf'),
  asset('public', 'email-logo-dark.png'),
]);

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const [club, [oswald, oswaldSemi, fraunces, mark]] = await Promise.all([
    getClub(slug).catch(() => null),
    fontsPromise,
  ]);

  const fonts = [
    { name: 'Oswald', data: oswald, weight: 500 as const, style: 'normal' as const },
    { name: 'Oswald', data: oswaldSemi, weight: 600 as const, style: 'normal' as const },
    { name: 'Fraunces', data: fraunces, weight: 400 as const, style: 'italic' as const },
  ];
  const markDataUrl = `data:image/png;base64,${Buffer.from(mark).toString('base64')}`;

  // Fallback for missing/unpublished clubs — plain jet card with mark.
  if (!club || !club.publishedAt) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%',
            background: JET, color: BONE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            fontFamily: 'Oswald', fontSize: 56, fontWeight: 600, letterSpacing: '-0.01em',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={markDataUrl} width={64} height={64} style={{ width: 64, height: 64 }} />
          endorfin
        </div>
      ),
      { ...size, fonts },
    );
  }

  // Pull the club logo down as a data URL so both the foreground badge and
  // the oversized background watermark render from one fetch (and the card
  // never depends on satori's remote-image fetch succeeding).
  let logoDataUrl: string | null = null;
  if (club.logoUrl) {
    try {
      const res = await fetch(club.logoUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get('content-type') || 'image/jpeg';
        logoDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      }
    } catch {
      logoDataUrl = null;
    }
  }

  // Only stats that carry a real signal — drop the zeros that read as
  // "broken" in a share preview (e.g. 0 km / 0 years for a young club).
  const stats = [
    { n: club.stats.members, l: 'Members' },
    { n: club.stats.runsThisMonth, l: 'Runs / mo' },
    { n: club.stats.kmThisMonth, l: 'KM / mo' },
    { n: club.stats.yearsRunning, l: 'Years' },
  ].filter((s) => s.n > 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: JET, color: BONE,
          display: 'flex', flexDirection: 'column',
          padding: '56px 72px',
          position: 'relative',
          fontFamily: 'Oswald',
        }}
      >
        {/* Oversized ghost logo bleeding off the top-right edge for depth */}
        {logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={logoDataUrl}
            width={760}
            height={760}
            style={{
              position: 'absolute', top: -120, right: -200,
              width: 760, height: 760, borderRadius: 9999,
              objectFit: 'cover', opacity: 0.3,
            }}
          />
        )}
        {/* Gradient wash so the watermark fades into the jet and never
            fights the text on the left. */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(90deg, #0A0A0A 38%, rgba(10,10,10,0.35) 100%)',
          }}
        />
        {/* Red accent stripe on the left edge (drawn over the wash). */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: '100%', background: RED }} />

        {/* Top row: endorfin mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={markDataUrl} width={44} height={44} style={{ width: 44, height: 44 }} />
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', color: BONE }}>endorfin</div>
        </div>

        {/* Join-the-club button, pinned bottom-right */}
        <div
          style={{
            position: 'absolute', bottom: 48, right: 64,
            display: 'flex', alignItems: 'center', gap: 10,
            background: RED, color: BONE,
            fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em',
            padding: '16px 30px', borderRadius: 9999,
          }}
        >
          Join the club →
        </div>

        {/* Middle: logo + name + subtitle + city */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 44, flexGrow: 1, marginTop: 36 }}>
          {logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={logoDataUrl}
              width={196}
              height={196}
              style={{
                width: 196, height: 196, borderRadius: 9999,
                objectFit: 'cover', border: `2px solid ${HAIRLINE}`, flexShrink: 0,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            {club.kicker && (
              <div
                style={{
                  fontSize: 20, fontWeight: 500, textTransform: 'uppercase',
                  letterSpacing: '0.18em', color: BONE_70, marginBottom: 18,
                }}
              >
                {club.kicker}
              </div>
            )}
            <div
              style={{
                fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 98, fontWeight: 400,
                letterSpacing: '-0.015em', lineHeight: 1.02, color: BONE,
              }}
            >
              {club.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
              {club.subtitle && (
                <div style={{ fontSize: 26, fontWeight: 500, color: BONE_70, letterSpacing: '0.01em' }}>
                  {club.subtitle}
                </div>
              )}
              {club.subtitle && club.city && (
                <div style={{ width: 5, height: 5, borderRadius: 9999, background: RED }} />
              )}
              {club.city && (
                <div
                  style={{
                    fontSize: 22, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.14em', color: BONE,
                  }}
                >
                  {club.city}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: stats strip (centered, zero-value stats hidden) */}
        {stats.length > 0 && (
          <div
            style={{
              display: 'flex', justifyContent: 'center', gap: 80,
              borderTop: `1px solid ${HAIRLINE}`, paddingTop: 26, marginTop: 12,
            }}
          >
            {stats.map((s) => (
              <div key={s.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                <div style={{ fontSize: 54, fontWeight: 600, color: BONE, lineHeight: 1 }}>
                  {s.n.toLocaleString('en-IN')}
                </div>
                <div
                  style={{
                    fontSize: 16, fontWeight: 500, textTransform: 'uppercase',
                    letterSpacing: '0.16em', color: BONE_70, marginTop: 10,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
