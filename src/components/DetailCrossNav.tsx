import Link from 'next/link';

interface DetailCrossNavProps {
  /** `club` → on /clubs/[slug]. `race` → on /running-events/[slug]. */
  kind: 'club' | 'race';
}

/** Top-of-page section switcher. Two affordances side by side: a back
 *  link to the parent listing on the left, a lateral link to the other
 *  section on the right, separated by a thin pipe. Replaces the
 *  dead-end feel of a detail page with no in-page navigation. */
export default function DetailCrossNav({ kind }: DetailCrossNavProps) {
  const back = kind === 'club'
    ? { href: '/clubs', label: 'All run clubs' }
    : { href: '/running-events', label: 'All running events' };
  const lateral = kind === 'club'
    ? { href: '/running-events', label: 'Running events' }
    : { href: '/clubs', label: 'Run clubs' };

  return (
    <nav className="v1-detail-crossnav" aria-label="Section navigation">
      <div className="v1-detail-crossnav-inner">
        <Link href={back.href} className="v1-detail-crossnav-link is-back">
          <span className="v1-detail-crossnav-arrow" aria-hidden="true">←</span>
          <span className="v1-detail-crossnav-text">{back.label}</span>
        </Link>
        <span className="v1-detail-crossnav-divider" aria-hidden="true" />
        <Link href={lateral.href} className="v1-detail-crossnav-link is-lateral">
          <span className="v1-detail-crossnav-text">{lateral.label}</span>
          <span className="v1-detail-crossnav-arrow" aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}
