'use client';

import dynamic from 'next/dynamic';

/** Rich-text editor that stores markdown.
 *
 *  `@mdxeditor/editor` renders formatted text — bold looks bold — rather
 *  than showing raw `**syntax**`, while still writing plain markdown to
 *  `description_md` / `refund_policy_md` / `terms_md`, which the public page
 *  renders with `react-markdown`.
 *
 *  The toolbar is deliberately four controls. An organiser writing "three
 *  pace groups, coffee after" has no use for code blocks, tables,
 *  thematic breaks or a syntax help dialog.
 */
const Editor = dynamic(() => import('./MarkdownEditorImpl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[180px] rounded-xl border border-jet/10 bg-jet/[0.02] animate-pulse" />
  ),
});

export function MarkdownEditor({
  value,
  onChange,
  minHeight = 220,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <Editor
      value={value}
      onChange={onChange}
      minHeight={minHeight}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
    />
  );
}
