import Link from 'next/link';

interface DetailCrossNavProps {
  /** `club` → on /clubs/[slug]. `race` → on /running-events/[slug]. */
  kind: 'club' | 'race';
}

function ArrowLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

/** Top-of-page section switcher. Two affordances side by side: a back
 *  link to the parent listing on the left, a lateral link to the other
 *  section on the right. Renders as a transparent chrome line — no
 *  band, no border — so it doesn't consume vertical real estate. */
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
          <span className="v1-detail-crossnav-arrow">
            <ArrowLeft />
          </span>
          <span className="v1-detail-crossnav-text">{back.label}</span>
        </Link>
        <Link href={lateral.href} className="v1-detail-crossnav-link is-lateral">
          <span className="v1-detail-crossnav-text">{lateral.label}</span>
          <span className="v1-detail-crossnav-arrow">
            <ArrowRight />
          </span>
        </Link>
      </div>
    </nav>
  );
}
