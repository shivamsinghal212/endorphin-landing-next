import Link from 'next/link';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';

const RIBBON_ITEMS = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail', 'Run', 'Connect', 'Train', 'Repeat'];

const HeroSection = () => (
  <>
    <section className="v1-hero">
      <div className="v1-hero-bg" aria-hidden="true" />
      <div className="container">
        <div className="v1-hero-topline">
          <span className="v1-hero-kicker">Powering India&apos;s running landscape</span>
          <span className="v1-hero-meta">Est. 2025 · Made in India</span>
        </div>

        <h1 className="v1-hero-title">
          Find{' '}
          <span className="v1-hero-rotate" aria-label="races, runners, clubs">
            <span className="v1-hero-rotate-track">
              <span>races</span>
              <span>runners</span>
              <span>clubs</span>
              <span>races</span>
            </span>
          </span>
          <span className="and-line">
            and train with <span className="accent">Kip</span>.
          </span>
        </h1>

        <div className="v1-hero-stats-bar">
          <span className="v1-hero-stat"><span className="v1-hero-stat-n">500+</span><span className="v1-hero-stat-l">Races</span></span>
          <span className="v1-hero-stat"><span className="v1-hero-stat-n">10K+</span><span className="v1-hero-stat-l">Runners</span></span>
          <span className="v1-hero-stat"><span className="v1-hero-stat-n">50+</span><span className="v1-hero-stat-l">Verified Clubs</span></span>
          <span className="v1-hero-stat"><span className="v1-hero-stat-n">25+</span><span className="v1-hero-stat-l">Indian Cities</span></span>
          <span className="v1-hero-stat kip"><span className="v1-hero-stat-n">Kip</span><span className="v1-hero-stat-l">AI Run Coach</span></span>
        </div>

        <div className="v1-hero-cta-row" id="download">
          <Link href={PLAY_STORE_URL} target="_blank" rel="noopener" className="v1-btn v1-btn-primary">
            <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"/></svg>
            Google Play
          </Link>
          <Link href={APP_STORE_URL} target="_blank" rel="noopener" className="v1-btn v1-btn-ghost">
            <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"/></svg>
            App Store
          </Link>
        </div>
      </div>
    </section>

    <div className="v1-ribbon" aria-hidden="true">
      <div className="v1-ribbon-track">
        {[...Array(4)].map((_, i) => (
          <span key={i} style={{ display: 'inline-flex' }}>
            {RIBBON_ITEMS.map((item, j) => (
              <span key={`${i}-${j}`}>{item} ·</span>
            ))}
          </span>
        ))}
      </div>
    </div>
  </>
);

export default HeroSection;
