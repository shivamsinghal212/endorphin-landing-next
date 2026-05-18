'use client';

import Link from 'next/link';
import {
  useStudioClub,
  useStudioEvents,
  useStudioJoinRequests,
} from '@/lib/studio/hooks';
import { ClubAvatar, StudioTopBar } from '../../_components/ui';
import { QuickNav } from './quick-nav';
import type { Club } from '@/lib/admin-api';

export function ManageShell({
  slug,
  initialClub,
  pageTitle,
  pageEyebrow,
  children,
  rightAction,
}: {
  slug: string;
  initialClub?: Club;
  pageTitle: string;
  pageEyebrow?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const clubQ = useStudioClub(slug);
  const club = clubQ.data ?? initialClub;
  const requestsQ = useStudioJoinRequests(slug, 'pending');
  const eventsQ = useStudioEvents(slug);

  const pendingMembers = requestsQ.data?.length ?? 0;
  const adminsCount = club?.admins?.length ?? 0;
  const eventsCount = eventsQ.data?.length ?? 0;

  const base = `/admin/studio/${encodeURIComponent(slug)}`;

  return (
    <>
      <StudioTopBar
        back={{ href: base, label: 'Overview' }}
        title={
          club ? (
            <div className="flex items-center gap-2 min-w-0">
              <ClubAvatar src={club.logoUrl} name={club.name} size={28} />
              <p className="font-display uppercase text-sm font-bold truncate leading-tight text-jet">
                {club.name}
              </p>
            </div>
          ) : null
        }
        right={
          club ? (
            <Link
              href={`/clubs/${encodeURIComponent(slug)}`}
              target="_blank"
              className="hidden md:inline text-xs px-3 py-1.5 rounded-lg border border-jet/10 hover:bg-jet/5 text-jet"
            >
              View public
            </Link>
          ) : undefined
        }
      />

      <div className="max-w-6xl mx-auto md:flex text-jet">
        <QuickNav
          slug={slug}
          pendingMembers={pendingMembers}
          eventsCount={eventsCount}
          adminsCount={adminsCount}
        />

        <main className="flex-1 min-w-0 px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              {pageEyebrow && (
                <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-1">
                  {pageEyebrow}
                </p>
              )}
              <h1 className="font-display uppercase text-2xl md:text-3xl font-bold tracking-tight">
                {pageTitle}
              </h1>
            </div>
            {rightAction}
          </div>

          {children}
        </main>
      </div>
    </>
  );
}
