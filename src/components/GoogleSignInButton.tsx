'use client';

import { useEffect, useRef, useState } from 'react';

interface CredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (resp: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, unknown>,
  ) => void;
  prompt: () => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
    __endorfinGsiLoaded?: Promise<void>;
  }
}

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (window.__endorfinGsiLoaded) return window.__endorfinGsiLoaded;

  window.__endorfinGsiLoaded = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GSI script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GSI script failed to load'));
    document.head.appendChild(script);
  });

  return window.__endorfinGsiLoaded;
}

interface GoogleSignInButtonProps {
  /** Called with Google's id_token when the user completes sign-in. */
  onCredential: (idToken: string) => void;
  /** Optional width in pixels for the rendered button. Default: matches parent. */
  width?: number;
  context?: 'signin' | 'signup' | 'use';
}

/**
 * Renders Google's official Sign-In button. Falls back to nothing if
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured.
 */
export default function GoogleSignInButton({
  onCredential,
  width,
  context = 'signin',
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Keep latest callback in a ref so we don't re-init the GSI button on every render.
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => callbackRef.current(resp.credential),
          cancel_on_tap_outside: false,
          context,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: context === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: width ?? containerRef.current.clientWidth,
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, context, width]);

  if (!clientId) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="v1lm-google-missing">
          Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
        </div>
      );
    }
    return null;
  }

  return (
    <div className="v1lm-google-wrap">
      <div ref={containerRef} />
      {error && <div className="v1lm-google-error">Google sign-in unavailable: {error}</div>}
    </div>
  );
}
