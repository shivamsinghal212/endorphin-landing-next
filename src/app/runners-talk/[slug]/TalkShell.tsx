'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import posthog from 'posthog-js';
import LoginModal from '@/components/LoginModal';
import { addNote, deleteNote, loadTalkState, setHighFive, type TalkViewer } from '@/app/actions/talk';
import { initials, type TalkComment } from '@/lib/talk';

const RUNS = ['5K', '10K', 'Half marathon', 'Marathon', 'Ultra', 'Trail'];

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
  </svg>
);
const NoteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);
const WaIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />
  </svg>
);
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v6h14v-6" />
  </svg>
);

function ago(iso: string | null): string {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function withUtm(url: string, source: string) {
  return `${url}?utm_source=${source}&utm_medium=share&utm_campaign=runners_talk`;
}

interface Props {
  slug: string;
  url: string;
  title: string;
  checkpoints: { id: string; title: string }[];
  initialHighFives: number;
  initialNotes: number;
  children: ReactNode;
  authorCard: ReactNode;
  next: ReactNode;
}

export default function TalkShell({
  slug, url, title, checkpoints, initialHighFives, initialNotes, children, authorCard, next,
}: Props) {
  const [viewer, setViewer] = useState<TalkViewer>({ userId: null, highFived: false, isAdmin: false });
  const [highFives, setHighFives] = useState(initialHighFives);
  const [notes, setNotes] = useState<TalkComment[] | null>(null);
  const [status, setStatus] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const pending = useRef<null | 'hf' | 'note'>(null);

  const refresh = useCallback(async () => {
    const s = await loadTalkState(slug);
    setViewer(s.viewer);
    setNotes(s.comments);
    return s.viewer;
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── like (stored as a "high five" in the API) ───
  const toggleHighFive = useCallback(async () => {
    if (!viewer.userId) {
      pending.current = 'hf';
      setLoginOpen(true);
      return;
    }
    const on = !viewer.highFived;
    setViewer((v) => ({ ...v, highFived: on }));
    setHighFives((n) => n + (on ? 1 : -1));
    const r = await setHighFive(slug, on);
    if (r.ok) {
      setHighFives(r.data.highFives);
      if (on) posthog.capture('talk_high_five', { slug });
    } else {
      setViewer((v) => ({ ...v, highFived: !on }));
      setHighFives((n) => n + (on ? -1 : 1));
      setStatus(r.error);
    }
  }, [viewer, slug]);

  // ─── share ───
  const [shareOpen, setShareOpen] = useState(false);
  const share = async (channel: 'whatsapp' | 'native' | 'copy') => {
    setShareOpen(false);
    posthog.capture('talk_share_clicked', { slug, channel });
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${withUtm(url, 'whatsapp')}`)}`, '_blank', 'noopener');
    } else if (channel === 'native' && navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      try {
        await navigator.clipboard.writeText(withUtm(url, 'copy'));
        setStatus('Link copied');
      } catch {
        setStatus(url);
      }
    }
  };

  // ─── notes ───
  const [body, setBody] = useState('');
  const [run, setRun] = useState('');
  const [replyTo, setReplyTo] = useState<TalkComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [noteErr, setNoteErr] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const submitNote = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!body.trim() || posting) return;
    if (!viewer.userId) {
      pending.current = 'note';
      setLoginOpen(true);
      return;
    }
    setPosting(true);
    setNoteErr('');
    const r = await addNote(slug, { body: body.trim(), runnerContext: run || null, parentId: replyTo?.id ?? null });
    setPosting(false);
    if (!r.ok) {
      if (r.status === 401) {
        pending.current = 'note';
        setLoginOpen(true);
      } else setNoteErr(r.error);
      return;
    }
    posthog.capture('talk_note_posted', { slug, is_reply: Boolean(replyTo) });
    setNotes((ns) => [...(ns ?? []), r.data]);
    setBody('');
    setReplyTo(null);
  };

  const removeNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    const r = await deleteNote(id);
    if (r.ok) setNotes((ns) => (ns ?? []).filter((n) => n.id !== id && n.parentId !== id));
    else setStatus(r.error);
  };

  const onLoggedIn = async () => {
    setLoginOpen(false);
    const v = await refresh();
    const what = pending.current;
    pending.current = null;
    if (!v.userId) return;
    if (what === 'hf' && !v.highFived) {
      const r = await setHighFive(slug, true);
      if (r.ok) {
        setViewer((x) => ({ ...x, highFived: true }));
        setHighFives(r.data.highFives);
      }
    }
    if (what === 'note') composerRef.current?.focus();
  };

  // ─── checkpoint rail ───
  const [cpIndex, setCpIndex] = useState(-1);
  useEffect(() => {
    const els = checkpoints.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const onScroll = () => {
      const line = window.innerHeight * 0.4;
      let idx = -1;
      els.forEach((el, i) => { if (el.getBoundingClientRect().top < line) idx = i; });
      setCpIndex(idx);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [checkpoints]);

  const count = notes ? notes.length : initialNotes;
  const top = (notes ?? []).filter((n) => !n.parentId);
  const repliesOf = (id: string) => (notes ?? []).filter((n) => n.parentId === id);
  const canDelete = (n: TalkComment) => viewer.isAdmin || n.user.id === viewer.userId;

  const Note = ({ n }: { n: TalkComment }) => (
    <div className={`rt-note${n.isAuthor ? ' is-author' : ''}`}>
      <span className="rt-av" aria-hidden="true">
        {n.user.pictureUrl ? <img src={n.user.pictureUrl} alt="" referrerPolicy="no-referrer" /> : initials(n.user.name)}
      </span>
      <div>
        <div className="h">
          <b>{n.user.name}</b>
          {n.isAuthor && <span className="auth">Author</span>}
          {n.runnerContext && <span className="ctx">Runs {n.runnerContext}</span>}
          <time dateTime={n.createdAt ?? undefined}>{ago(n.createdAt)}</time>
        </div>
        <p>{n.body}</p>
        <div className="acts">
          <button
            type="button"
            className="rt-btn is-quiet"
            onClick={() => { setReplyTo(n.parentId ? (notes ?? []).find((x) => x.id === n.parentId) ?? n : n); composerRef.current?.focus(); }}
          >
            Reply
          </button>
          {canDelete(n) && (
            <button type="button" className="rt-btn is-quiet" onClick={() => removeNote(n.id)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );

  const goNotes = () => document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="rt-body">
      <aside className="rt-rail" aria-label="Checkpoints">
        <span className="rt-label">Checkpoints</span>
        <ol style={{ ['--rt-progress' as string]: `${checkpoints.length ? ((cpIndex + 1) / checkpoints.length) * 100 : 0}%` }}>
          {checkpoints.map((c, i) => (
            <li key={c.id} className={i < cpIndex ? 'is-done' : i === cpIndex ? 'is-now' : ''}>
              <a href={`#${c.id}`}><small>CP {i + 1}</small>{c.title}</a>
            </li>
          ))}
        </ol>
      </aside>

      <div className="rt-prose">
        {children}

        <div className="rt-endbar">
          <span className="q">Useful before your next long run?</span>
          <button type="button" className="rt-btn" aria-pressed={viewer.highFived} onClick={toggleHighFive}>
            <HeartIcon />Like <span>{highFives}</span>
          </button>
          <button type="button" className="rt-btn" onClick={goNotes}>
            <NoteIcon />{count} {count === 1 ? 'note' : 'notes'}
          </button>
          <button type="button" className="rt-btn is-wa" onClick={() => share('whatsapp')}>
            <WaIcon />WhatsApp
          </button>
          <div className="rt-sheet">
            <button type="button" className="rt-btn" aria-expanded={shareOpen} onClick={() => setShareOpen((o) => !o)}>
              <ShareIcon />More
            </button>
            {shareOpen && (
              <div className="rt-sheet-pop">
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button type="button" onClick={() => share('native')}>Share…</button>
                )}
                <button type="button" onClick={() => share('copy')}>Copy link</button>
              </div>
            )}
          </div>
          <span className="rt-status" role="status" aria-live="polite">{status}</span>
        </div>

        {authorCard}

        <section className="rt-notes" id="notes" aria-labelledby="notes-h">
          <div className="rt-notes-head">
            <h2 id="notes-h">Notes from the road</h2>
            <span className="rt-label">{count} {count === 1 ? 'note' : 'notes'}</span>
          </div>

          <form className="rt-composer" onSubmit={submitNote}>
            <label className="rt-label" htmlFor="rt-note">
              {replyTo ? `Replying to ${replyTo.user.name}` : 'Add your note'}
            </label>
            <textarea
              id="rt-note"
              ref={composerRef}
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Had this after 8 km on my long runs. The mini-squat test showed my left knee caving…"
            />
            <div className="row">
              <label className="rt-label" htmlFor="rt-run">You run</label>
              <select id="rt-run" value={run} onChange={(e) => setRun(e.target.value)}>
                <option value="">—</option>
                {RUNS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {replyTo && (
                <button type="button" className="rt-btn is-quiet" onClick={() => setReplyTo(null)}>Cancel reply</button>
              )}
              <button type="submit" className="rt-btn is-solid" disabled={posting || !body.trim()}>
                {posting ? 'Posting…' : viewer.userId ? 'Post note' : 'Sign in to post'}
              </button>
            </div>
            {noteErr && <span className="err">{noteErr}</span>}
          </form>

          {notes === null ? null : top.length === 0 ? (
            <p className="rt-empty">No notes yet. Had this? Tell other runners what worked.</p>
          ) : (
            top.map((n) => (
              <div key={n.id} style={{ display: 'grid', gap: 14 }}>
                <Note n={n} />
                {repliesOf(n.id).length > 0 && (
                  <div className="rt-replies">
                    {repliesOf(n.id).map((r) => <Note key={r.id} n={r} />)}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {next}
      </div>

      <aside className="rt-dock" aria-label="Actions">
        <button type="button" className="rt-btn is-round" aria-pressed={viewer.highFived} aria-label="Like" onClick={toggleHighFive}>
          <HeartIcon /><span>{highFives}</span>
        </button>
        <button type="button" className="rt-btn is-round" aria-label="Notes" onClick={goNotes}>
          <NoteIcon /><span>{count}</span>
        </button>
        <button type="button" className="rt-btn is-round is-wa" aria-label="Share to WhatsApp" onClick={() => share('whatsapp')}>
          <WaIcon />
        </button>
      </aside>

      <LoginModal
        open={loginOpen}
        onClose={() => { pending.current = null; setLoginOpen(false); }}
        onSuccess={onLoggedIn}
        title={<>Sign in to <span className="v1lm-red">join the talk.</span></>}
        subtitle="Like the piece and leave a note for other runners."
      />
    </div>
  );
}
