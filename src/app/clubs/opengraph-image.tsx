import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// 1200×630 share card for the national /clubs directory. Next's file
// convention wires this to /clubs/opengraph-image and sets og:image +
// twitter:image automatically (the page metadata previously had none, so
// shares rendered a blank large-summary card).
//
// Node runtime: we read the brand TTFs + endorfin mark from disk so the
// card renders in Oswald + Fraunces italic, matching the live hero — the
// same pattern as /clubs/[slug]/opengraph-image.

export const runtime = 'nodejs';
export const alt = 'Run clubs in India — the most happening clubs on Endorfin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ─── palette (literal — next/og can't read CSS tokens) ──
const BONE = '#F5F0EB';
const JET = '#0A0A0A';
const RED = '#E6232A';
const BONE_70 = 'rgba(245, 240, 235, 0.62)';
const HAIRLINE = 'rgba(245, 240, 235, 0.16)';

const asset = (...p: string[]) => readFile(join(process.cwd(), ...p));
const fontsPromise = Promise.all([
  asset('assets', 'og', 'Oswald-Medium.ttf'),
  asset('assets', 'og', 'Oswald-SemiBold.ttf'),
  asset('assets', 'og', 'Fraunces-Italic.ttf'),
  asset('public', 'email-logo-dark.png'),
]);

export default async function OGImage() {
  const [oswald, oswaldSemi, fraunces, mark] = await fontsPromise;

  const fonts = [
    { name: 'Oswald', data: oswald, weight: 500 as const, style: 'normal' as const },
    { name: 'Oswald', data: oswaldSemi, weight: 600 as const, style: 'normal' as const },
    { name: 'Fraunces', data: fraunces, weight: 400 as const, style: 'italic' as const },
  ];
  const markDataUrl = `data:image/png;base64,${Buffer.from(mark).toString('base64')}`;

  const cities = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune'];

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
        {/* Radial wash top-right for depth */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'radial-gradient(900px 600px at 100% 0%, rgba(230,35,42,0.18) 0%, rgba(10,10,10,0) 60%)',
          }}
        />
        {/* Red accent stripe on the left edge */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: '100%', background: RED }} />

        {/* Top row: endorfin mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={markDataUrl} width={44} height={44} style={{ width: 44, height: 44 }} />
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', color: BONE }}>endorfin</div>
        </div>

        {/* Middle: kicker + headline + subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 22, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.18em', color: BONE_70, marginBottom: 18,
            }}
          >
            Run clubs &amp; events · India
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'baseline',
              fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 104, fontWeight: 400,
              letterSpacing: '-0.015em', lineHeight: 1.0, color: BONE, maxWidth: 880,
            }}
          >
            Run Clubs in India<span style={{ color: RED }}>.</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: BONE_70, letterSpacing: '0.01em', marginTop: 26, maxWidth: 820 }}>
            Marathon training, trail runs &amp; social meetups — verified clubs near you.
          </div>
        </div>

        {/* Bottom: city pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: `1px solid ${HAIRLINE}`, paddingTop: 26 }}>
          {cities.map((c) => (
            <div
              key={c}
              style={{
                fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: BONE, border: `1px solid ${HAIRLINE}`, borderRadius: 9999, padding: '10px 22px',
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
