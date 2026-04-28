'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import LoginModal from '@/components/LoginModal';
import { logoutAction } from '@/app/actions/auth';
import { useStoreLink } from '@/lib/use-store-link';

const NAV_LINKS = [
  { label: 'Races', href: '/races', soon: false },
  { label: 'Runners', href: '/runners', soon: false },
  { label: 'Clubs', href: '/clubs', soon: false },
  { label: 'Workout Plan', href: '/workout-plan', soon: true },
  { label: 'Coaches', href: '/coaches', soon: true },
];

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LogoMark = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="w-7 h-7">
    <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.48 6.48 0 00-4.707 2.017.75.75 0 11-1.086-1.034A7.98 7.98 0 018 0a7.98 7.98 0 015.793 2.483.75.75 0 11-1.086 1.034A6.48 6.48 0 008 1.5zM1.236 5.279a.75.75 0 01.514.927 6.503 6.503 0 004.727 8.115.75.75 0 11-.349 1.459 8.003 8.003 0 01-5.82-9.986.75.75 0 01.928-.515zm13.528 0a.75.75 0 01.928.515 8.003 8.003 0 01-5.82 9.986.75.75 0 01-.35-1.459 6.503 6.503 0 004.728-8.115.75.75 0 01.514-.927z" />
      <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 8a5 5 0 1110 0A5 5 0 013 8z" opacity=".25" />
    </g>
  </svg>
);

const HeaderClient = ({ isAuthed }: { isAuthed: boolean }) => {
  const navRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingOut, startTransition] = useTransition();
  // Tracks the post-login server refresh so the modal can show a loader
  // until the new render (with auth state) actually commits.
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  const postLoginRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
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

  // Body scroll lock + Escape close
  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleSignIn = () => {
    setOpen(false);
    setLoginOpen(true);
  };

  const handleLoginSuccess = () => {
    postLoginRef.current = true;
    startLoginRefresh(() => {
      router.refresh();
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
            const cls = [l.soon ? 'has-soon' : '', active ? 'is-current' : ''].filter(Boolean).join(' ') || undefined;
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
          <li className="v1-nav-auth-mobile-li">{authButton}</li>
          <li>
            <a href={downloadHref} className="v1-nav-cta" onClick={closeMenu}>
              Download
            </a>
          </li>
        </ul>

        <div className="v1-nav-actions-desktop">
          {authButton}
          <a href={downloadHref} className="v1-nav-cta">Download</a>
        </div>

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
