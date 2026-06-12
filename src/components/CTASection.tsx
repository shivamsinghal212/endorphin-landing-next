import Link from 'next/link';
import { PLAY_STORE_URL, APP_STORE_URL } from '@/lib/store-links';
import './home-refresh.css';

const CTASection = () => (
  <section className="hcta">
    <span className="hcta-ghost" aria-hidden="true">ENDORFIN</span>
    <span className="hcta-blob b1" aria-hidden="true" />
    <span className="hcta-blob b2" aria-hidden="true" />
    <div className="container hcta-inner">
      <span className="hcta-eyebrow">Made in India</span>
      <h2 className="hcta-title">
        India&apos;s running scene,<br /><em>in your pocket.</em>
      </h2>
      <p className="hcta-sub">
        Discover your next running event, your next long-run crew, your next start line. All free.
      </p>
      <div className="hcta-buttons">
        <Link href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-primary">
          <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 2.6c-.3.2-.5.5-.5.9v17c0 .4.2.7.5.9l9.6-9.4L3.5 2.6zm10.8 10.5 2.7 2.7-13.4 7.6 10.7-10.3zm2.7-4.1-2.7 2.7L4 1.4l13.4 7.6h-.4zm4.1 1.8c.6.3 1 .9 1 1.5s-.4 1.2-1 1.5l-3.1 1.8-3-3 3-3 3.1 1.8z"/></svg>
          Google Play
        </Link>
        <Link href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="v1-btn v1-btn-ghost">
          <svg className="v1-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.462 11.913c-.023-2.292 1.873-3.39 1.957-3.443-1.064-1.554-2.72-1.768-3.309-1.792-1.411-.143-2.752.832-3.468.832-.718 0-1.82-.811-2.995-.789-1.54.023-2.96.896-3.752 2.27-1.6 2.77-.41 6.86 1.153 9.104.765 1.103 1.676 2.338 2.866 2.293 1.149-.046 1.584-.744 2.972-.744 1.387 0 1.779.744 2.992.722 1.236-.024 2.019-1.121 2.779-2.227.876-1.275 1.237-2.516 1.26-2.58-.028-.012-2.417-.927-2.442-3.675M14.172 4.872c.634-.77 1.065-1.841.947-2.9-.917.036-2.029.611-2.686 1.381-.589.68-1.104 1.777-.965 2.823 1.028.08 2.07-.523 2.704-1.304"/></svg>
          App Store
        </Link>
      </div>
    </div>
  </section>
);

export default CTASection;
