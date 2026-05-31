import Link from 'next/link';

interface ExploreMoreStripProps {
  /** `from-club` → on /clubs/[slug]. `from-race` → on /running-events/[slug]. */
  from: 'from-club' | 'from-race';
}

/** Section-level cross-link CTA. Sits above the page-bottom CTA so a
 *  reader who scrolled past the detail content but isn't ready to RSVP
 *  or register has a clear hop into the other section. Dark editorial
 *  band — high contrast against the page so it reads as an
 *  intentional break, not another body section. */
export default function ExploreMoreStrip({ from }: ExploreMoreStripProps) {
  const cfg = from === 'from-club'
    ? {
        eyebrow: 'Also on Endorfin',
        titleA: 'Find a',
        titleAccent: 'running event.',
        body: 'Marathons, 10Ks, trail runs and brand drops — every event happening across India, in one place.',
        cta: 'Browse running events',
        href: '/running-events',
      }
    : {
        eyebrow: 'Also on Endorfin',
        titleA: 'Run with a',
        titleAccent: 'community.',
        body: 'Discover run clubs in your city — weekly runs, beginner-friendly groups, and clubs picking up new members.',
        cta: 'Browse run clubs',
        href: '/clubs',
      };

  return (
    <section className="v1-explore-more" aria-label={cfg.cta}>
      <div className="v1-explore-more-inner">
        <div className="v1-explore-more-eyebrow-row">
          <span className="v1-explore-more-rule" aria-hidden="true" />
          <span className="v1-explore-more-eyebrow">{cfg.eyebrow}</span>
        </div>
        <h2 className="v1-explore-more-title">
          {cfg.titleA}{' '}
          <span className="v1-explore-more-title-accent">{cfg.titleAccent}</span>
        </h2>
        <p className="v1-explore-more-body">{cfg.body}</p>
        <Link href={cfg.href} className="v1-explore-more-cta">
          <span className="v1-explore-more-cta-label">{cfg.cta}</span>
          <span className="v1-explore-more-cta-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
