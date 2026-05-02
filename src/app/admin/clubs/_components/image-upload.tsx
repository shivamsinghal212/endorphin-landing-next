'use client';

import { useRef, useState } from 'react';

const MIME_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif';
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;
// Stay comfortably under Vercel's serverless body limit (~4.5 MB) plus
// multipart overhead.
const SKIP_COMPRESS_BELOW_BYTES = 700_000;

// Resize + recompress to JPEG so server upload stays well under platform
// body limits. Skips small files. GIFs are passed through (animation).
async function compressIfNeeded(file: File): Promise<File> {
  if (file.size < SKIP_COMPRESS_BELOW_BYTES) return file;
  if (file.type === 'image/gif') return file;
  if (typeof window === 'undefined') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob || blob.size > file.size) return file;
    const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const prepared = await compressIfNeeded(file);
  const fd = new FormData();
  fd.append('file', prepared);
  fd.append('folder', folder);
  fd.append('bucket', 'media');
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });

  // Robust parse — server may return non-JSON (413 from edge, HTML error page).
  let data: { ok?: boolean; url?: string; error?: string } = {};
  let raw = '';
  try {
    raw = await res.text();
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!res.ok || !data.ok || !data.url) {
    if (res.status === 413 || /too large/i.test(raw)) {
      throw new Error(
        'File too large for upload (server limit ~4 MB). Try a smaller image — large PNGs work better as JPEG.',
      );
    }
    throw new Error(
      data.error || (raw && raw.length < 200 ? raw : `upload failed (${res.status})`),
    );
  }
  return data.url;
}

// ─── Wide / square: preview is the click target. No duplicate buttons. ──

export function ImageUploadField({
  label,
  value,
  onChange,
  shape,
  folder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  shape: 'square' | 'wide';
  folder: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const trimmed = value.trim();

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadFile(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  const previewCls =
    shape === 'wide'
      ? 'w-full max-w-[420px] h-44 bg-jet/5 rounded-lg overflow-hidden border border-jet/10 relative cursor-pointer hover:border-jet/25 transition-colors'
      : 'w-24 h-24 bg-jet/5 rounded-full overflow-hidden border border-jet/10 relative flex-shrink-0 cursor-pointer hover:border-jet/25 transition-colors';

  const previewLabel = uploading ? 'Uploading…' : trimmed ? 'Click to replace' : 'Click to upload';

  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1.5">{label}</label>
      <div className={shape === 'wide' ? 'flex flex-col gap-2' : 'flex items-start gap-3'}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={previewCls}
          aria-label={`Upload ${label}`}
        >
          {trimmed ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trimmed} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-jet/0 hover:bg-jet/40 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-bone text-xs font-body font-medium bg-jet/70 px-2 py-1 rounded">
                  {previewLabel}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-jet/40 text-xs gap-1">
              <span>{previewLabel}</span>
              {!uploading && <span className="text-jet/25">JPG · PNG · WebP</span>}
            </div>
          )}
          {uploading && trimmed && (
            <div className="absolute inset-0 bg-bone/70 flex items-center justify-center text-jet text-xs font-body">
              Uploading…
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={MIME_ACCEPT}
          onChange={onFileChange}
          className="hidden"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            {trimmed && (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={uploading}
                className="font-body text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="font-body text-xs text-jet/50 hover:text-jet hover:underline"
            >
              {showUrlInput ? 'Hide URL' : 'Or paste URL'}
            </button>
          </div>
          {showUrlInput && (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/image.jpg"
              className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
          )}
          {error && <p className="font-body text-xs text-red-600">{error}</p>}
          {hint && !error && <p className="font-body text-xs text-jet/40">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Compact circular avatar uploader for admin/founder rows ──

export function AvatarUpload({
  url,
  onChange,
  folder,
  size = 48,
}: {
  url: string;
  onChange: (url: string) => void;
  folder: string;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = url.trim();

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadFile(file, folder));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ width: size, height: size }}
        className="rounded-full overflow-hidden bg-jet/5 border border-jet/10 hover:border-jet/25 transition-colors cursor-pointer relative group"
        aria-label="Upload avatar"
      >
        {trimmed ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={trimmed} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-jet/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-bone text-[9px] font-body font-medium leading-tight text-center px-1">
              Replace
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-jet/30 text-[9px] font-body leading-tight text-center">
            {uploading ? 'Up…' : 'Upload'}
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={MIME_ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      {trimmed && !uploading && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="font-body text-[10px] text-red-600 hover:underline leading-none"
        >
          Remove
        </button>
      )}
      {error && <span className="font-body text-[10px] text-red-600">!</span>}
    </div>
  );
}

// ─── Multi-image gallery for recap photos ──

export function ImageGalleryField({
  label,
  urls,
  onChange,
  folder,
  hint,
}: {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setError(null);
    setUploading(true);
    try {
      const next = [...urls];
      for (const f of files) {
        next.push(await uploadFile(f, folder));
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-2">{label}</label>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {urls.map((u, i) => (
            <div
              key={`${u}-${i}`}
              className="relative aspect-square rounded-lg overflow-hidden border border-jet/10 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-jet/70 flex items-center justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  disabled={i === urls.length - 1}
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
        {uploading ? 'Uploading…' : '+ Add photos'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={MIME_ACCEPT}
        multiple
        onChange={onFiles}
        className="hidden"
      />
      {error && <p className="mt-1 font-body text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 font-body text-xs text-jet/40">{hint}</p>}
    </div>
  );
}
