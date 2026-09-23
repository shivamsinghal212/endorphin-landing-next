'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Plus, RefreshCw, Save, Star, Trash2 } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  deleteTalkPost,
  listTalkPosts,
  saveTalkPost,
  type AdminTalkPost,
  type TalkPostInput,
} from '@/lib/admin-api';
import { STATIONS, stationLabel, talkUrl } from '@/lib/talk';

const EMPTY: TalkPostInput = {
  slug: '',
  title: '',
  dek: null,
  station: 'injury',
  tags: [],
  hookText: null,
  coverImageUrl: null,
  summaryPoints: [],
  bodyMd: '',
  seoTitle: null,
  seoDescription: null,
  authorName: '',
  authorRole: null,
  authorBio: null,
  authorCredentials: [],
  authorUrl: null,
  authorImageUrl: null,
  authorUserId: null,
  isCover: false,
  status: 'draft',
};

const input =
  'w-full rounded-lg border border-jet/15 bg-white px-3 py-2 font-body text-sm text-jet focus:outline-none focus:ring-2 focus:ring-signal/30';
const label = 'block font-body text-xs font-medium text-jet/60 mb-1';

function toInput(p: AdminTalkPost): TalkPostInput {
  const { id: _id, createdAt: _c, updatedAt: _u, publishedAt: _p, readingMinutes: _r, highFives: _h, notes: _n, ...rest } = p;
  return rest;
}

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const orNull = (s: string) => (s.trim() ? s : null);

export function TalkAdmin() {
  const token = useAdminToken();
  const [posts, setPosts] = useState<AdminTalkPost[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; data: TalkPostInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setPosts(await listTalkPosts(token));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof TalkPostInput>(k: K, v: TalkPostInput[K]) =>
    setEditing((e) => (e ? { ...e, data: { ...e.data, [k]: v } } : e));

  const save = async () => {
    if (!token || !editing) return;
    setSaving(true);
    setMsg('');
    try {
      const saved = await saveTalkPost(token, editing.data, editing.id);
      setEditing({ id: saved.id, data: toInput(saved) });
      setMsg(saved.status === 'published' ? 'Saved and live.' : 'Saved as draft.');
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'talk', slug: saved.slug }),
      }).catch(() => {});
      load();
    } catch (e) {
      setMsg(e instanceof Error ? `Could not save: ${e.message}` : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!token || !editing?.id || !confirm('Delete this piece, its likes and notes? This cannot be undone.')) return;
    await deleteTalkPost(token, editing.id);
    fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'talk', slug: editing.data.slug }),
    }).catch(() => {});
    setEditing(null);
    load();
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-bold uppercase text-jet">Runners&apos; Talk</h1>
          <button
            onClick={() => { setMsg(''); setEditing({ data: { ...EMPTY } }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New piece
          </button>
        </div>
        <div className="bg-white rounded-xl border border-jet/10 overflow-hidden divide-y divide-jet/5">
          {posts === null ? (
            <div className="flex items-center justify-center h-32"><RefreshCw className="w-5 h-5 animate-spin text-jet/30" /></div>
          ) : posts.length === 0 ? (
            <div className="px-4 py-12 text-center font-body text-sm text-jet/40">No pieces yet.</div>
          ) : (
            posts.map((p) => (
              <button
                key={p.id}
                onClick={() => { setMsg(''); setEditing({ id: p.id, data: toInput(p) }); }}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-jet/[0.02] cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-jet truncate">
                    {p.isCover && <Star className="inline w-3.5 h-3.5 text-signal mr-1 -mt-0.5" />}
                    {p.title}
                  </p>
                  <p className="font-body text-xs text-jet/40 mt-0.5">
                    {stationLabel(p.station)} · {p.authorName} · {p.highFives} likes · {p.notes} notes
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-body ${p.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-jet/5 text-jet/50'}`}>
                  {p.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  const d = editing.data;
  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-jet/5 cursor-pointer" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </button>
          <h1 className="font-display text-xl font-bold uppercase text-jet truncate">{d.title || 'New piece'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {editing.id && d.status === 'published' && (
            <a href={talkUrl(d.slug)} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-jet/15 text-sm font-body text-jet hover:bg-jet/5">
              <ExternalLink className="w-4 h-4" /> View
            </a>
          )}
          {editing.id && (
            <button onClick={remove} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-body hover:bg-red-100 cursor-pointer">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !d.title.trim() || !d.authorName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
      {msg && <p className="mb-4 font-body text-sm text-jet/70">{msg}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 bg-white rounded-xl border border-jet/10 p-5">
          <div>
            <label className={label} htmlFor="t-title">Headline</label>
            <input id="t-title" className={input} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Runner's Knee That Only Appears After 6 km" />
          </div>
          <div>
            <label className={label} htmlFor="t-dek">Second line (italic)</label>
            <input id="t-dek" className={input} value={d.dek ?? ''} onChange={(e) => set('dek', orNull(e.target.value))} placeholder="and why the cause is rarely the knee" />
          </div>
          <div>
            <label className={label} htmlFor="t-summary">The 60-second version (one takeaway per line, 2–4)</label>
            <textarea id="t-summary" className={`${input} min-h-[96px]`} value={d.summaryPoints.join('\n')} onChange={(e) => set('summaryPoints', lines(e.target.value))} />
          </div>
          <div>
            <label className={label} htmlFor="t-body">Body (markdown)</label>
            <p className="font-body text-xs text-jet/50 mb-2">
              <code>## Heading</code> becomes a numbered checkpoint. Self-check card: <code>:::check Title</code> … <code>:::</code> with
              list items starting ✓ or ✕. Red warning block: <code>:::stop Title</code> … <code>:::</code>.
            </p>
            <textarea id="t-body" className={`${input} min-h-[520px] font-mono text-[13px] leading-relaxed`} value={d.bodyMd} onChange={(e) => set('bodyMd', e.target.value)} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-jet/10 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="t-status">Status</label>
                <select id="t-status" className={input} value={d.status} onChange={(e) => set('status', e.target.value as TalkPostInput['status'])}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="t-station">Station</label>
                <select id="t-station" className={input} value={d.station} onChange={(e) => set('station', e.target.value as TalkPostInput['station'])}>
                  {STATIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 font-body text-sm text-jet">
              <input type="checkbox" checked={d.isCover} onChange={(e) => set('isCover', e.target.checked)} />
              Homepage cover story (replaces the current one)
            </label>
            <div>
              <label className={label} htmlFor="t-slug">URL slug</label>
              <input id="t-slug" className={input} value={d.slug} onChange={(e) => set('slug', e.target.value)} placeholder="made from the headline if empty" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="t-hook">Big hook word</label>
                <input id="t-hook" className={input} maxLength={12} value={d.hookText ?? ''} onChange={(e) => set('hookText', orNull(e.target.value))} placeholder="6K" />
              </div>
              <div>
                <label className={label} htmlFor="t-tags">Tags (comma)</label>
                <input id="t-tags" className={input} value={d.tags.join(', ')} onChange={(e) => set('tags', list(e.target.value))} placeholder="Knee, 10K" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-jet/10 p-5 space-y-4">
            <p className="font-display text-sm font-bold uppercase text-jet">Author</p>
            <div>
              <label className={label} htmlFor="t-an">Name</label>
              <input id="t-an" className={input} value={d.authorName} onChange={(e) => set('authorName', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="t-ar">Role line</label>
              <input id="t-ar" className={input} value={d.authorRole ?? ''} onChange={(e) => set('authorRole', orNull(e.target.value))} placeholder="Physiotherapist · Clinic, City" />
            </div>
            <div>
              <label className={label} htmlFor="t-ac">Credentials (comma)</label>
              <input id="t-ac" className={input} value={d.authorCredentials.join(', ')} onChange={(e) => set('authorCredentials', list(e.target.value))} />
            </div>
            <div>
              <label className={label} htmlFor="t-ab">Bio</label>
              <textarea id="t-ab" className={`${input} min-h-[80px]`} value={d.authorBio ?? ''} onChange={(e) => set('authorBio', orNull(e.target.value))} />
            </div>
            <div>
              <label className={label} htmlFor="t-au">Website</label>
              <input id="t-au" className={input} value={d.authorUrl ?? ''} onChange={(e) => set('authorUrl', orNull(e.target.value))} placeholder="https://" />
            </div>
            <div>
              <label className={label} htmlFor="t-ai">Photo URL</label>
              <input id="t-ai" className={input} value={d.authorImageUrl ?? ''} onChange={(e) => set('authorImageUrl', orNull(e.target.value))} />
            </div>
            <div>
              <label className={label} htmlFor="t-auid">Endorfin user ID (gets the Author badge on notes)</label>
              <input id="t-auid" className={input} value={d.authorUserId ?? ''} onChange={(e) => set('authorUserId', orNull(e.target.value.trim()))} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-jet/10 p-5 space-y-4">
            <p className="font-display text-sm font-bold uppercase text-jet">Search</p>
            <div>
              <label className={label} htmlFor="t-st">SEO title ({(d.seoTitle ?? '').length}/60)</label>
              <input id="t-st" className={input} value={d.seoTitle ?? ''} onChange={(e) => set('seoTitle', orNull(e.target.value))} placeholder="How people search for it" />
            </div>
            <div>
              <label className={label} htmlFor="t-sd">Meta description ({(d.seoDescription ?? '').length}/155)</label>
              <textarea id="t-sd" className={`${input} min-h-[80px]`} value={d.seoDescription ?? ''} onChange={(e) => set('seoDescription', orNull(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
