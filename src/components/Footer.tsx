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
  { label: 'About', href: '#about' },
  { label: 'Support', href: '/support' },
  { label: 'Contact', href: 'mailto:hello@endorfin.run' },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

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
      <span>hello@endorfin.run</span>
    </div>
  </footer>
);

export default Footer;
