'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudioAuth } from '@/lib/studio/auth-context';
import { useMyClubs, describeError } from '@/lib/studio/hooks';
import { ClubAvatar, ErrorState, Skeleton, StudioTopBar } from './ui';

/** Entry surface for /admin/studio.
 *  - 0 workspaces  → empty state with "claim your club" guidance
 *  - 1 workspace + no super-admin → auto-jump in
 *  - else          → role picker tiles (Manage clubs / Organiser / Super-admin)
 *
 *  When the user has only one option (e.g. a single club and isn't a
 *  super-admin), we skip the picker entirely and route straight to their
 *  single workspace. */
export function StudioEntry() {
  const studio = useStudioAuth();
  const isSuper = !!studio?.isSuperAdmin;
  const router = useRouter();
  const {
    data: clubs,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyClubs('admin');

  const firstName = studio?.name?.split(' ')[0];

  const hasClubs = !!clubs && clubs.length > 0;
  // Number of available workspace tiles for this user.
  const tileCount = (hasClubs ? 1 : 0) + (isSuper ? 1 : 0);
  // The auto-jump-on-single-club only fires when there's literally one path.
  const shouldAutoEnterSingleClub =
    !isLoading && hasClubs && clubs.length === 1 && tileCount === 1;

  useEffect(() => {
    if (shouldAutoEnterSingleClub && clubs) {
      router.replace(`/admin/studio/${encodeURIComponent(clubs[0].slug)}`);
    }
  }, [shouldAutoEnterSingleClub, clubs, router]);

  return (
    <>
      <StudioTopBar />
      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-16 md:pb-20">
        <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-2">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="font-display uppercase text-2xl md:text-4xl font-bold tracking-tight mb-3 text-jet">
          Where to today?
        </h1>
        <p className="text-sm text-jet/60 max-w-xl mb-8">
          Pick the workspace you want to manage. You can switch any time from
          the top-right menu.
        </p>

        {isError ? (
          <ErrorState
            title="Couldn't load your workspaces"
            message={describeError(error)}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {hasClubs && (
              <ClubsTile clubs={clubs} />
            )}

            <OrganiserTile />

            {isSuper && <SuperAdminTile />}

            {!hasClubs && !isSuper && <EmptyStateTile />}
          </div>
        )}
      </main>
    </>
  );
}

function ClubsTile({ clubs }: { clubs: { slug: string; name: string; logoUrl: string | null; stats?: { members: number } }[] }) {
  const href =
    clubs.length === 1
      ? `/admin/studio/${encodeURIComponent(clubs[0].slug)}`
      : '/admin/studio/clubs';
  const totalMembers = clubs.reduce((s, c) => s + (c.stats?.members ?? 0), 0);
  return (
    <Link
      href={href}
      className="group block bg-jet text-bone rounded-3xl p-6 md:p-8 hover:bg-jet/95 transition-colors min-h-[200px] relative overflow-hidden"
    >
      <p className="text-[10px] uppercase tracking-wider text-bone/50">
        01 / Run-club owner
      </p>
      <p
        className="italic text-3xl md:text-4xl leading-[0.95] mt-6"
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
      >
        Manage<br />your {clubs.length === 1 ? 'club' : 'clubs'}.
      </p>
      <p className="text-xs text-bone/70 mt-4">
        {clubs.length} club{clubs.length === 1 ? '' : 's'} ·{' '}
        {totalMembers.toLocaleString('en-IN')} members
      </p>
      <div className="mt-6 flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-lg bg-bone text-jet text-xs font-medium group-hover:bg-bone/90">
          Open workspace →
        </span>
      </div>
      <div className="mt-5 flex -space-x-2">
        {clubs.slice(0, 5).map((c) => (
          <div
            key={c.slug}
            className="w-9 h-9 rounded-lg ring-2 ring-jet overflow-hidden flex-shrink-0"
            title={c.name}
          >
            <ClubAvatar src={c.logoUrl} name={c.name} size={36} />
          </div>
        ))}
        {clubs.length > 5 && (
          <span className="w-9 h-9 rounded-lg ring-2 ring-jet bg-bone/10 flex items-center justify-center text-[10px] text-bone/70">
            +{clubs.length - 5}
          </span>
        )}
      </div>
    </Link>
  );
}

function OrganiserTile() {
  return (
    <div
      className="block bg-white border border-jet/10 rounded-3xl p-6 md:p-8 min-h-[200px] opacity-80 cursor-not-allowed select-none"
      aria-disabled
    >
      <p className="text-[10px] uppercase tracking-wider text-jet/40">
        02 / Organiser · WIP
      </p>
      <p
        className="italic text-3xl md:text-4xl leading-[0.95] mt-6 text-jet/50"
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
      >
        Races &amp;<br />events.
      </p>
      <p className="text-xs text-jet/50 mt-4">
        Listings, registrations, results. Currently in build.
      </p>
      <p className="mt-6 text-xs text-jet/40">Coming soon</p>
    </div>
  );
}

function SuperAdminTile() {
  return (
    <Link
      href="/admin"
      className="group block bg-signal/5 border-2 border-signal/20 rounded-3xl p-6 md:p-8 hover:bg-signal/10 transition-colors min-h-[200px]"
    >
      <p className="text-[10px] uppercase tracking-wider text-signal">
        03 / Super-admin
      </p>
      <p
        className="italic text-3xl md:text-4xl leading-[0.95] mt-6 text-jet"
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
      >
        Platform tools.
      </p>
      <p className="text-xs text-jet/60 mt-4">
        All clubs · all users · scrapers · moderation · notifications.
      </p>
      <div className="mt-6">
        <span className="inline-block px-3 py-1.5 rounded-lg bg-signal text-white text-xs font-medium group-hover:bg-signal/90">
          Open super-admin →
        </span>
      </div>
    </Link>
  );
}

function EmptyStateTile() {
  const [browseHover, setBrowseHover] = useState(false);
  return (
    <div className="sm:col-span-2 bg-white border border-jet/10 rounded-3xl p-8 text-center">
      <p className="font-display uppercase text-sm font-bold text-jet/50 mb-2">
        No workspaces yet
      </p>
      <p className="text-sm text-jet/60 max-w-md mx-auto mb-5">
        You don&apos;t manage any clubs or events on this account. If you run a
        club, head to its public page and tap <strong>Claim this club</strong>.
      </p>
      <Link
        href="/clubs"
        onMouseEnter={() => setBrowseHover(true)}
        onMouseLeave={() => setBrowseHover(false)}
        className={`inline-block px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          browseHover
            ? 'bg-jet text-bone border-jet'
            : 'border-jet/15 hover:bg-jet/5'
        }`}
      >
        Browse clubs
      </Link>
    </div>
  );
}
