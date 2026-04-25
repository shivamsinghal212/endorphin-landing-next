import Link from 'next/link';
import Logo from './Logo';
import { PLAY_STORE_URL, APP_STORE_URL } from '@/lib/store-links';

const PRODUCT = [
  { label: 'Races', href: '/races' },
  { label: 'Runners', href: '/runners' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Workout Plan', href: '/workout-plan' },
  { label: 'Coaches', href: '/coaches' },
];

const COMPANY = [
  { label: 'Support', href: '/support' },
  { label: 'Contact', href: 'mailto:hello@endorfin.run' },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

const INSTAGRAM_URL = 'https://www.instagram.com/hacknflex/';

const Footer = () => (
  <footer className="v1-footer">
    <div className="v1-footer-top">
      <div>
        <Logo variant="light" />
        <p className="v1-footer-brand-sub">
          India&apos;s running community — races, runners, clubs, and Kip, your AI run coach. Built for people who actually run.
        </p>
      </div>
      <div>
        <div className="v1-footer-col-title">Explore</div>
        <ul className="v1-footer-links">
          {PRODUCT.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="v1-footer-col-title">Company</div>
        <ul className="v1-footer-links">
          {COMPANY.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="v1-footer-col-title">Legal</div>
        <ul className="v1-footer-links">
          {LEGAL.map((l) => (
            <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
          ))}
          <li>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Google Play</a>
          </li>
          <li>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">App Store</a>
          </li>
        </ul>
      </div>
    </div>
    <div className="v1-footer-bottom">
      <span>&copy; {new Date().getFullYear()} Endorfin · Made in India</span>
      <span className="v1-footer-bottom-right">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Endorfin on Instagram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <span>@hacknflex</span>
        </a>
        <span aria-hidden="true">·</span>
        <a href="mailto:hello@endorfin.run">hello@endorfin.run</a>
      </span>
    </div>
  </footer>
);

export default Footer;
