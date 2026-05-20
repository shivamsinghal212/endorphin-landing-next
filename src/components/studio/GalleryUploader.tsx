'use client';

import { useCallback, useState } from 'react';
import { ImageUploader, type ImageValue } from './ImageUploader';

export type GalleryUploaderProps = {
  value: ImageValue[];
  onChange: (next: ImageValue[]) => void;
  /** Total slot count rendered. Default 6. */
  max?: number;
  /** Forwarded to each `ImageUploader`. */
  folder?: string;
  bucket?: 'media' | 'avatars';
  maxSizeMB?: number;
  accept?: string[];
  disabled?: boolean;
};

/**
 * Fixed-slot gallery built on top of `ImageUploader`. Drag a filled tile by
 * its handle (`⋮⋮`) to reorder; empty slots stay where they are so the user
 * always sees the same six holes regardless of how many are filled.
 */
export function GalleryUploader({
  value,
  onChange,
  max = 6,
  folder,
  bucket,
  maxSizeMB,
  accept,
  disabled,
}: GalleryUploaderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const setAt = useCallback(
    (index: number, next: ImageValue | null) => {
      const copy = value.slice();
      if (next === null) {
        copy.splice(index, 1);
      } else if (index < copy.length) {
        copy[index] = next;
      } else {
        copy.push(next);
      }
      onChange(copy);
    },
    [onChange, value],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return;
      if (from >= value.length) return;
      const copy = value.slice();
      const [moved] = copy.splice(from, 1);
      // Clamp to within filled bounds — dragging an item beyond the last
      // filled position should park it at the end, not into an empty slot.
      const insertAt = Math.min(to, copy.length);
      copy.splice(insertAt, 0, moved);
      onChange(copy);
    },
    [onChange, value],
  );

  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-6 gap-2"
      role="list"
      aria-label="Gallery images"
    >
      {Array.from({ length: max }).map((_, index) => {
        const item = value[index];
        const isOver = overIndex === index && dragIndex !== null && item != null;
        return (
          <div
            key={index}
            role="listitem"
            onDragOver={(e) => {
              if (dragIndex === null || item == null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverIndex(index);
            }}
            onDragLeave={() => {
              if (overIndex === index) setOverIndex(null);
            }}
            onDrop={(e) => {
              if (dragIndex === null || item == null) return;
              e.preventDefault();
              reorder(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`relative ${isOver ? 'ring-2 ring-jet rounded-xl' : ''}`}
          >
            <ImageUploader
              value={item ?? null}
              onChange={(next) => setAt(index, next)}
              aspectRatio="square"
              folder={folder}
              bucket={bucket}
              maxSizeMB={maxSizeMB}
              accept={accept}
              disabled={disabled}
            />
            {item && !disabled && (
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  // setData is required on Firefox or the drag never fires.
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                title="Drag to reorder"
                aria-label={`Reorder gallery image ${index + 1}`}
                className="absolute top-1 left-1 w-6 h-6 rounded bg-bone/90 text-jet text-[12px] grid place-items-center cursor-grab active:cursor-grabbing hover:bg-bone shadow-sm"
              >
                ⋮⋮
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
