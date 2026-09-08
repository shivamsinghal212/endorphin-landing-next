'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import LoginModal from '@/components/LoginModal';
import { logoutAction } from '@/app/actions/auth';
import { useStoreLink } from '@/lib/use-store-link';

// Top-level links rendered as-is. "Clubs" is special — it's a hover/tap
// dropdown (see CLUBS_SUBLINKS) rather than a direct link.
const NAV_LINKS = [
  // One entry: /experiences merged into /running-events, which now lists
  // races, club events and clubs together.
  { label: 'Running Events', href: '/running-events', soon: false, primary: true },
];

// The "Clubs" dropdown. Both club surfaces live here now.
const CLUBS_SUBLINKS = [
  { label: 'Find your run club', href: '/clubs' },
  { label: 'For club owners', href: '/for-clubs' },
];

// The signed-in account dropdown. Only real destinations — "my events"
// lives inside Studio rather than getting a route of its own.
const ACCOUNT_LINKS = [
  { label: 'My registrations', href: '/me/registrations' },
  { label: 'Studio', href: '/admin/studio' },
];

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ChevronIcon = () => (
  <svg
    className="v1-nav-sub-chevron"
    viewBox="0 0 12 12"
    width="10"
    height="10"
    fill="none"
    aria-hidden="true"
  >
    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoMark = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-7 h-7">
    <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.48 6.48 0 00-4.707 2.017.75.75 0 11-1.086-1.034A7.98 7.98 0 018 0a7.98 7.98 0 015.793 2.483.75.75 0 11-1.086 1.034A6.48 6.48 0 008 1.5zM1.236 5.279a.75.75 0 01.514.927 6.503 6.503 0 004.727 8.115.75.75 0 11-.349 1.459 8.003 8.003 0 01-5.82-9.986.75.75 0 01.928-.515zm13.528 0a.75.75 0 01.928.515 8.003 8.003 0 01-5.82 9.986.75.75 0 01-.35-1.459 6.503 6.503 0 004.728-8.115.75.75 0 01.514-.927z" />
      <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 8a5 5 0 1110 0A5 5 0 013 8z" opacity=".25" />
    </g>
  </svg>
);

const HeaderClient = ({
  isAuthed,
  userName = null,
}: {
  isAuthed: boolean;
  userName?: string | null;
}) => {
  const navRef = useRef<HTMLElement | null>(null);
  const subRef = useRef<HTMLLIElement | null>(null);
  const acctRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  // Controls the "Clubs" dropdown. Desktop also opens it on hover via CSS;
  // this state drives tap-to-open on touch and click-to-pin on desktop.
  const [subOpen, setSubOpen] = useState(false);
  // Same pattern for the signed-in account dropdown.
  const [acctOpen, setAcctOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingOut, startTransition] = useTransition();
  // Tracks the post-login server refresh so the modal can show a loader
  // until the new render (with auth state) actually commits.
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  const postLoginRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open the login modal when arriving with ?login=1 (e.g. redirected
  // from /admin/studio without a session). One-shot — strip the param so
  // refreshes don't keep re-opening it.
  useEffect(() => {
    if (!isAuthed && searchParams?.get('login') === '1') {
      setLoginOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState(null, '', url.pathname + (url.search || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // On mobile, send the visitor straight to App Store / Play Store. On
  // desktop, fall back to /#download (the homepage section with both buttons).
  const downloadHref = useStoreLink('/#download');

  // Measure real nav height → --nav-h so body padding matches
  useEffect(() => {
    const setH = () => {
      const h = navRef.current?.offsetHeight ?? 68;
      document.documentElement.style.setProperty('--nav-h', `${h}px`);
    };
    setH();
    window.addEventListener('resize', setH);
    return () => window.removeEventListener('resize', setH);
  }, []);

  // Body scroll lock + Escape close (closes both the mobile menu and the
  // Clubs dropdown).
  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSubOpen(false); setAcctOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Click-outside closes whichever dropdown is click-pinned on desktop.
  useEffect(() => {
    const pinned: [boolean, React.RefObject<HTMLElement | null>, (v: boolean) => void][] = [
      [subOpen, subRef, setSubOpen],
      [acctOpen, acctRef, setAcctOpen],
    ];
    const active = pinned.filter(([isOpen]) => isOpen);
    if (active.length === 0) return;
    const onDown = (e: PointerEvent) => {
      for (const [, ref, close] of active) {
        if (ref.current && !ref.current.contains(e.target as Node)) close(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [subOpen, acctOpen]);

  const closeMenu = () => { setOpen(false); setSubOpen(false); setAcctOpen(false); };

  const clubsActive = ['/clubs', '/for-clubs', '/run-clubs'].some((h) => isLinkActive(pathname, h));

  const handleSignIn = () => {
    setOpen(false);
    setLoginOpen(true);
  };

  const handleLoginSuccess = () => {
    postLoginRef.current = true;
    const next = searchParams?.get('next');
    startLoginRefresh(() => {
      if (next && next.startsWith('/')) {
        router.push(next);
      } else {
        router.refresh();
      }
    });
  };

  // Close the modal once the server re-render commits (transition flips
  // back to idle). The post-login ref guards against closing the modal on
  // unrelated transitions.
  useEffect(() => {
    if (!isFinalizingLogin && postLoginRef.current) {
      postLoginRef.current = false;
      setLoginOpen(false);
    }
  }, [isFinalizingLogin]);

  const handleLogout = () => {
    setOpen(false);
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  const authButton = isAuthed ? (
    <button type="button" className="v1-nav-auth" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? 'Signing out…' : 'Sign out'}
    </button>
  ) : (
    <button type="button" className="v1-nav-auth" onClick={handleSignIn}>
      Sign in
    </button>
  );

  return (
    <nav ref={navRef} className={`v1-nav ${open ? 'is-open' : ''}`} id="site-nav">
      <div className="container v1-nav-inner">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-2.5 group font-logo font-semibold text-[22px] tracking-tight text-bone"
        >
          <span className="text-signal transition-transform duration-300 group-hover:rotate-[120deg] inline-flex">
            <LogoMark />
          </span>
          endorfin
        </Link>

        <ul className="v1-nav-links">
          {NAV_LINKS.map((l) => {
            const active = isLinkActive(pathname, l.href);
            const cls = [
              l.soon ? 'has-soon' : '',
              active ? 'is-current' : '',
              l.primary ? 'is-primary' : '',
            ].filter(Boolean).join(' ') || undefined;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cls}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}

          {/* Clubs — hover dropdown on desktop, tap-to-expand on mobile. */}
          <li ref={subRef} className={`v1-nav-sub-wrap ${subOpen ? 'is-sub-open' : ''}`}>
            <button
              type="button"
              className={`v1-nav-sub-trigger is-primary ${clubsActive ? 'is-current' : ''}`}
              aria-haspopup="true"
              aria-expanded={subOpen}
              aria-current={clubsActive ? 'page' : undefined}
              onClick={() => setSubOpen((v) => !v)}
            >
              Clubs
              <ChevronIcon />
            </button>
            <ul className="v1-nav-sub" role="menu">
              {CLUBS_SUBLINKS.map((s) => (
                <li key={s.href} role="none">
                  <Link href={s.href} role="menuitem" onClick={closeMenu}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          {/* One primary action. `/create` works signed out — the sign-in
              gate is at the moment they commit the event, not here.
              Hidden on mobile (v1-nav-cta-drawer): the bar now carries this
              CTA permanently, and showing both puts two identical buttons on
              screen at once whenever the drawer is open. */}
          <li className="v1-nav-cta-drawer">
            <Link href="/create" className="v1-nav-cta" onClick={closeMenu}>
              Create event
            </Link>
          </li>
          <li>
            <a href={downloadHref} className="v1-nav-cta-secondary" onClick={closeMenu}>
              Get the app
            </a>
          </li>

          {/* Account, flattened into the drawer — a nested dropdown inside a
              slide-out menu is worse than a labelled group. */}
          {isAuthed && (
            <>
              <li className="v1-nav-group-label" aria-hidden="true">
                Account
              </li>
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href} className="v1-nav-drawer-only">
                  <Link href={l.href} onClick={closeMenu}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </>
          )}
          <li className="v1-nav-auth-mobile-li">{authButton}</li>
        </ul>

        {/* Actions, weakest to strongest: text link → identity → primary.
            Only one filled CTA, so "create" is unambiguously the ask. */}
        <div className="v1-nav-actions-desktop">
          <a href={downloadHref} className="v1-nav-quiet">
            Get the app
          </a>

          {!isAuthed && authButton}

          <Link href="/create" className="v1-nav-cta">
            Create event
          </Link>

          {isAuthed && (
            <div
              ref={acctRef}
              className={`v1-nav-sub-wrap v1-nav-acct ${acctOpen ? 'is-sub-open' : ''}`}
            >
              <button
                type="button"
                className="v1-nav-acct-trigger"
                aria-haspopup="true"
                aria-expanded={acctOpen}
                aria-label="Account menu"
                onClick={() => setAcctOpen((v) => !v)}
              >
                <span className="v1-nav-toggle-bars" aria-hidden="true" />
              </button>
              <ul className="v1-nav-sub v1-nav-sub-end" role="menu">
                {/* The icon says nothing about who you are, so the menu
                    opens by naming the account it belongs to. Two lines: the
                    caption is the label, the name is the content — one line
                    in label styling read as a section heading, not an
                    identity. */}
                <li className="v1-nav-sub-user" role="presentation">
                  <span className="v1-nav-sub-user-label">Signed in as</span>
                  <span className="v1-nav-sub-user-name">
                    {userName?.trim() || 'your account'}
                  </span>
                </li>
                {ACCOUNT_LINKS.map((l) => (
                  <li key={l.href} role="none">
                    <Link href={l.href} role="menuitem" onClick={closeMenu}>
                      {l.label}
                    </Link>
                  </li>
                ))}
                {/* Separated: signing out shouldn't sit a slip away from
                    ordinary navigation. */}
                <li className="v1-nav-sub-divider" role="separator" />
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="v1-nav-sub-danger"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Mobile only. Creating an event is the one thing we want a phone
            visitor to be able to start without opening a menu first, so the
            primary CTA rides in the bar rather than inside the drawer. */}
        <Link href="/create" className="v1-nav-cta v1-nav-cta-bar" onClick={closeMenu}>
          {/* The anchor keeps the 44px touch target; the span carries the
              red so the block can be visually smaller than its hit area. */}
          <span>Create event</span>
        </Link>

        <button
          type="button"
          className="v1-nav-toggle"
          aria-controls="site-nav"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="v1-nav-toggle-bars" aria-hidden="true" />
        </button>
      </div>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
        finalizing={isFinalizingLogin}
      />
    </nav>
  );
};

export default HeaderClient;
