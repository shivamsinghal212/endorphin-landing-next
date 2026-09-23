import { ImageResponse } from 'next/og';

// 1200×630 share card for a Runners' Talk piece. Jet ground, big outlined
// hook word, headline, author line. Edge runtime.

export const runtime = 'edge';
export const alt = "Runners' Talk on Endorfin";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';
const JET = '#0A0A0A';
const BONE = '#F5F0EB';
const RED = '#E6232A';
const MUTED = '#948D86';

type Props = { params: Promise<{ slug: string }> };

interface OgPost {
  title: string;
  dek: string | null;
  hookText: string | null;
  authorName: string;
  authorRole: string | null;
}

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  let post: OgPost | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/v1/talk/posts/${encodeURIComponent(slug)}`);
    if (res.ok) post = (await res.json()) as OgPost;
  } catch {
    /* fall through to the plain card */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: JET, color: BONE, fontFamily: 'sans-serif', padding: '56px 72px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {post?.hookText && (
          <div
            style={{
              position: 'absolute', right: -20, top: -60, fontSize: 420, fontWeight: 800,
              color: '#1A1817', letterSpacing: '-0.04em', display: 'flex',
            }}
          >
            {post.hookText}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>endorfin</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '0.18em', color: RED, textTransform: 'uppercase' }}>
            Runners&apos; Talk
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 76, fontWeight: 800, lineHeight: 1.0, textTransform: 'uppercase',
              letterSpacing: '-0.01em', display: 'flex', maxWidth: 980,
            }}
          >
            {/* Keep "6 km" together on one line. */}
            {post ? post.title.replace(/(\d) (km|k)\b/gi, '$1\u00a0$2') : "Runners' Talk"}
          </div>
          {post?.dek && (
            <div style={{ fontSize: 36, color: '#CFC8C1', marginTop: 20, fontStyle: 'italic', display: 'flex' }}>
              {post.dek}
            </div>
          )}
        </div>
        {post && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 8, height: 44, background: RED, display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{post.authorName}</div>
              {post.authorRole && <div style={{ fontSize: 20, color: MUTED }}>{post.authorRole}</div>}
            </div>
          </div>
        )}
      </div>
    ),
    size,
  );
}
