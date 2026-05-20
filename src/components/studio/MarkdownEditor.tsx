'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type MarkdownEditorProps = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  /** When provided, a small "Insert default" button appears next to the label. */
  defaultTemplate?: string;
  /** Optional id for the underlying textarea (label `htmlFor`). */
  id?: string;
  disabled?: boolean;
};

/**
 * Markdown editor with a formatting toolbar + split-pane live preview.
 *
 * Output is markdown — the toolbar buttons insert markdown syntax at the
 * cursor (or wrap the current selection) rather than serialising HTML. This
 * keeps the backend `*_md` columns simple and gives users a "rich text" feel
 * without pulling in a heavyweight WYSIWYG dependency.
 *
 * Rendered preview uses `react-markdown` (no raw HTML emission), so we don't
 * need DOMPurify.
 */
export function MarkdownEditor({
  value,
  onChange,
  maxLength,
  placeholder,
  label,
  required,
  rows = 10,
  defaultTemplate,
  id,
  disabled,
}: MarkdownEditorProps) {
  const reactId = useId();
  const fieldId = id ?? `studio-md-${reactId}`;
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const setValue = (next: string) => {
    onChange(maxLength != null && next.length > maxLength ? next.slice(0, maxLength) : next);
  };

  /** Wrap the current selection in `prefix…suffix` (or insert `placeholderText` if empty). */
  const wrap = (prefix: string, suffix = prefix, placeholderText = '') => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${prefix}${selected}${suffix}${after}`;
    setValue(next);
    // Restore selection over the inserted content (after React applies the value).
    requestAnimationFrame(() => {
      const ta2 = taRef.current;
      if (!ta2) return;
      const s = start + prefix.length;
      const e = s + selected.length;
      ta2.focus();
      ta2.setSelectionRange(s, e);
    });
  };

  /** Prepend `prefix` to every selected line (or the current line if no selection). */
  const prependLines = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    // Expand selection bounds to whole-line boundaries.
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = value.indexOf('\n', end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const transformed = block
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
      .join('\n');
    const next = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
    setValue(next);
    requestAnimationFrame(() => {
      const ta2 = taRef.current;
      if (!ta2) return;
      ta2.focus();
      ta2.setSelectionRange(lineStart, lineStart + transformed.length);
    });
  };

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      const ta2 = taRef.current;
      if (!ta2) return;
      const caret = start + text.length;
      ta2.focus();
      ta2.setSelectionRange(caret, caret);
    });
  };

  const insertLink = () => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const url = window.prompt('Link URL', 'https://') ?? '';
    if (!url || url === 'https://') return;
    const text = selected || 'link text';
    const inserted = `[${text}](${url})`;
    const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      const ta2 = taRef.current;
      if (!ta2) return;
      const s = start + 1;
      const e = s + text.length;
      ta2.focus();
      ta2.setSelectionRange(s, e);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      wrap('**', '**', 'bold text');
    } else if (key === 'i') {
      e.preventDefault();
      wrap('_', '_', 'italic text');
    } else if (key === 'e') {
      e.preventDefault();
      wrap('`', '`', 'code');
    } else if (key === 'k') {
      e.preventDefault();
      insertLink();
    }
  };

  const insertDefault = () => {
    if (!defaultTemplate) return;
    const next = value.trim() ? `${value.trimEnd()}\n\n${defaultTemplate}` : defaultTemplate;
    setValue(next);
  };

  const charCount = value.length;
  const overLimit = maxLength != null && charCount > maxLength;

  const tbBtn =
    'h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-md text-xs font-medium text-jet/70 hover:bg-jet/[0.06] hover:text-jet disabled:opacity-40 disabled:cursor-not-allowed transition';
  const tbSep = 'w-px h-5 bg-jet/10 mx-0.5';

  return (
    <div className="w-full">
      {(label || defaultTemplate) && (
        <div className="flex items-baseline justify-between gap-2 mb-2">
          {label ? (
            <label
              htmlFor={fieldId}
              className="text-[11px] uppercase tracking-wider text-jet/50"
            >
              {label}
              {required && <span className="text-signal ml-0.5">*</span>}
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {defaultTemplate && !disabled && (
              <button
                type="button"
                onClick={insertDefault}
                className="text-[11px] text-jet/50 hover:text-jet underline"
              >
                Insert default
              </button>
            )}
            {maxLength != null && (
              <span
                className={`text-[10px] tabular-nums ${
                  overLimit ? 'text-signal' : 'text-jet/40'
                }`}
              >
                {charCount} / {maxLength}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar — sticks above the textarea on every screen size. */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex items-center flex-wrap gap-0.5 px-1.5 py-1 mb-1.5 rounded-lg border border-jet/10 bg-bone/60"
      >
        <button type="button" className={tbBtn} disabled={disabled} title="Bold (⌘B)" onClick={() => wrap('**', '**', 'bold text')}>
          <strong>B</strong>
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Italic (⌘I)" onClick={() => wrap('_', '_', 'italic text')}>
          <em>I</em>
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Inline code (⌘E)" onClick={() => wrap('`', '`', 'code')}>
          <code className="text-[11px]">&lt;/&gt;</code>
        </button>
        <span className={tbSep} aria-hidden />
        <button type="button" className={tbBtn} disabled={disabled} title="Heading" onClick={() => prependLines('## ')}>
          H
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Subheading" onClick={() => prependLines('### ')}>
          <span className="text-[10px]">h</span>
        </button>
        <span className={tbSep} aria-hidden />
        <button type="button" className={tbBtn} disabled={disabled} title="Bulleted list" onClick={() => prependLines('- ')}>
          •
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Numbered list" onClick={() => prependLines('1. ')}>
          1.
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Blockquote" onClick={() => prependLines('> ')}>
          “
        </button>
        <span className={tbSep} aria-hidden />
        <button type="button" className={tbBtn} disabled={disabled} title="Link (⌘K)" onClick={insertLink}>
          🔗
        </button>
        <button type="button" className={tbBtn} disabled={disabled} title="Divider" onClick={() => insertAtCursor('\n\n---\n\n')}>
          ─
        </button>
        <span className="ml-auto pl-2 text-[10px] text-jet/40 hidden sm:inline">Markdown</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <textarea
          ref={taRef}
          id={fieldId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono bg-white outline-none focus:border-jet ${
            overLimit ? 'border-signal' : 'border-jet/10'
          } disabled:bg-jet/[0.03] disabled:text-jet/50`}
        />

        <div
          className="px-4 py-3 rounded-xl bg-bone border border-jet/5 overflow-y-auto prose prose-sm max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight prose-p:my-2 prose-li:my-0.5 prose-code:before:hidden prose-code:after:hidden"
          aria-live="polite"
          aria-label="Markdown preview"
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs text-jet/40 italic m-0">
              Preview appears here as you type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
