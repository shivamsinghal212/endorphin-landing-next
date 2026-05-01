'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw, Download } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getClub,
  upsertClub,
  AdminApiError,
  type Club,
} from '@/lib/admin-api';

// ─── form state shape (mirrors ClubIn on the server) ───

type FormState = {
  slug: string;
  name: string;
  city: string;
  establishedYear: string; // stringified for the input; coerced on save
  logoUrl: string;
  kicker: string;
  subtitle: string;
  description: string;
  tagsCsv: string; // comma-separated in the UI
  isVerified: boolean;
  publishedAt: string; // ISO, optional

  whatsappUrl: string;
  instagramUrl: string;
  stravaUrl: string;
  joinUrl: string;

  // stats flattened
  statsMembers: string;
  statsRunsThisMonth: string;
  statsKmThisMonth: string;
  statsYearsRunning: string;
};

const EMPTY: FormState = {
  slug: '', name: '', city: '', establishedYear: '',
  logoUrl: '', kicker: '', subtitle: '', description: '', tagsCsv: '',
  isVerified: false, publishedAt: '',
  whatsappUrl: '', instagramUrl: '', stravaUrl: '', joinUrl: '',
  statsMembers: '0', statsRunsThisMonth: '0', statsKmThisMonth: '0', statsYearsRunning: '0',
};

function fromClub(club: Club): {
  form: FormState;
  adminsJson: string;
} {
  return {
    form: {
      slug: club.slug,
      name: club.name,
      city: club.city,
      establishedYear: club.establishedYear?.toString() ?? '',
      logoUrl: club.logoUrl ?? '',
      kicker: club.kicker ?? '',
      subtitle: club.subtitle ?? '',
      description: club.description ?? '',
      tagsCsv: (club.tags ?? []).join(', '),
      isVerified: club.isVerified,
      publishedAt: club.publishedAt ?? '',
      whatsappUrl: club.whatsappUrl ?? '',
      instagramUrl: club.instagramUrl ?? '',
      stravaUrl: club.stravaUrl ?? '',
      joinUrl: club.joinUrl ?? '',
      statsMembers: String(club.stats?.members ?? 0),
      statsRunsThisMonth: String(club.stats?.runsThisMonth ?? 0),
      statsKmThisMonth: String(club.stats?.kmThisMonth ?? 0),
      statsYearsRunning: String(club.stats?.yearsRunning ?? 0),
    },
    adminsJson: JSON.stringify(club.admins ?? [], null, 2),
  };
}

function intOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

function buildPayload(
  form: FormState,
  adminsJson: string,
): Record<string, unknown> {
  const tags = form.tagsCsv.split(',').map((t) => t.trim()).filter(Boolean);
  const admins = JSON.parse(adminsJson);

  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    city: form.city.trim(),
    establishedYear: intOrNull(form.establishedYear),
    logoUrl: strOrNull(form.logoUrl),
    kicker: strOrNull(form.kicker),
    subtitle: strOrNull(form.subtitle),
    description: strOrNull(form.description),
    tags,
    isVerified: form.isVerified,
    publishedAt: form.publishedAt ? form.publishedAt : null,
    whatsappUrl: strOrNull(form.whatsappUrl),
    instagramUrl: strOrNull(form.instagramUrl),
    stravaUrl: strOrNull(form.stravaUrl),
    joinUrl: strOrNull(form.joinUrl),
    stats: {
      members: intOrNull(form.statsMembers) ?? 0,
      runsThisMonth: intOrNull(form.statsRunsThisMonth) ?? 0,
      kmThisMonth: intOrNull(form.statsKmThisMonth) ?? 0,
      yearsRunning: intOrNull(form.statsYearsRunning) ?? 0,
    },
    admins,
  };
}

// ─── component ───────────────────────────────────────

export function ClubsAdminContent({ initialSlug }: { initialSlug: string }) {
  const token = useAdminToken();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ ...EMPTY, slug: initialSlug });
  const [adminsJson, setAdminsJson] = useState('[]');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  const loadSlug = async (slug: string) => {
    if (!slug.trim()) return;
    setLoading(true);
    setBanner(null);
    try {
      const club = await getClub(slug.trim());
      if (club) {
        const parts = fromClub(club);
        setForm(parts.form);
        setAdminsJson(parts.adminsJson);
        setBanner({ tone: 'ok', msg: `Loaded existing club "${club.name}".` });
      } else {
        setForm({ ...EMPTY, slug: slug.trim() });
        setAdminsJson('[]');
        setBanner({ tone: 'ok', msg: `No club with slug "${slug}" yet — fill in the form to create it.` });
      }
    } catch (e) {
      setBanner({ tone: 'err', msg: e instanceof Error ? e.message : 'Failed to load club.' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on first render when a slug was passed via the URL.
  useEffect(() => {
    if (initialSlug) loadSlug(initialSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!token || !form.slug.trim() || !form.name.trim() || !form.city.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload = buildPayload(form, adminsJson);
      const saved = await upsertClub(token, payload);
      // Ping the revalidation endpoint so /clubs/{slug} refreshes immediately
      // instead of waiting for the 60s ISR window. Failure is non-fatal.
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: saved.slug }),
      }).catch(() => {});
      setBanner({ tone: 'ok', msg: `Saved "${saved.name}" · /clubs/${saved.slug}` });
      router.replace(`/admin/clubs?slug=${encodeURIComponent(saved.slug)}`);
    } catch (e) {
      let msg = 'Save failed.';
      if (e instanceof SyntaxError) msg = 'Invalid JSON in admins.';
      else if (e instanceof AdminApiError) msg = `Save failed: ${e.status} — ${e.message}`;
      else if (e instanceof Error) msg = `Save failed: ${e.message}`;
      setBanner({ tone: 'err', msg });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-jet/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <h1 className="font-display text-xl font-bold uppercase text-jet">Clubs</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !form.slug.trim() || !form.name.trim() || !form.city.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save club
        </button>
      </div>

      {/* Slug picker */}
      <div className="mb-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block font-body text-xs font-medium text-jet/50 mb-1">Load a different club by slug</label>
          <input
            value={form.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="striders-delhi"
            className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
          />
        </div>
        <button
          onClick={() => loadSlug(form.slug)}
          disabled={loading || !form.slug.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-jet/15 text-jet text-sm font-body font-medium hover:bg-jet/5 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Load
        </button>
      </div>

      {banner && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm font-body ${
            banner.tone === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {banner.msg}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: basics + hero + social */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basics">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name *" value={form.name} onChange={(v) => updateField('name', v)} />
              <Field label="City *" value={form.city} onChange={(v) => updateField('city', v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Established year" value={form.establishedYear} onChange={(v) => updateField('establishedYear', v)} type="number" />
              <Field label="Published at" value={form.publishedAt} onChange={(v) => updateField('publishedAt', v)} type="datetime-local" />
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isVerified}
                    onChange={(e) => updateField('isVerified', e.target.checked)}
                    className="w-4 h-4 accent-signal cursor-pointer"
                  />
                  <span className="font-body text-sm text-jet">Verified club</span>
                </label>
              </div>
            </div>
          </Card>

          <Card title="Hero">
            <Field label="Logo URL (Supabase storage)" value={form.logoUrl} onChange={(v) => updateField('logoUrl', v)} />
            <Field label="Kicker" value={form.kicker} onChange={(v) => updateField('kicker', v)} placeholder="Delhi · Training Crew · Est. 2018" />
            <Field label="Subtitle" value={form.subtitle} onChange={(v) => updateField('subtitle', v)} placeholder="Run hard. Finish together." />
            <Field label="Description" value={form.description} onChange={(v) => updateField('description', v)} textarea />
            <Field label="Tags (comma-separated)" value={form.tagsCsv} onChange={(v) => updateField('tagsCsv', v)} placeholder="Training, Pace Groups, HM Training" />
          </Card>

          <Card title="Social links">
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp URL" value={form.whatsappUrl} onChange={(v) => updateField('whatsappUrl', v)} />
              <Field label="Instagram URL" value={form.instagramUrl} onChange={(v) => updateField('instagramUrl', v)} />
              <Field label="Strava URL" value={form.stravaUrl} onChange={(v) => updateField('stravaUrl', v)} />
              <Field label="Join URL (app deep link)" value={form.joinUrl} onChange={(v) => updateField('joinUrl', v)} />
            </div>
          </Card>

          <p className="font-body text-sm text-jet/60">
            Manage runs and events on the mobile club admin screen.
          </p>
        </div>

        {/* Right: stats, admins */}
        <div className="space-y-6">
          <Card title="Stats (hero strip)">
            <Field label="Members" value={form.statsMembers} onChange={(v) => updateField('statsMembers', v)} type="number" />
            <Field label="Runs this month" value={form.statsRunsThisMonth} onChange={(v) => updateField('statsRunsThisMonth', v)} type="number" />
            <Field label="KM this month" value={form.statsKmThisMonth} onChange={(v) => updateField('statsKmThisMonth', v)} type="number" />
            <Field label="Years running" value={form.statsYearsRunning} onChange={(v) => updateField('statsYearsRunning', v)} type="number" />
          </Card>

          <Card title="Admins — 'Led by' (JSON array)">
            <JsonField
              label=""
              value={adminsJson}
              onChange={setAdminsJson}
              hint='[{ "name": "Rahul Khanna", "role": "Founder", "avatarUrl": "...", "instagramUrl": "..." }]'
              rows={12}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── small reusable UI ───────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-jet/10 p-5">
      <h2 className="font-display text-sm font-semibold uppercase text-jet/60 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = 'text',
  placeholder,
  as,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  placeholder?: string;
  as?: 'select';
  options?: { value: string; label: string }[];
}) {
  const cls =
    'w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors';
  return (
    <div>
      {label && (
        <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      )}
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          {options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function JsonField({
  label,
  value,
  onChange,
  hint,
  rows = 8,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rows?: number;
}) {
  let parseError: string | null = null;
  try {
    if (value.trim()) JSON.parse(value);
  } catch (e) {
    parseError = e instanceof Error ? e.message : 'Invalid JSON';
  }
  return (
    <div>
      {label && (
        <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`w-full px-3 py-2 rounded-lg border font-mono text-xs text-jet focus:outline-none transition-colors ${
          parseError ? 'border-red-300 focus:border-red-400' : 'border-jet/10 focus:border-signal/30'
        }`}
      />
      {hint && !parseError && (
        <p className="mt-1 font-body text-xs text-jet/40">{hint}</p>
      )}
      {parseError && (
        <p className="mt-1 font-body text-xs text-red-600">JSON error: {parseError}</p>
      )}
    </div>
  );
}
