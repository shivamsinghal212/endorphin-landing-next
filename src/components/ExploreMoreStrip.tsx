import Link from 'next/link';

interface ExploreMoreStripProps {
  /** `from-club` → on /clubs/[slug]. `from-race` → on /running-events/[slug]. */
  from: 'from-club' | 'from-race';
}

/** Section-level cross-link CTA. Sits above the page-bottom CTA so a
 *  reader who scrolled past the detail content but isn't ready to RSVP
 *  or register has a clear next hop into the *other* section.
 *  Always points to the generic listing. */
export default function ExploreMoreStrip({ from }: ExploreMoreStripProps) {
  const cfg = from === 'from-club'
    ? {
        eyebrow: 'Also on Endorfin',
        title: 'Find a running event.',
        body: 'Marathons, 10Ks, trail runs and brand drops — every event happening across India, one place.',
        cta: 'Browse running events',
        href: '/running-events',
      }
    : {
        eyebrow: 'Also on Endorfin',
        title: 'Run with a community.',
        body: 'Discover run clubs in your city — weekly runs, beginner-friendly groups, and clubs picking up new members.',
        cta: 'Browse run clubs',
        href: '/clubs',
      };

  return (
    <section className="v1-explore-more" aria-label={cfg.cta}>
      <div className="v1-explore-more-inner">
        <span className="v1-explore-more-eyebrow">{cfg.eyebrow}</span>
        <h2 className="v1-explore-more-title">{cfg.title}</h2>
        <p className="v1-explore-more-body">{cfg.body}</p>
        <Link href={cfg.href} className="v1-explore-more-cta">
          {cfg.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
