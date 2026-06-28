'use client';

import Link from 'next/link';
import { useState } from 'react';
import posthog from 'posthog-js';
import { useStudioAuth } from '@/lib/studio/auth-context';
import { useMyClubs, describeError } from '@/lib/studio/hooks';
import { ClubAvatar, ErrorState, Skeleton, StudioTopBar } from './ui';
import { ImpersonationPicker } from './impersonation';

/** Entry surface for /admin/studio.
 *  - 0 workspaces  → empty state with "claim your club" guidance
 *  - else          → role picker tiles (Manage clubs / Organiser / Super-admin)
 *
 *  Always shows the picker — even a single-club owner lands here and taps in,
 *  so there's a consistent place to switch workspace or exit impersonation. */
export function StudioEntry() {
  const studio = useStudioAuth();
  const isSuper = !!studio?.isSuperAdmin;
  const {
    data: clubs,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyClubs('admin');

  const firstName = studio?.name?.split(' ')[0];

  const hasClubs = !!clubs && clubs.length > 0;

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
            {/* Slot 01 / Run-club owner: manage existing clubs, or — for anyone
                without a club of their own (super-admins included) — the
                add-a-club option. Kept first so the tile numbers match order. */}
            {hasClubs ? <ClubsTile clubs={clubs} /> : <EmptyStateTile />}

            <OrganiserTile />

            {isSuper && <SuperAdminTile />}
          </div>
        )}

        {isSuper && <ImpersonationPicker />}
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
    <Link
      href="/admin/studio/organiser"
      className="group block bg-white border border-jet/10 rounded-3xl p-6 md:p-8 hover:border-jet/30 transition-colors min-h-[200px]"
    >
      <p className="text-[10px] uppercase tracking-wider text-jet/40">
        02 / Organiser
      </p>
      <p
        className="italic text-3xl md:text-4xl leading-[0.95] mt-6 text-jet"
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
      >
        Races &amp;<br />events.
      </p>
      <p className="text-xs text-jet/60 mt-4">
        Listings, registrations, results.
      </p>
      <div className="mt-6">
        <span className="inline-block px-3 py-1.5 rounded-lg bg-jet text-bone text-xs font-medium group-hover:bg-jet/90">
          Open organiser →
        </span>
      </div>
    </Link>
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
  const [handle, setHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cleanHandle = (raw: string) =>
    raw
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/^@/, '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanHandle(handle);
    if (!cleaned || submitting) return;
    setSubmitting(true);
    try {
      posthog.capture('club_onboard_request', { instagram_handle: cleaned, source: 'studio_empty_state' });
    } catch {
      // PostHog optional — never block the request on analytics.
    }
    try {
      await fetch('https://api.endorfin.run/api/v1/clubs/onboard-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagramHandle: cleaned }),
      });
    } catch {
      // Swallow — the team can still be reached via the mailto fallback below.
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="bg-white border border-jet/10 rounded-3xl p-6 md:p-8 min-h-[200px] flex flex-col">
      <p className="text-[10px] uppercase tracking-wider text-jet/40">
        01 / Run-club owner
      </p>
      <p
        className="italic text-3xl md:text-4xl leading-[0.95] mt-6 text-jet"
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
      >
        Add your<br />club.
      </p>
      {submitted ? (
        <p className="text-xs text-jet/60 mt-4" role="status" aria-live="polite">
          <strong className="text-jet">Thanks — we&apos;ll be in touch.</strong> We&apos;ve
          logged your club. Anything urgent? Email{' '}
          <a className="underline" href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
        </p>
      ) : (
        <>
          <p className="text-xs text-jet/60 mt-4">
            Drop your club&apos;s Instagram and we&apos;ll get you set up — or email{' '}
            <a className="underline" href="mailto:hello@endorfin.run">hello@endorfin.run</a>.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2">
            <div className="flex items-center border border-jet/15 rounded-lg px-3 focus-within:border-jet/40 transition-colors">
              <span className="text-jet/40 text-sm" aria-hidden>@</span>
              <input
                type="text"
                className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm text-jet outline-none"
                placeholder="your_club_handle"
                aria-label="Your club's Instagram handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
            <button
              type="submit"
              disabled={!cleanHandle(handle) || submitting}
              className="self-start px-4 py-2 rounded-lg text-sm font-medium bg-jet text-bone hover:bg-jet/90 transition-colors disabled:opacity-40 disabled:hover:bg-jet"
            >
              {submitting ? 'Adding…' : 'Add my club →'}
            </button>
          </form>
          <Link href="/clubs" className="mt-4 text-xs text-jet/50 underline hover:text-jet">
            Or browse clubs
          </Link>
        </>
      )}
    </div>
  );
}
