'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  createCampaign,
  getCampaignOptions,
  listCampaigns,
  previewCampaign,
  type CampaignSegment,
  type CampaignSummary,
} from '@/lib/admin-api';
import { CampaignDetailView } from './campaign-detail';
import { Send, RefreshCw, Users, Sparkles } from 'lucide-react';

const EMOJIS = ['🔥', '🏃', '🎉', '💪', '⚡', '🏅', '👏', '🙌', '✅', '📣', '🥇', '⏰', '🌟', '❤️', '🚀', '😀'];
const TOKENS = ['{name}', '{firstName}', '{city}', '{challengeTitle}'];

type Mode = 'everyone' | 'segment' | 'emails';
type Tab = 'new' | 'history';

const CHALLENGE_STATES: { value: NonNullable<CampaignSegment['challengeState']>; label: string }[] = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'enrolled_no_run', label: 'Enrolled · no run logged' },
  { value: 'enrolled_inactive', label: 'Enrolled · inactive' },
  { value: 'not_enrolled', label: 'Not enrolled' },
];

const fieldCls =
  'w-full px-3 py-2.5 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50';

export function NotificationsContent() {
  const token = useAdminToken();
  const [tab, setTab] = useState<Tab>('new');
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);

  if (openCampaignId && token) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Notifications</h1>
        <CampaignDetailView token={token} campaignId={openCampaignId} onBack={() => setOpenCampaignId(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold uppercase text-jet">Notifications</h1>
        <div className="flex gap-1 bg-jet/5 rounded-lg p-1">
          {(['new', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md font-body text-sm font-medium cursor-pointer transition-colors ${
                tab === t ? 'bg-white text-jet shadow-sm' : 'text-jet/50 hover:text-jet'
              }`}
            >
              {t === 'new' ? 'New Campaign' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'new' ? (
        <ComposeCampaign token={token} onSent={() => setTab('history')} />
      ) : (
        <CampaignHistory token={token} onOpen={setOpenCampaignId} />
      )}
    </div>
  );
}

// ── Compose + Audience ───────────────────────────────────────────────────────

function ComposeCampaign({ token, onSent }: { token: string | null; onSent: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('everyone');

  // segment fields
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [challengeState, setChallengeState] = useState<CampaignSegment['challengeState']>('enrolled');
  const [inactiveDays, setInactiveDays] = useState(7);
  const [emails, setEmails] = useState('');

  const [challenges, setChallenges] = useState<{ id: string; title: string; status: string }[]>([]);
  const [preview, setPreview] = useState<{ audienceSize: number; reachableSize: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (token) getCampaignOptions(token).then((o) => setChallenges(o.challenges)).catch(() => {});
  }, [token]);

  const buildSegment = useCallback((): CampaignSegment => {
    if (mode === 'everyone') return {};
    if (mode === 'emails') {
      const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
      return { emails: list };
    }
    const seg: CampaignSegment = {};
    if (city.trim()) seg.city = city.trim();
    if (gender) seg.gender = gender;
    if (challengeId && challengeState) {
      seg.challengeId = challengeId;
      seg.challengeState = challengeState;
      if (challengeState === 'enrolled_inactive') seg.inactiveDays = inactiveDays;
    }
    return seg;
  }, [mode, emails, city, gender, challengeId, challengeState, inactiveDays]);

  // Live recipient estimate (debounced), the way the wireframe recomputes on change.
  useEffect(() => {
    if (!token) return;
    const seg = buildSegment();
    if (mode === 'emails' && !(seg.emails && seg.emails.length)) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    const id = setTimeout(() => {
      previewCampaign(token, seg)
        .then((p) => setPreview({ audienceSize: p.audienceSize, reachableSize: p.reachableSize }))
        .catch(() => setPreview(null))
        .finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(id);
  }, [token, buildSegment, mode]);

  const insert = (text: string) => {
    const el = bodyRef.current;
    if (!el) { setBody((b) => b + text); return; }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  };

  const handleSend = async () => {
    if (!token || !title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const c = await createCampaign(token, {
        title: title.trim(),
        body: body.trim(),
        segment: buildSegment(),
      });
      setResult(`Queued for ${c.reachableSize.toLocaleString()} recipients`);
      setTitle('');
      setBody('');
      setTimeout(onSent, 900);
    } catch {
      setResult('Failed to queue campaign');
    } finally {
      setSending(false);
    }
  };

  const previewTitle = title.replace(/\{firstName\}|\{name\}/g, 'Aarav').replace(/\{city\}/g, 'Mumbai').replace(/\{challengeTitle\}/g, 'July 100K');
  const previewBody = body.replace(/\{firstName\}|\{name\}/g, 'Aarav').replace(/\{city\}/g, 'Mumbai').replace(/\{challengeTitle\}/g, 'July 100K');

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Compose */}
      <div className="bg-white rounded-xl border border-jet/10 p-6">
        <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4" /> Message
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your streak is waiting 🔥" className={fieldCls} />
          </div>
          <div>
            <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Body</label>
            <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="You've joined the challenge but haven't logged a run yet…" className={`${fieldCls} resize-none`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TOKENS.map((t) => (
              <button key={t} onClick={() => insert(t)} className="px-2 py-1 rounded-md bg-signal/10 text-signal text-xs font-mono hover:bg-signal/20 cursor-pointer">{t}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => insert(e)} className="w-8 h-8 rounded-md hover:bg-jet/5 text-lg cursor-pointer" type="button">{e}</button>
            ))}
          </div>

          <div>
            <div className="font-body text-[11px] font-semibold uppercase tracking-wide text-jet/40 mb-2">Live preview</div>
            <div className="flex gap-3 bg-white rounded-2xl border border-jet/10 p-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-signal shrink-0 flex items-center justify-center text-white font-bold text-sm">E</div>
              <div className="min-w-0">
                <p className="font-body font-semibold text-sm text-jet truncate">{previewTitle || 'Title preview'}</p>
                <p className="font-body text-sm text-jet/70 line-clamp-3">{previewBody || 'Body preview'}</p>
                <p className="font-body text-[11px] text-jet/30 mt-1">Endorfin · now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audience */}
      <div className="bg-white rounded-xl border border-jet/10 p-6">
        <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Audience
        </h2>

        <div className="flex gap-1 bg-jet/5 rounded-lg p-1 mb-5">
          {([['everyone', 'Everyone'], ['segment', 'Segment'], ['emails', 'Specific people']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 px-2 py-2 rounded-md font-body text-sm font-medium cursor-pointer transition-colors ${mode === m ? 'bg-white text-jet shadow-sm' : 'text-jet/50 hover:text-jet'}`}>{label}</button>
          ))}
        </div>

        {mode === 'everyone' && (
          <p className="font-body text-sm text-jet/50 mb-5">Every user with the app installed. Use sparingly.</p>
        )}

        {mode === 'emails' && (
          <div className="mb-5">
            <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Email addresses <span className="text-jet/30">(comma, space or newline separated)</span></label>
            <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="aarav@example.com, priya@example.com" className={`${fieldCls} resize-none font-mono text-xs`} />
          </div>
        )}

        {mode === 'segment' && (
          <div className="space-y-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any" className={fieldCls} />
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldCls}>
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Challenge</label>
              <select value={challengeId} onChange={(e) => setChallengeId(e.target.value)} className={fieldCls}>
                <option value="">No challenge filter</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}{c.status !== 'active' ? ` (${c.status})` : ''}</option>
                ))}
              </select>
            </div>

            {challengeId && (
              <div className="flex flex-wrap gap-2">
                {CHALLENGE_STATES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setChallengeState(s.value)}
                    className={`px-3 py-1.5 rounded-full font-body text-xs border cursor-pointer transition-colors ${
                      challengeState === s.value ? 'bg-jet text-white border-jet' : 'bg-white text-jet/60 border-jet/15 hover:border-jet/40'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {challengeId && challengeState === 'enrolled_inactive' && (
              <div>
                <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">No run logged in the last</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={inactiveDays} onChange={(e) => setInactiveDays(Math.max(1, Number(e.target.value)))} className={`${fieldCls} w-24`} />
                  <span className="font-body text-sm text-jet/50">days</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recipient readout */}
        <div className="rounded-xl bg-jet text-white p-4 flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-display text-2xl font-bold tabular-nums flex items-center gap-2">
              {previewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : (preview?.audienceSize ?? 0).toLocaleString()} recipients
            </div>
            <div className="font-body text-xs text-white/50">matching your rules right now</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-bold tabular-nums">{(preview?.reachableSize ?? 0).toLocaleString()}</div>
            <div className="font-body text-xs text-white/50">reachable by push</div>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim() || !(preview && preview.reachableSize > 0)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-signal text-white text-sm font-body font-semibold hover:bg-signal/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Queuing…' : `Send to ${(preview?.reachableSize ?? 0).toLocaleString()}`}
        </button>

        {result && (
          <p className={`font-body text-sm text-center mt-3 ${result.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{result}</p>
        )}
      </div>
    </div>
  );
}

// ── History ──────────────────────────────────────────────────────────────────

const CAMPAIGN_STATUS_STYLES: Record<CampaignSummary['status'], string> = {
  sent: 'bg-green-50 text-green-600',
  sending: 'bg-yellow-50 text-yellow-700',
  queued: 'bg-blue-50 text-blue-600',
  draft: 'bg-jet/5 text-jet/50',
  failed: 'bg-red-50 text-red-500',
};

function CampaignHistory({ token, onOpen }: { token: string | null; onOpen: (id: string) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);

  useEffect(() => {
    if (!token) return;
    listCampaigns(token, { limit: 50 }).then((r) => setCampaigns(r.campaigns)).catch(() => setCampaigns([]));
  }, [token]);

  if (!campaigns) {
    return <div className="flex items-center justify-center h-40"><RefreshCw className="w-5 h-5 animate-spin text-jet/30" /></div>;
  }
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-jet/10 p-10 text-center">
        <Sparkles className="w-6 h-6 text-jet/20 mx-auto mb-2" />
        <p className="font-body text-sm text-jet/50">No campaigns yet. Send your first from the New Campaign tab.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-jet/10 bg-white">
      <table className="w-full font-body text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-jet/40 border-b border-jet/10">
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-right">Audience</th>
            <th className="px-4 py-3 font-semibold text-right">Sent</th>
            <th className="px-4 py-3 font-semibold text-right">Delivered</th>
            <th className="px-4 py-3 font-semibold text-right">Opened</th>
            <th className="px-4 py-3 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)} className="border-b border-jet/5 last:border-0 hover:bg-jet/[0.02] cursor-pointer">
              <td className="px-4 py-3 text-jet font-medium max-w-xs truncate">{c.title}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${CAMPAIGN_STATUS_STYLES[c.status]}`}>{c.status}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-jet/70">{c.audienceSize.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums text-jet/70">{c.sentCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums text-green-600">{c.deliveredCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums text-blue-600">{c.openedCount.toLocaleString()}</td>
              <td className="px-4 py-3 text-jet/50 whitespace-nowrap">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
