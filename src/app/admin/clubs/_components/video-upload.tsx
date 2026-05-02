'use client';

// Browser-direct upload to Supabase Storage. Vercel's serverless function
// body cap (~4.5 MB) makes the existing /api/admin/upload route unusable
// for real videos. We POST the file straight to Supabase using the public
// anon key — same approach the mobile app uses in `services/storage.ts`.
//
// requires env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// (server-side SUPABASE_URL / SUPABASE_ANON_KEY are NOT visible in the
// browser bundle, so we need the NEXT_PUBLIC_ prefixed copies).

import { useRef, useState } from 'react';
import type { ClubEventRecapVideo } from '@/lib/admin-api';

const VIDEO_MIME_ACCEPT = 'video/mp4,video/quicktime,video/webm';
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/webm',
]);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const POSTER_TARGET_SECONDS = 0.5;
const POSTER_MAX_DIMENSION = 1280;
const POSTER_JPEG_QUALITY = 0.82;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function extFromVideoMime(mime: string): string {
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/quicktime' || mime === 'video/mov') return 'mov';
  if (mime === 'video/webm') return 'webm';
  return 'bin';
}

function safeFolder(input: string): string {
  return input.trim().replace(/^\/+|\/+$/g, '');
}

async function uploadVideoDirect(
  file: File,
  folder: string,
): Promise<{ url: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Video uploads require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.',
    );
  }
  const cleaned = safeFolder(folder);
  if (!cleaned) throw new Error('invalid folder');

  const ext = extFromVideoMime(file.type);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = `${cleaned}/${filename}`;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/media/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upload failed (${res.status}): ${text || 'unknown error'}`);
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
  return { url };
}

// Server-route upload for the poster JPEG (it's small — fine for serverless).
async function uploadPosterViaServer(
  blob: Blob,
  folder: string,
): Promise<string> {
  const file = new File([blob], `poster-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  });
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  fd.append('bucket', 'media');
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    url?: string;
  };
  if (!res.ok || !data.ok || !data.url) {
    throw new Error('poster upload failed');
  }
  return data.url;
}

// Generate a poster frame from a chosen video at ~0.5s into the clip.
// Returns null if anything fails (poster is optional).
async function generatePosterAndDuration(
  file: File,
): Promise<{ blob: Blob; durationSec: number } | null> {
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    // Setting crossOrigin avoids canvas tainting only if the source is
    // remote — for blob: URLs it's a no-op but harmless.
    video.crossOrigin = 'anonymous';
    video.src = url;

    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load?.();
    };
    const finish = (
      out: { blob: Blob; durationSec: number } | null,
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(out);
    };

    const onLoaded = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      // Seek to a frame inside the clip but never past the end.
      const target = Math.min(POSTER_TARGET_SECONDS, Math.max(0, dur - 0.05));
      try {
        video.currentTime = target;
      } catch {
        finish(null);
      }
    };

    const onSeeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        const scale = Math.min(1, POSTER_MAX_DIMENSION / Math.max(w, h));
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, cw, ch);
        canvas.toBlob(
          (blob) => {
            if (!blob) return finish(null);
            const dur = Number.isFinite(video.duration) ? video.duration : 0;
            finish({ blob, durationSec: dur });
          },
          'image/jpeg',
          POSTER_JPEG_QUALITY,
        );
      } catch {
        finish(null);
      }
    };

    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', () => finish(null), { once: true });
    // 10s ceiling — some browsers stall on weird codecs.
    setTimeout(() => finish(null), 10_000);
  });
}

function validateVideo(file: File): string | null {
  if (!ALLOWED_VIDEO_MIMES.has(file.type)) {
    return `Unsupported format: ${file.type || 'unknown'}. Use MP4, MOV, or WebM.`;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File too large (${mb} MB). Max 100 MB.`;
  }
  return null;
}

export function VideoUploadField({
  label,
  videos,
  onChange,
  folder,
  hint,
}: {
  label: string;
  videos: ClubEventRecapVideo[];
  onChange: (videos: ClubEventRecapVideo[]) => void;
  folder: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setError(null);
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    try {
      const next: ClubEventRecapVideo[] = [...videos];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const invalid = validateVideo(file);
        if (invalid) throw new Error(invalid);

        const { url } = await uploadVideoDirect(file, folder);

        let posterUrl: string | null = null;
        let durationSec: number | null = null;
        try {
          const poster = await generatePosterAndDuration(file);
          if (poster) {
            durationSec = Number.isFinite(poster.durationSec)
              ? poster.durationSec
              : null;
            try {
              posterUrl = await uploadPosterViaServer(poster.blob, folder);
            } catch {
              posterUrl = null;
            }
          }
        } catch {
          /* swallow — poster is optional */
        }

        next.push({
          url,
          posterUrl,
          durationSec,
          captionTitle: null,
          captionMeta: null,
        });
        setProgress({ done: i + 1, total: files.length });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const remove = (i: number) => onChange(videos.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= videos.length) return;
    const next = [...videos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-2">
        {label}
      </label>
      {videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {videos.map((v, i) => (
            <div
              key={`${v.url}-${i}`}
              className="relative aspect-video rounded-lg overflow-hidden border border-jet/10 group bg-jet/90"
            >
              <video
                src={v.url}
                poster={v.posterUrl ?? undefined}
                muted
                controls
                preload="metadata"
                playsInline
                className="w-full h-full object-cover bg-jet"
              />
              <div className="absolute inset-x-0 bottom-0 bg-jet/80 flex items-center justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-bone text-xs px-1 disabled:opacity-30"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === videos.length - 1}
                  className="text-bone text-xs px-1 disabled:opacity-30"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-bone text-xs px-1 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-1.5 rounded-lg bg-jet text-bone text-xs font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {uploading
          ? progress
            ? `Uploading ${progress.done}/${progress.total}…`
            : 'Uploading…'
          : '+ Add videos'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_MIME_ACCEPT}
        multiple
        onChange={onFiles}
        className="hidden"
      />
      {error && <p className="mt-1 font-body text-xs text-red-600">{error}</p>}
      {hint && !error && (
        <p className="mt-1 font-body text-xs text-jet/40">{hint}</p>
      )}
    </div>
  );
}
