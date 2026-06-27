'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Item {
  href: string;
  label: string;
  badge?: number;
  tone?: 'attention' | 'muted';
  group?: string;
  rightSlot?: string;
}

export function QuickNav({
  slug,
  pendingMembers = 0,
  pendingRsvps = 0,
  eventsCount = 0,
  adminsCount = 0,
}: {
  slug: string;
  pendingMembers?: number;
  pendingRsvps?: number;
  eventsCount?: number;
  adminsCount?: number;
}) {
  const pathname = usePathname() ?? '';
  const base = `/admin/studio/${encodeURIComponent(slug)}`;

  const items: Item[] = [
    { href: base, label: 'Overview', group: 'workspace' },
    { href: `${base}/about`, label: 'About', group: 'club' },
    { href: `${base}/social`, label: 'Social & links', group: 'club' },
    {
      href: `${base}/admins`,
      label: 'Co-admins',
      group: 'club',
      rightSlot: adminsCount ? String(adminsCount) : undefined,
    },
    { href: `${base}/join-form`, label: 'Join form', group: 'club' },
    { href: `${base}/coaches`, label: 'Coaches', group: 'club' },
    { href: `${base}/collaborations`, label: 'Brand & Instagram', group: 'club' },
    {
      href: `${base}/members`,
      label: 'Members',
      group: 'people',
      badge: pendingMembers,
      tone: pendingMembers ? 'attention' : undefined,
    },
    {
      href: `${base}/events`,
      label: 'Events',
      group: 'people',
      rightSlot: eventsCount ? String(eventsCount) : undefined,
    },
    {
      href: `${base}/rsvps`,
      label: 'RSVPs',
      group: 'people',
      badge: pendingRsvps,
      tone: pendingRsvps ? 'attention' : undefined,
    },
    { href: '#analytics', label: 'Insights', group: 'insights', tone: 'muted' },
  ];

  const groups: { id: string; label: string }[] = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'club', label: 'Your club' },
    { id: 'people', label: 'People & runs' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-jet/10 bg-[#F8F6F3]/40 sticky top-[57px] self-start">
      <nav className="p-3 space-y-0.5 text-sm">
        {groups.map((g) => {
          const groupItems = items.filter((i) => i.group === g.id);
          if (!groupItems.length) return null;
          return (
            <div key={g.id} className="pb-1">
              <p className="text-[10px] uppercase tracking-wider text-jet/40 px-2 py-2">
                {g.label}
              </p>
              {groupItems.map((item) => {
                const isActive =
                  item.href === base
                    ? pathname === base
                    : pathname.startsWith(item.href);
                const muted = item.tone === 'muted';
                return muted ? (
                  <span
                    key={item.href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-jet/40 cursor-not-allowed"
                  >
                    {item.label}
                    <span className="ml-auto text-[10px]">soon</span>
                  </span>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-jet text-bone'
                        : 'text-jet/70 hover:bg-jet/5 hover:text-jet'
                    }`}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`text-[10px] font-medium ${
                          isActive ? 'text-bone/80' : 'text-signal'
                        }`}
                      >
                        {item.badge} pending
                      </span>
                    ) : item.rightSlot ? (
                      <span
                        className={`text-[10px] ${
                          isActive ? 'text-bone/60' : 'text-jet/40'
                        }`}
                      >
                        {item.rightSlot}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
