'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  ListsToggle,
  MDXEditor,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

/** Loaded only through `MarkdownEditor` (dynamic, ssr:false) — Lexical needs
 *  a DOM at module scope, and the bundle is large enough that it shouldn't
 *  sit in the initial payload for a surface behind a click. */
export default function MarkdownEditorImpl({
  value,
  onChange,
  minHeight,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  // The toolbar's dropdowns are portalled, and the library gives them
  // `z-index: 3` — which lands under the studio's sheet (`z-100`), so they
  // opened invisibly. Render them inside our own wrapper instead of
  // `document.body`. Using the supported prop rather than overriding the
  // library's hashed class names, which change on every upgrade.
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  useEffect(() => setOverlay(overlayRef.current), []);

  return (
    <div
      className="v1-md-editor"
      style={{ ['--v1-md-min-height' as string]: `${minHeight}px` }}
      aria-label={ariaLabel}
    >
      <div ref={overlayRef} className="v1-md-overlay" />
      <MDXEditor
        overlayContainer={overlay}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        contentEditableClassName="v1-md-content"
        // Never white-screen on markdown we didn't write — but don't
        // swallow it either: a silently-empty editor plus Save would wipe
        // the stored text. Warn, so they can back out with Cancel.
        onError={() =>
          toast.warning('Some formatting could not be loaded', {
            description:
              'Cancel rather than saving if the text below looks wrong.',
          })
        }
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [2, 3] }),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          thematicBreakPlugin(),
          // Lets people who already know markdown keep typing it — "- " for
          // a bullet, "## " for a heading — without exposing the syntax.
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarClassName: 'v1-md-toolbar',
            toolbarContents: () => (
              <>
                <BlockTypeSelect />
                {/* No underline: markdown has no syntax for it, so the
                    button would produce raw HTML in the stored value. */}
                <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                <ListsToggle options={['bullet', 'number']} />
                <CreateLink />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
