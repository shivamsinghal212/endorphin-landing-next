'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStudioAuth } from '@/lib/studio/auth-context';
import { useMyClubs, describeError } from '@/lib/studio/hooks';
import { ClubAvatar, ErrorState, Skeleton, StudioTopBar } from './ui';

export function MyClubsContent() {
  const studio = useStudioAuth();
  const isSuper = !!studio?.isSuperAdmin;
  // Superadmins get every club (membership=null) so they can manage any club
  // without joining it — see the `all_clubs` leg of GET /clubs/mine.
  const { data: clubs, isLoading, isError, error, refetch, isFetching } =
    useMyClubs('admin', isSuper);

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!clubs) return clubs;
    const q = search.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) =>
      [c.name, c.city, c.slug].some((f) => f?.toLowerCase().includes(q)),
    );
  }, [clubs, search]);

  const firstName = studio?.name?.split(' ')[0];

  return (
    <>
      <StudioTopBar
        back={{ href: '/admin/studio', label: 'Workspaces' }}
      />
      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-20 text-jet">
        <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-2">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="font-display uppercase text-2xl md:text-4xl font-bold tracking-tight mb-2 text-jet">
          {isSuper ? 'All clubs' : 'Your clubs'}
        </h1>
        <p className="text-sm text-jet/60 max-w-xl mb-8">
          {isSuper
            ? 'Superadmin — pick any club to manage. You can edit, run events and approve members without joining the club.'
            : 'Pick a club to manage. Owners can edit anything except deletion. New here? Claim your club from its public page.'}
        </p>

        {isSuper && clubs && clubs.length > 0 && (
          <div className="mb-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clubs by name, city or slug…"
              className="w-full max-w-md px-4 py-2.5 rounded-xl border border-jet/15 text-sm text-jet placeholder:text-jet/40 focus:outline-none focus:border-jet/40"
            />
          </div>
        )}

        {isError ? (
          <ErrorState
            title="Couldn't load your clubs"
            message={describeError(error)}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-jet/10 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-jet/5">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              </div>
            ))}
          </div>
        ) : !clubs || clubs.length === 0 ? (
          <EmptyClubsState isSuper={isSuper} />
        ) : filtered && filtered.length === 0 ? (
          <p className="text-sm text-jet/50">
            No clubs match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filtered ?? []).map((c) => (
              <Link
                key={c.slug}
                href={`/admin/studio/${encodeURIComponent(c.slug)}`}
                className="group block bg-white border border-jet/10 hover:border-jet/30 rounded-2xl p-5 transition-colors text-jet"
              >
                <div className="flex items-center gap-3 mb-3">
                  <ClubAvatar src={c.logoUrl} name={c.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-display uppercase text-base font-bold truncate text-jet">
                        {c.name}
                      </p>
                    </div>
                    <p className="text-xs text-jet/50 truncate">
                      {c.city}
                      {c.publishedAt ? ' · Live' : ' · Draft'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-jet/5 text-center">
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums text-jet">
                      {c.stats?.members ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-jet/40">
                      Members
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums text-jet">
                      {c.stats?.runsThisMonth ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-jet/40">
                      Runs
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold tabular-nums text-jet">
                      {c.stats?.kmThisMonth ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-jet/40">
                      KM
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-jet/40 group-hover:text-jet">
                  Manage →
                </p>
              </Link>
            ))}

            {isSuper && !search && (
              <Link
                href="/admin/clubs/new"
                className="flex flex-col items-center justify-center bg-jet text-bone border border-jet rounded-2xl p-5 hover:bg-jet/90 transition-colors min-h-[160px]"
              >
                <span className="font-display uppercase text-base font-bold text-bone">
                  + New club
                </span>
                <span className="text-xs text-bone/60 mt-1">super-admin</span>
              </Link>
            )}
          </div>
        )}

        {!isLoading && clubs && clubs.length > 0 && (
          <p className="mt-6 text-xs text-jet/40">
            {search
              ? `Showing ${filtered?.length ?? 0} of ${clubs.length}`
              : `Showing ${clubs.length}`}{' '}
            {clubs.length === 1 ? 'club' : 'clubs'}.{' '}
            {isFetching && <span>Refreshing…</span>}
          </p>
        )}
      </main>
    </>
  );
}

function EmptyClubsState({ isSuper }: { isSuper: boolean }) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-8 md:p-12 text-center">
      <p className="font-display uppercase text-sm font-bold text-jet/50 mb-2">
        No clubs yet
      </p>
      <p className="text-sm text-jet/60 max-w-md mx-auto mb-5">
        You don&apos;t manage any clubs on this account. If you run one, head to
        its public page and tap <strong>Claim this club</strong>.
      </p>
      <Link
        href="/clubs"
        className="inline-block px-4 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5 text-jet"
      >
        Browse clubs
      </Link>
      {isSuper && (
        <Link
          href="/admin/clubs/new"
          className="ml-2 inline-block px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
        >
          + New club
        </Link>
      )}
    </div>
  );
}
