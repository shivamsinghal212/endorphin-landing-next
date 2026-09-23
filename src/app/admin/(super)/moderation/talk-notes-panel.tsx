'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { listTalkComments, setTalkCommentHidden, type AdminTalkComment } from '@/lib/admin-api';
import { talkUrl } from '@/lib/talk';

/** Runners' Talk notes, newest first. Notes go live on post; hiding one takes
 *  it (and its replies) off the public page without deleting it. */
export function TalkNotesPanel({ token }: { token: string | null }) {
  const [notes, setNotes] = useState<AdminTalkComment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await listTalkComments(token, { page, limit: 20 });
    setNotes(res.comments);
    setTotal(res.total);
  }, [token, page]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (n: AdminTalkComment) => {
    if (!token) return;
    await setTalkCommentHidden(token, n.id, !n.isHidden);
    load();
  };

  if (notes === null) {
    return <div className="flex items-center justify-center h-40"><RefreshCw className="w-5 h-5 animate-spin text-jet/30" /></div>;
  }
  const pages = Math.ceil(total / 20) || 1;
  return (
    <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
      <div className="divide-y divide-jet/5">
        {notes.length === 0 ? (
          <div className="px-4 py-12 text-center font-body text-sm text-jet/40">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`px-4 py-3 flex items-start justify-between gap-4 ${n.isHidden ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-jet whitespace-pre-wrap">{n.body}</p>
                <p className="font-body text-xs text-jet/40 mt-1">
                  {n.user.name} ({n.userEmail}){n.parentId ? ' · reply' : ''} · on{' '}
                  <Link href={talkUrl(n.postSlug)} target="_blank" className="hover:text-signal">{n.postTitle}</Link> ·{' '}
                  {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}
                  {n.isHidden ? ' · hidden' : ''}
                </p>
              </div>
              <button
                onClick={() => toggle(n)}
                className="p-1.5 rounded hover:bg-jet/5 text-jet/40 hover:text-jet cursor-pointer shrink-0"
                title={n.isHidden ? 'Show again' : 'Hide'}
              >
                {n.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-jet/5 font-body text-xs text-jet/60">
        <span className="text-jet/40">{total} total</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="disabled:opacity-30 cursor-pointer">Prev</button>
          <span>{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="disabled:opacity-30 cursor-pointer">Next</button>
        </div>
      </div>
    </div>
  );
}
