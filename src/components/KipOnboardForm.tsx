'use client';

import LoginModal from '@/components/LoginModal';
import { useClubOnboard } from '@/lib/use-club-onboard';

// Homepage variant of the /clubs OnboardClubBanner form — same capture flow
// (Instagram handle → onboard-requests queue), restyled for the dark kip
// section. The flow itself lives in useClubOnboard.
export default function KipOnboardForm() {
  const f = useClubOnboard('home_kip');

  if (f.submitted) {
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
    <>
      <form className="v1-kip-onboard-form" onSubmit={f.onSubmit}>
        <div className="v1-kip-onboard-input-wrap">
          <span className="v1-kip-onboard-input-prefix" aria-hidden>@</span>
          <input
            type="text"
            className="v1-kip-onboard-input"
            placeholder="your_club_handle"
            aria-label="Your club's Instagram handle"
            value={f.handle}
            onChange={(e) => f.setHandle(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        {/* Not disabled-while-empty: the input is required and onSubmit guards,
            and the 50%-opacity disabled look read as broken on the dark bg. */}
        <button
          type="submit"
          className="v1-btn v1-btn-primary v1-kip-onboard-submit"
          disabled={f.submitting}
        >
          {f.submitting ? 'Sending…' : 'Get my club listed'}
        </button>
      </form>
      {f.error ? (
        <p className="v1-kip-onboard-error" role="alert">{f.error}</p>
      ) : null}
      <LoginModal
        open={f.loginOpen}
        onClose={f.closeLogin}
        onSuccess={f.onLoginSuccess}
        title="Sign in to list your club."
        subtitle={`So we know who to get back to about @${f.cleaned}.`}
      />
    </>
  );
}
