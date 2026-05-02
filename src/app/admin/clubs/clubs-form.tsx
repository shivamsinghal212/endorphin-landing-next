'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw, Download } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getClub,
  upsertClub,
  AdminApiError,
  type Club,
  type ClubAdminPerson,
} from '@/lib/admin-api';

// ─── form state shape (mirrors ClubIn on the server) ───

type FormState = {
  slug: string;
  name: string;
  city: string;
  establishedYear: string; // stringified for the input; coerced on save
  logoUrl: string;
  headerImageUrl: string;
  kicker: string;
  subtitle: string;
  description: string;
  tags: string[];
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
  logoUrl: '', headerImageUrl: '', kicker: '', subtitle: '', description: '', tags: [],
  isVerified: false, publishedAt: '',
  whatsappUrl: '', instagramUrl: '', stravaUrl: '', joinUrl: '',
  statsMembers: '0', statsRunsThisMonth: '0', statsKmThisMonth: '0', statsYearsRunning: '0',
};

function fromClub(club: Club): {
  form: FormState;
  admins: ClubAdminPerson[];
} {
  return {
    form: {
      slug: club.slug,
      name: club.name,
      city: club.city,
      establishedYear: club.establishedYear?.toString() ?? '',
      logoUrl: club.logoUrl ?? '',
      headerImageUrl: club.headerImageUrl ?? '',
      kicker: club.kicker ?? '',
      subtitle: club.subtitle ?? '',
      description: club.description ?? '',
      tags: club.tags ?? [],
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
    admins: club.admins ?? [],
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
  admins: ClubAdminPerson[],
): Record<string, unknown> {
  const tags = form.tags.map((t) => t.trim()).filter(Boolean);
  const cleanedAdmins = admins
    .map((a) => ({
      name: a.name.trim(),
      role: a.role?.trim() || null,
      avatarUrl: a.avatarUrl?.trim() || null,
      whatsappUrl: a.whatsappUrl?.trim() || null,
      instagramUrl: a.instagramUrl?.trim() || null,
      stravaUrl: a.stravaUrl?.trim() || null,
    }))
    .filter((a) => a.name);

  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    city: form.city.trim(),
    establishedYear: intOrNull(form.establishedYear),
    logoUrl: strOrNull(form.logoUrl),
    headerImageUrl: strOrNull(form.headerImageUrl),
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
    admins: cleanedAdmins,
  };
}

// ─── component ───────────────────────────────────────

export function ClubsAdminContent({ initialSlug }: { initialSlug: string }) {
  const token = useAdminToken();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ ...EMPTY, slug: initialSlug });
  const [admins, setAdmins] = useState<ClubAdminPerson[]>([]);

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
        setAdmins(parts.admins);
        setBanner({ tone: 'ok', msg: `Loaded existing club "${club.name}".` });
      } else {
        setForm({ ...EMPTY, slug: slug.trim() });
        setAdmins([]);
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
      const payload = buildPayload(form, admins);
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
      if (e instanceof AdminApiError) msg = `Save failed: ${e.status} — ${e.message}`;
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
            <ImageUploadField
              label="Header image"
              shape="wide"
              value={form.headerImageUrl}
              onChange={(v) => updateField('headerImageUrl', v)}
              folder={`clubs/${form.slug || 'tmp'}/header`}
              hint="Shown on club cards and the detail hero. Falls back to logo (darkened/zoomed) when empty."
            />
            <ImageUploadField
              label="Logo"
              shape="square"
              value={form.logoUrl}
              onChange={(v) => updateField('logoUrl', v)}
              folder={`clubs/${form.slug || 'tmp'}/logo`}
            />
            <Field label="Kicker" value={form.kicker} onChange={(v) => updateField('kicker', v)} placeholder="Delhi · Training Crew · Est. 2018" />
            <Field label="Subtitle" value={form.subtitle} onChange={(v) => updateField('subtitle', v)} placeholder="Run hard. Finish together." />
            <Field label="Description" value={form.description} onChange={(v) => updateField('description', v)} textarea />
            <TagsField label="Tags" value={form.tags} onChange={(v) => updateField('tags', v)} />
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

          <Card title="Admins — 'Led by'">
            <AdminsEditor admins={admins} onChange={setAdmins} />
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

function ImageUploadField({
  label,
  value,
  onChange,
  shape,
  folder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  shape: 'square' | 'wide';
  folder: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const trimmed = value.trim();

  const previewCls =
    shape === 'wide'
      ? 'w-full aspect-video bg-jet/5 rounded-lg overflow-hidden border border-jet/10 relative'
      : 'w-24 h-24 bg-jet/5 rounded-full overflow-hidden border border-jet/10 relative flex-shrink-0';

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      fd.append('bucket', 'media');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || `upload failed (${res.status})`);
      }
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      <div className={shape === 'wide' ? 'space-y-2' : 'flex items-start gap-3'}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`${previewCls} cursor-pointer hover:border-jet/25 transition-colors`}
          aria-label={`Upload ${label}`}
        >
          {trimmed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trimmed} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-jet/40 text-xs gap-1">
              <span>{uploading ? 'Uploading…' : 'Click to upload'}</span>
              {!uploading && <span className="text-jet/25">JPG · PNG · WebP</span>}
            </div>
          )}
          {uploading && trimmed && (
            <div className="absolute inset-0 bg-bone/70 flex items-center justify-center text-jet text-xs font-body">
              Uploading…
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-jet text-bone text-xs font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {uploading ? 'Uploading…' : trimmed ? 'Replace' : 'Choose file'}
            </button>
            {trimmed && (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={uploading}
                className="font-body text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="font-body text-xs text-jet/50 hover:text-jet hover:underline"
            >
              {showUrlInput ? 'Hide URL' : 'Or paste URL'}
            </button>
          </div>
          {showUrlInput && (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/image.jpg"
              className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
          )}
          {error && <p className="font-body text-xs text-red-600">{error}</p>}
          {hint && !error && <p className="font-body text-xs text-jet/40">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function TagsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...value, t]);
    setDraft('');
  };
  const remove = (t: string) => onChange(value.filter((x) => x !== t));
  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-jet/5 border border-jet/10 font-body text-xs text-jet"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-jet/40 hover:text-red-600 leading-none"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={add}
        placeholder="Type a tag and press Enter"
        className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
      />
    </div>
  );
}

function AdminsEditor({
  admins,
  onChange,
}: {
  admins: ClubAdminPerson[];
  onChange: (v: ClubAdminPerson[]) => void;
}) {
  const update = (i: number, patch: Partial<ClubAdminPerson>) =>
    onChange(admins.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => onChange(admins.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...admins,
      { name: '', role: '', avatarUrl: '', whatsappUrl: '', instagramUrl: '', stravaUrl: '' },
    ]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= admins.length) return;
    const next = [...admins];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  if (admins.length === 0) {
    return (
      <div>
        <p className="font-body text-sm text-jet/50 mb-3">No admins yet.</p>
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
        >
          + Add admin
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {admins.map((a, i) => (
        <div key={i} className="rounded-lg border border-jet/10 p-3 space-y-2 bg-jet/[0.015]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-jet/5 border border-jet/10 flex-shrink-0">
              {a.avatarUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-jet/30 text-[10px]">No photo</div>
              )}
            </div>
            <input
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Full name *"
              className="flex-1 px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === admins.length - 1}
                className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="font-body text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={a.role ?? ''}
              onChange={(e) => update(i, { role: e.target.value })}
              placeholder="Role (e.g. Captain)"
              className="px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
            <input
              value={a.avatarUrl ?? ''}
              onChange={(e) => update(i, { avatarUrl: e.target.value })}
              placeholder="Avatar URL"
              className="px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
            <input
              value={a.whatsappUrl ?? ''}
              onChange={(e) => update(i, { whatsappUrl: e.target.value })}
              placeholder="WhatsApp URL"
              className="px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
            <input
              value={a.instagramUrl ?? ''}
              onChange={(e) => update(i, { instagramUrl: e.target.value })}
              placeholder="Instagram URL"
              className="px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
            <input
              value={a.stravaUrl ?? ''}
              onChange={(e) => update(i, { stravaUrl: e.target.value })}
              placeholder="Strava URL"
              className="col-span-2 px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-body font-medium hover:bg-jet/5 transition-colors cursor-pointer"
      >
        + Add admin
      </button>
    </div>
  );
}
