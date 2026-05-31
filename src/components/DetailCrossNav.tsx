import Link from 'next/link';

interface DetailCrossNavProps {
  /** `club` → on /clubs/[slug]. `race` → on /running-events/[slug]. */
  kind: 'club' | 'race';
}

/** Small back-link + lateral cross-link rendered at the top of a detail
 *  page so users can jump out to the parent listing OR over to the
 *  other section. Replaces the dead-end feel of a detail page with no
 *  in-page navigation. */
export default function DetailCrossNav({ kind }: DetailCrossNavProps) {
  const back = kind === 'club'
    ? { href: '/clubs', label: 'All run clubs' }
    : { href: '/running-events', label: 'All running events' };
  const lateral = kind === 'club'
    ? { href: '/running-events', label: 'Running events' }
    : { href: '/clubs', label: 'Run clubs' };

  return (
    <nav className="v1-detail-crossnav" aria-label="Section navigation">
      <Link href={back.href} className="v1-detail-crossnav-back">
        <span aria-hidden="true">←</span> {back.label}
      </Link>
      <span className="v1-detail-crossnav-sep" aria-hidden="true">·</span>
      <Link href={lateral.href} className="v1-detail-crossnav-lateral">
        {lateral.label}
      </Link>
    </nav>
  );
}
