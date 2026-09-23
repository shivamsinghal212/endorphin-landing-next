'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { TALK_NAME } from '@/lib/talk';

const EMAIL = 'hello@endorfin.run';
const SUBJECT = `${TALK_NAME} contribution`;
const BODY =
  "Hi Endorfin,\n\nI would like to contribute to Runners' Talk.\n\nAbout me (role, credentials, where I work or run):\n\nMy piece (paste it or attach it):\n";

// mailto: does nothing when no mail app is set up (common on desktop Chrome),
// so the primary action opens Gmail's web composer; the mailto stays as a fallback.
const GMAIL = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

/** "Want to contribute?" card, on the hub and at the end of every piece. */
export default function TalkContribute() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    posthog.capture('talk_contribute_clicked', { channel: 'copy' });
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this address', EMAIL);
    }
  };

  return (
    <aside className="rt-contribute" id="contribute" aria-labelledby="rt-contribute-h">
      <div>
        <span className="rt-eyebrow">Write for {TALK_NAME}</span>
        <h2 id="rt-contribute-h">Want to contribute?</h2>
        <p>
          Physio, coach, or a runner who figured something out the hard way? Send us your article and a line about
          yourself. We&apos;ll publish it under your name.
        </p>
      </div>
      <div className="rt-contribute-cta">
        <div className="row">
          <a
            className="rt-btn is-solid"
            href={GMAIL}
            target="_blank"
            rel="noopener"
            onClick={() => posthog.capture('talk_contribute_clicked', { channel: 'gmail' })}
          >
            Send your article
          </a>
          <button type="button" className="rt-btn" onClick={copy} aria-live="polite">
            {copied ? 'Copied ✓' : 'Copy email'}
          </button>
        </div>
        <span className="rt-contribute-mail">
          {EMAIL} · <a href={MAILTO} onClick={() => posthog.capture('talk_contribute_clicked', { channel: 'mailto' })}>use your email app</a>
        </span>
      </div>
    </aside>
  );
}
