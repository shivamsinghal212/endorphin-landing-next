import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);
// Stay under Vercel's ~4.5 MB serverless function body limit. The client
// compresses images above ~700 KB before sending, so this is a safety net.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_BUCKETS = new Set(['media', 'avatars']);

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  if (mime === 'image/gif') return 'gif';
  return 'bin';
}

function safeFolder(input: string): string | null {
  const cleaned = input.trim().replace(/^\/+|\/+$/g, '');
  if (!cleaned) return null;
  if (!/^[a-z0-9][a-z0-9/_-]*$/i.test(cleaned)) return null;
  if (cleaned.includes('..')) return null;
  return cleaned;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { ok: false, error: 'storage not configured' },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid form' }, { status: 400 });
  }

  const file = formData.get('file');
  const folderRaw = (formData.get('folder') ?? '').toString();
  const bucket = ((formData.get('bucket') ?? 'media').toString() || 'media').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file required' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: `unsupported type: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'file too large (max 10MB)' }, { status: 413 });
  }
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ ok: false, error: 'unknown bucket' }, { status: 400 });
  }
  const folder = safeFolder(folderRaw);
  if (!folder) {
    return NextResponse.json({ ok: false, error: 'invalid folder' }, { status: 400 });
  }

  const ext = extFromMime(file.type);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = `${folder}/${filename}`;

  const buffer = await file.arrayBuffer();

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: buffer,
    },
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    return NextResponse.json(
      { ok: false, error: `upload failed: ${uploadRes.status} ${text}` },
      { status: 502 },
    );
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({ ok: true, url: publicUrl });
}
