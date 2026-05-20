'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { validateImage } from '@/lib/studio/event-validators';

export type ImageValue = {
  url: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  filename?: string;
};

export type ImageUploaderProps = {
  value?: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  /** Visual aspect ratio of the drop target. Square keeps logos honest; 16/9 for heroes. */
  aspectRatio?: 'square' | '16/9' | '1/1';
  /** Default 5 MB. The upload route caps at 4 MB; we err on the smaller side. */
  maxSizeMB?: number;
  /** MIME types passed to the file picker + validated client-side. */
  accept?: string[];
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * Server-side bucket folder, e.g. `studio/events`. Must match the
   * `/api/admin/upload` `^[a-z0-9][a-z0-9/_-]*$` regex. Defaults to
   * `studio/uploads`.
   */
  folder?: string;
  /** Upload route bucket — 'media' (default) or 'avatars'. */
  bucket?: 'media' | 'avatars';
  /** Optional accessible id for the hidden `<input type="file">`. */
  inputId?: string;
};

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string; progress: number; sizeBytes: number }
  // `retryable=false` means the same file will fail again (validation error
  // — wrong type, too large). The action button switches to "Pick another"
  // and clears `lastFile` so retry can't re-enter the failing path.
  | { kind: 'error'; message: string; retryable: boolean; lastFile?: File };

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

function aspectClass(ratio: ImageUploaderProps['aspectRatio']): string {
  switch (ratio) {
    case '16/9':
      return 'aspect-[16/9]';
    case 'square':
    case '1/1':
    default:
      return 'aspect-square';
  }
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFile(
  file: File,
  folder: string,
  bucket: 'media' | 'avatars',
  onProgress: (pct: number) => void,
): Promise<ImageValue> {
  // We use XMLHttpRequest rather than fetch() so we can wire upload-progress
  // events for the progress bar. fetch() has no stable upload-progress API
  // in browsers as of 2026.
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  fd.append('bucket', bucket);

  const dimsPromise = readImageDimensions(file).catch(() => null);

  const url = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.addEventListener('load', () => {
      let parsed: { ok?: boolean; url?: string; error?: string } | null = null;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to error path */
      }
      if (xhr.status >= 200 && xhr.status < 300 && parsed?.ok && parsed.url) {
        resolve(parsed.url);
      } else {
        reject(
          new Error(parsed?.error || `Upload failed (${xhr.status})`),
        );
      }
    });
    xhr.send(fd);
  });

  const dims = await dimsPromise;
  return {
    url,
    filename: file.name,
    sizeBytes: file.size,
    width: dims?.width,
    height: dims?.height,
  };
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

export function ImageUploader({
  value,
  onChange,
  aspectRatio = 'square',
  maxSizeMB = 5,
  accept = DEFAULT_ACCEPT,
  label,
  required,
  disabled,
  folder = 'studio/uploads',
  bucket = 'media',
  inputId,
}: ImageUploaderProps) {
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const fieldId = inputId ?? `studio-image-${reactId}`;

  const beginUpload = useCallback(
    async (file: File) => {
      const validation = validateImage(file, { maxMB: maxSizeMB, accept });
      if (!validation.ok) {
        // Pre-upload validation errors are NOT retryable — the same file
        // will always fail. Don't stash lastFile; force a re-pick.
        setState({ kind: 'error', message: validation.error, retryable: false });
        return;
      }
      setState({
        kind: 'uploading',
        filename: file.name,
        progress: 0,
        sizeBytes: file.size,
      });
      try {
        const result = await uploadFile(file, folder, bucket, (pct) =>
          setState((prev) =>
            prev.kind === 'uploading' ? { ...prev, progress: pct } : prev,
          ),
        );
        setState({ kind: 'idle' });
        onChange(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        // Network / server errors — same file is worth retrying.
        setState({ kind: 'error', message, retryable: true, lastFile: file });
        toast.error(`Upload failed: ${message}`);
      }
    },
    [accept, bucket, folder, maxSizeMB, onChange],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Clear the input so picking the same file twice still fires `change`.
      e.target.value = '';
      if (file) void beginUpload(file);
    },
    [beginUpload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void beginUpload(file);
    },
    [beginUpload, disabled],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const retry = useCallback(() => {
    // Only retry the same file when the failure was transient. Validation
    // errors (wrong type / too large) clear lastFile so this branch is
    // skipped and we route to the picker instead.
    if (state.kind === 'error' && state.retryable && state.lastFile) {
      void beginUpload(state.lastFile);
    } else {
      openPicker();
    }
  }, [beginUpload, openPicker, state]);

  const dismissError = useCallback(() => {
    setState({ kind: 'idle' });
  }, []);

  const remove = useCallback(() => {
    onChange(null);
    setState({ kind: 'idle' });
  }, [onChange]);

  const aspect = aspectClass(aspectRatio);
  const acceptAttr = accept.join(',');

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-baseline gap-2 mb-1">
          <label
            htmlFor={fieldId}
            className="text-[11px] uppercase tracking-wider text-jet/50"
          >
            {label}
            {required && <span className="text-signal ml-0.5">*</span>}
          </label>
        </div>
      )}

      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept={acceptAttr}
        onChange={onPick}
        disabled={disabled}
        className="sr-only"
      />

      {state.kind === 'uploading' ? (
        <div
          className={`${aspect} rounded-xl border border-jet/15 bg-bone relative overflow-hidden`}
        >
          <div className="absolute inset-0 grid place-items-center px-3">
            <div className="text-center">
              <div className="text-xs text-jet/70 font-medium">Uploading…</div>
              <div className="text-[10px] text-jet/40 truncate max-w-[180px]">
                {state.filename} · {formatBytes(state.sizeBytes)}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-jet/[0.08]">
            <div
              className="h-full bg-jet transition-[width] duration-150"
              style={{ width: `${state.progress}%` }}
              aria-hidden
            />
          </div>
        </div>
      ) : state.kind === 'error' ? (
        <div
          className={`${aspect} rounded-xl border border-signal bg-signal/5 relative overflow-hidden grid place-items-center text-center p-3`}
          role="alert"
        >
          <div className="flex flex-col items-center gap-1.5 max-w-full">
            <div className="text-signal text-base leading-none" aria-hidden>!</div>
            <p className="text-[11px] text-signal font-medium leading-tight break-words">
              {state.message}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-1 px-3 py-1.5 rounded-md bg-jet text-bone text-[11px] font-medium hover:bg-jet/90"
            >
              {state.retryable ? 'Retry' : 'Pick another file'}
            </button>
            <button
              type="button"
              onClick={dismissError}
              className="text-[10px] text-jet/50 hover:text-jet underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <div
          className={`${aspect} rounded-xl border border-jet/10 bg-bone relative overflow-hidden group`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {(value.filename || value.sizeBytes || (value.width && value.height)) && (
            <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-bone/90 px-2 py-0.5 rounded">
              {[
                value.filename,
                value.width && value.height
                  ? `${value.width}×${value.height}`
                  : null,
                formatBytes(value.sizeBytes) || null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          <div className="absolute inset-0 bg-jet/0 group-hover:bg-jet/60 focus-within:bg-jet/60 transition flex items-end justify-end gap-1.5 p-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              className="text-[11px] px-2.5 py-1 rounded bg-bone text-jet font-medium hover:bg-white disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={disabled}
              className="text-[11px] px-2.5 py-1 rounded bg-signal text-bone font-medium hover:bg-signal/90 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          className={`${aspect} rounded-xl border border-dashed grid place-items-center text-center text-xs cursor-pointer transition-colors ${
            disabled
              ? 'border-jet/10 text-jet/30 cursor-not-allowed'
              : isDragOver
                ? 'border-jet text-jet bg-jet/[0.03]'
                : 'border-jet/20 text-jet/45 hover:border-jet hover:text-jet'
          }`}
        >
          <div>
            <div className="text-2xl leading-none">＋</div>
            <p className="mt-1">Drop or click</p>
            <p className="text-[10px] text-jet/40 mt-1">
              {accept
                .map((m) => m.replace('image/', '').toUpperCase())
                .join(' / ')}{' '}
              · max {maxSizeMB} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
