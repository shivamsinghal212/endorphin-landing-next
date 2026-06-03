'use client';

import { useState } from 'react';
import posthog from 'posthog-js';

// Homepage variant of the /clubs OnboardClubBanner form — same capture flow
// (Instagram handle → onboard-requests queue), restyled for the dark kip
// section. Keep the cleanHandle/POST behavior in sync with ClubsView.
export default function KipOnboardForm() {
  const [handle, setHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const cleanHandle = (raw: string) =>
    raw
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@/, '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanHandle(handle);
    if (!cleaned) return;
    posthog.capture('club_onboard_request', {
      instagram_handle: cleaned,
      source: 'home_kip',
    });
    // POST to the backend queue. We don't gate on success — if the API write
    // fails the PostHog event still reaches us out-of-band.
    try {
      await fetch('https://api.endorfin.run/api/v1/clubs/onboard-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramHandle: cleaned }),
      });
    } catch {
      // Swallow — the PostHog event is the fallback path.
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="v1-kip-onboard-thanks" role="status" aria-live="polite">
        <strong>Thanks — we&rsquo;ll be in touch.</strong>
        <span>
          We&rsquo;ve logged your request. If anything urgent, reach us at{' '}
          <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
        </span>
      </div>
    );
  }

  return (
    <form className="v1-kip-onboard-form" onSubmit={onSubmit}>
      <div className="v1-kip-onboard-input-wrap">
        <span className="v1-kip-onboard-input-prefix" aria-hidden>@</span>
        <input
          type="text"
          className="v1-kip-onboard-input"
          placeholder="your_club_handle"
          aria-label="Your club's Instagram handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </div>
      {/* Not disabled-while-empty: the input is required and onSubmit guards,
          and the 50%-opacity disabled look read as broken on the dark bg. */}
      <button type="submit" className="v1-btn v1-btn-primary v1-kip-onboard-submit">
        Get my club listed
      </button>
    </form>
  );
}
