'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Club } from '@/lib/admin-api';
import {
  describeError,
  useApproveJoinRequest,
  useChangeMemberRole,
  useKickMember,
  useRejectJoinRequest,
  useStudioJoinRequests,
  useStudioMembers,
} from '@/lib/studio/hooks';
import { ManageShell } from '../_components/manage-shell';
import {
  ClubAvatar,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../_components/ui';

type Tab = 'pending' | 'active';

export function MembersContent({
  slug,
  initialClub,
}: {
  slug: string;
  initialClub: Club;
}) {
  const [tab, setTab] = useState<Tab>('pending');
  const requestsQ = useStudioJoinRequests(slug, 'pending');
  const membersQ = useStudioMembers(slug);

  const approveMut = useApproveJoinRequest(slug);
  const rejectMut = useRejectJoinRequest(slug);
  const kickMut = useKickMember(slug);
  const roleMut = useChangeMemberRole(slug);

  const pending = requestsQ.data ?? [];
  const members = membersQ.data ?? [];

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveMut.mutateAsync(id);
      toast.success(`${name} is in`);
    } catch (e) {
      toast.error('Could not approve', { description: describeError(e) });
    }
  };

  const handleReject = async (id: string, name: string) => {
    const reason = window.prompt(
      `Optional reason for ${name}? (Leave blank to skip.)`,
      '',
    );
    // null = cancelled
    if (reason === null) return;
    try {
      await rejectMut.mutateAsync({
        requestId: id,
        reason: reason.trim() || null,
      });
      toast.success(`${name} declined`);
    } catch (e) {
      toast.error('Could not reject', { description: describeError(e) });
    }
  };

  const handleKick = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the club?`)) return;
    try {
      await kickMut.mutateAsync(userId);
      toast.success(`Removed ${name}`);
    } catch (e) {
      toast.error('Could not remove', { description: describeError(e) });
    }
  };

  const handleRoleChange = async (
    userId: string,
    role: 'admin' | 'member',
    name: string,
  ) => {
    try {
      await roleMut.mutateAsync({ userId, role });
      toast.success(
        role === 'admin'
          ? `${name} is now a co-admin`
          : `${name} is now a member`,
      );
    } catch (e) {
      toast.error('Could not change role', {
        description: describeError(e),
      });
    }
  };

  return (
    <ManageShell
      slug={slug}
      initialClub={initialClub}
      pageEyebrow="People & runs"
      pageTitle="Members"
      rightAction={
        <div className="inline-flex rounded-lg bg-white border border-jet/10 p-0.5 text-xs">
          <button
            onClick={() => setTab('pending')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'pending' ? 'bg-jet text-bone' : 'text-jet/60 hover:text-jet'
            }`}
          >
            Pending
            {pending.length > 0 && (
              <span
                className={`text-[10px] tabular-nums ${
                  tab === 'pending' ? 'text-bone/70' : 'text-signal'
                }`}
              >
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'active' ? 'bg-jet text-bone' : 'text-jet/60 hover:text-jet'
            }`}
          >
            Active
            <span
              className={`text-[10px] tabular-nums ${
                tab === 'active' ? 'text-bone/70' : 'text-jet/40'
              }`}
            >
              {members.length}
            </span>
          </button>
        </div>
      }
    >
      {tab === 'pending' ? (
        requestsQ.isError ? (
          <ErrorState
            title="Couldn't load join requests"
            message={describeError(requestsQ.error)}
            onRetry={() => requestsQ.refetch()}
          />
        ) : requestsQ.isLoading ? (
          <ListSkeleton />
        ) : pending.length === 0 ? (
          <EmptyState
            title="All caught up"
            message="No-one is waiting on your approval right now."
          />
        ) : (
          <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
            {pending.map((r, i) => (
              <div
                key={r.id}
                className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center p-4 ${
                  i === pending.length - 1 ? '' : 'border-b border-jet/5'
                } hover:bg-jet/[0.015]`}
              >
                <ClubAvatar
                  src={r.user.pictureUrl ?? null}
                  name={r.user.name}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.user.name}</p>
                  <p className="text-xs text-jet/50 truncate">
                    {r.user.email || '—'}
                  </p>
                  {r.formData && Object.keys(r.formData).length > 0 && (
                    <FormDataInline data={r.formData} />
                  )}
                  <p className="text-[10px] text-jet/40 mt-0.5">
                    Requested{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleApprove(r.id, r.user.name)}
                    disabled={approveMut.isPending}
                    className="px-3 py-1.5 rounded-md bg-green-50 text-green-800 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(r.id, r.user.name)}
                    disabled={rejectMut.isPending}
                    className="px-3 py-1.5 rounded-md text-jet/60 hover:bg-jet/5 text-xs disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : membersQ.isError ? (
        <ErrorState
          title="Couldn't load members"
          message={describeError(membersQ.error)}
          onRetry={() => membersQ.refetch()}
        />
      ) : membersQ.isLoading ? (
        <ListSkeleton />
      ) : members.length === 0 ? (
        <EmptyState title="No members yet" />
      ) : (
        <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.id}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center p-4 ${
                i === members.length - 1 ? '' : 'border-b border-jet/5'
              } hover:bg-jet/[0.015]`}
            >
              <ClubAvatar
                src={m.user.pictureUrl ?? null}
                name={m.user.name}
                size={36}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.user.name}</p>
                <p className="text-xs text-jet/50 truncate">
                  {m.user.email || '—'}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                  m.role === 'owner'
                    ? 'bg-signal/10 text-signal'
                    : m.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-jet/5 text-jet/60'
                }`}
              >
                {m.role}
              </span>
              {m.role === 'owner' ? (
                <span className="text-xs text-jet/30">—</span>
              ) : (
                <details className="relative">
                  <summary className="list-none cursor-pointer text-jet/40 hover:text-jet px-2">
                    ⋯
                  </summary>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-jet/10 rounded-lg shadow-lg p-1 text-sm z-10">
                    {m.role === 'admin' ? (
                      <button
                        onClick={() =>
                          handleRoleChange(m.user.id, 'member', m.user.name)
                        }
                        className="w-full text-left px-3 py-1.5 rounded hover:bg-jet/5"
                      >
                        Demote to member
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleRoleChange(m.user.id, 'admin', m.user.name)
                        }
                        className="w-full text-left px-3 py-1.5 rounded hover:bg-jet/5"
                      >
                        Make co-admin
                      </button>
                    )}
                    <button
                      onClick={() => handleKick(m.user.id, m.user.name)}
                      className="w-full text-left px-3 py-1.5 rounded text-signal hover:bg-signal/5"
                    >
                      Remove from club
                    </button>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </ManageShell>
  );
}

function FormDataInline({ data }: { data: Record<string, unknown> }) {
  const pairs = Object.entries(data).filter(
    ([, v]) => v !== null && v !== '' && v !== undefined,
  );
  if (pairs.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {pairs.slice(0, 4).map(([k, v]) => (
        <span key={k} className="text-[11px] text-jet/60">
          <span className="text-jet/40">{k}:</span> {String(v)}
        </span>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-4 ${
            i === 2 ? '' : 'border-b border-jet/5'
          }`}
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
