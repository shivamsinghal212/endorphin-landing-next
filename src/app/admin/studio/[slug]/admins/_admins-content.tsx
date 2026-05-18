'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Club, UserSearchResult } from '@/lib/admin-api';
import { searchUsers } from '@/lib/admin-api';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  describeError,
  useAddClubAdmin,
  useRemoveClubAdmin,
  useStudioClub,
  useStudioMembers,
} from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import { ClubAvatar, EmptyState, Skeleton } from '../../_components/ui';

export function AdminsContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const clubQ = useStudioClub(slug);
  const club = clubQ.data ?? initialClub;
  const membersQ = useStudioMembers(slug);

  const addMut = useAddClubAdmin(slug);
  const removeMut = useRemoveClubAdmin(slug);

  const adminMembers = (membersQ.data ?? []).filter(
    (m) => m.role === 'admin' || m.role === 'owner',
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const token = useAdminToken();

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchUsers(token, query.trim());
        setResults(list);
      } catch {
        // searchUsers errors are non-critical — keep silent
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, token]);

  const handleAdd = async (user: UserSearchResult) => {
    try {
      await addMut.mutateAsync({ userId: user.id });
      toast.success(`${user.name} is a co-admin`);
      setQuery('');
      setResults([]);
    } catch (e) {
      toast.error('Could not add admin', { description: describeError(e) });
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} as co-admin?`)) return;
    try {
      await removeMut.mutateAsync(userId);
      toast.success(`${name} removed`);
    } catch (e) {
      toast.error('Could not remove', { description: describeError(e) });
    }
  };

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="Your club"
      pageTitle="Co-admins"
    >
      <div className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
        <p className="font-display uppercase text-sm font-bold mb-2">
          Invite a co-admin
        </p>
        <p className="text-xs text-jet/50 mb-4">
          Add anyone who&apos;s signed up to Endorfin. Co-admins can edit the club
          and approve members — but only you (the owner) can change roles.
        </p>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email (min 2 characters)"
            className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm focus:border-jet outline-none"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-jet/40">
              Searching…
            </span>
          )}
        </div>
        {results.length > 0 && (
          <div className="mt-2 border border-jet/10 rounded-xl divide-y divide-jet/5 max-h-64 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleAdd(r)}
                disabled={addMut.isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-jet/[0.02] disabled:opacity-50 text-left"
              >
                <ClubAvatar
                  src={r.pictureUrl ?? null}
                  name={r.name}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-jet/50 truncate">{r.email}</p>
                </div>
                <span className="text-xs text-signal font-medium">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {membersQ.isLoading ? (
        <ListSkeleton />
      ) : adminMembers.length === 0 ? (
        <EmptyState
          title="No co-admins yet"
          message="Use the search above to invite someone who can help you run the club."
        />
      ) : (
        <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
          {adminMembers.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 p-4 ${
                i === adminMembers.length - 1 ? '' : 'border-b border-jet/5'
              }`}
            >
              <ClubAvatar
                src={m.user.pictureUrl ?? null}
                name={m.user.name}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-jet/50 truncate">
                  {m.user.email || '—'}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                  m.role === 'owner'
                    ? 'bg-signal/10 text-signal'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {m.role}
              </span>
              {m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.user.id, m.user.name)}
                  disabled={removeMut.isPending}
                  className="text-xs text-jet/40 hover:text-signal px-2 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {club.admins && club.admins.length > 0 && (
        <p className="text-[11px] text-jet/40 mt-4">
          {club.admins.length} co-admin{club.admins.length === 1 ? '' : 's'} can
          manage this club.
        </p>
      )}
    </ManageShell>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-4 ${
            i === 1 ? '' : 'border-b border-jet/5'
          }`}
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
