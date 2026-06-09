import { ImageResponse } from 'next/og';
import { getClub } from '@/lib/admin-api';

// 1200×630 share card for a single club event, generated on-demand. Next's
// file convention wires this to og:image + twitter:image for the event page.
// Edge runtime.

export const runtime = 'edge';
export const alt = 'Club run on Endorfin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const TZ = 'Asia/Kolkata';

// ─── palette (literal — required for next/og) ──
const BONE = '#F5F0EB';
const JET = '#0A0A0A';
const RED = '#E6232A';
const MUTED = '#8A8278';

type Props = { params: Promise<{ slug: string; eventSlug: string }> };

interface OgEvent {
  title: string;
  startTime: string;
  locationName: string | null;
  coverImageUrl: string | null;
}

async function fetchEvent(slug: string, eventIdent: string): Promise<OgEvent | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/clubs/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventIdent)}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as OgEvent;
  } catch {
    return null;
  }
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(d);
}

export default async function OGImage({ params }: Props) {
  const { slug, eventSlug } = await params;
  const [club, event] = await Promise.all([
    getClub(slug).catch(() => null),
    fetchEvent(slug, eventSlug),
  ]);

  if (!event) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', background: BONE, color: JET,
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

  const dateLabel = fmt(event.startTime, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const timeLabel = fmt(event.startTime, { hour: 'numeric', minute: '2-digit', hour12: true });
  const metaLine = [dateLabel, timeLabel, event.locationName].filter(Boolean).join('  ·  ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex',
          background: BONE, color: JET, fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Red accent stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 8, height: '100%', background: RED }} />

        {/* Left: text column */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', flex: 1,
            padding: '56px 56px 56px 72px', minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>endorfin</div>
            <div
              style={{
                fontSize: 18, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.16em', color: RED,
              }}
            >
              RSVP →
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
            {club?.name && (
              <div
                style={{
                  fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.16em',
                  color: MUTED, marginBottom: 18,
                }}
              >
                {club.name}
              </div>
            )}
            <div
              style={{
                fontSize: 72, fontWeight: 700, letterSpacing: '-0.025em',
                lineHeight: 1.02, color: JET,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {event.title}
            </div>
            {metaLine && (
              <div style={{ fontSize: 28, color: JET, marginTop: 28, lineHeight: 1.3 }}>
                {metaLine}
              </div>
            )}
          </div>
        </div>

        {/* Right: cover image (when present) */}
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={event.coverImageUrl}
            width={460}
            height={630}
            style={{ width: 460, height: 630, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
      </div>
    ),
    size,
  );
}
