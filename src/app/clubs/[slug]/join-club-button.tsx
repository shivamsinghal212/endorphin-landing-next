'use client';

import { useStoreLink } from '@/lib/use-store-link';

// "Join club" on the public site only works inside the app — point each
// platform at its own store. Desktop falls back to the homepage download
// section so the visitor sees both store buttons.
export function JoinClubButton() {
  const href = useStoreLink('/#download');
  return (
    <a
      className="btn btn-primary"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      Join club
    </a>
  );
}
