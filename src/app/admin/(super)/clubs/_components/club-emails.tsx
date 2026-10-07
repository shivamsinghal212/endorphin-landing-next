'use client';

import { useEffect, useState } from 'react';
import { Eye, Send, RefreshCw, X } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  listClubEmailTemplates,
  previewClubEmail,
  sendClubEmail,
  AdminApiError,
  type ClubEmailTemplate,
} from '@/lib/admin-api';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors';

const errMsg = (e: unknown) => {
  if (e instanceof AdminApiError) {
    try {
      return JSON.parse(e.message).detail ?? e.message;
    } catch {
      return `${e.status} — ${e.message}`;
    }
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
};

/** One-off emails to a club (outreach, announcements). Templates come from
 *  the backend registry, so new ones show up here without frontend changes. */
export function ClubEmails({ slug }: { slug: string }) {
  const token = useAdminToken();
  const [templates, setTemplates] = useState<ClubEmailTemplate[]>([]);
  const [key, setKey] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    listClubEmailTemplates(token)
      .then((t) => {
        setTemplates(t);
        setKey((k) => k || t[0]?.key || '');
      })
      .catch((e) => setStatus({ tone: 'err', msg: errMsg(e) }));
  }, [token]);

  const selected = templates.find((t) => t.key === key);

  const handlePreview = async () => {
    if (!token || !key) return;
    setBusy('preview');
    setStatus(null);
    try {
      setPreview(await previewClubEmail(token, slug, key));
    } catch (e) {
      setStatus({ tone: 'err', msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    if (!token || !key || !selected) return;
    const email = to.trim();
    if (!window.confirm(`Send "${selected.label}" to ${email}?`)) return;
    setBusy('send');
    setStatus(null);
    try {
      await sendClubEmail(token, slug, key, email);
      setStatus({ tone: 'ok', msg: `Sent to ${email}.` });
      setTo('');
    } catch (e) {
      setStatus({ tone: 'err', msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <select value={key} onChange={(e) => setKey(e.target.value)} className={inputCls}>
        {templates.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      {selected && <p className="font-body text-xs text-jet/50">{selected.description}</p>}
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="organiser@example.com"
        className={inputCls}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={!key || busy !== null}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-jet/15 text-jet text-sm font-body font-medium hover:bg-jet/5 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {busy === 'preview' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Preview
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!key || !to.includes('@') || busy !== null}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {busy === 'send' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
      {status && (
        <p className={`font-body text-xs ${status.tone === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {status.msg}
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-jet/60 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-[680px] h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-jet/10">
              <p className="font-body text-sm text-jet truncate">
                <span className="text-jet/50">Subject:</span> {preview.subject}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="p-1 rounded hover:bg-jet/5 cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4 text-jet/60" />
              </button>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="flex-1 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
