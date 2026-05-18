'use client';

import { createContext, useContext, useEffect } from 'react';
import type { StudioAuth } from './server-auth';

const StudioAuthContext = createContext<StudioAuth | null>(null);

export function StudioAuthProvider({
  value,
  children,
}: {
  value: StudioAuth;
  children: React.ReactNode;
}) {
  // Safety net: clear any body scroll-lock leftover from Radix Dialog
  // (LoginModal sets `body { overflow: hidden }` while open and doesn't
  // always clean up cleanly when navigation interrupts close). Also drops
  // a stale `.nav-open` class from the mobile menu toggle. Without this,
  // /admin/studio mounts with body scroll locked and the page can't scroll
  // past the fold.
  useEffect(() => {
    const clear = () => {
      document.body.classList.remove('nav-open');
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
      // Radix also sets these.
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('pointer-events');
    };
    clear();
    // Re-run shortly after mount in case a Dialog cleanup re-locks after.
    const t = window.setTimeout(clear, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <StudioAuthContext.Provider value={value}>
      {children}
    </StudioAuthContext.Provider>
  );
}

/** Hook to read the resolved studio auth. Returns null when used outside
 *  the provider (e.g. on super-admin pages); callers should fall back. */
export function useStudioAuth(): StudioAuth | null {
  return useContext(StudioAuthContext);
}
