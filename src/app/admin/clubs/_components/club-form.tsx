'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw, Calendar, Trash2 } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getClub,
  upsertClub,
  setClubFeatured,
  AdminApiError,
  type Club,
  type ClubAdminPerson,
  type JoinFormField,
} from '@/lib/admin-api';
import { Card } from './card';
import { CheckboxField, Field } from './field';
import { ImageUploadField } from './image-upload';
import { TagsField } from './tags-field';
import { AdminsEditor } from './admins-editor';
import { JoinFormEditor } from './join-form-editor';

// ── form state shape (mirrors ClubIn on the server) ───────────────────────

interface FormState {
  slug: string;
  name: string;
  city: string;
  establishedYear: string;
  logoUrl: string;
  headerImageUrl: string;
  kicker: string;
  subtitle: string;
  description: string;
  tags: string[];
  isVerified: boolean;
  isFeatured: boolean;
  publishedAt: string;
  whatsappUrl: string;
  instagramUrl: string;
  stravaUrl: string;
  joinUrl: string;
  requiresApproval: boolean;
  statsMembers: string;
  statsRunsThisMonth: string;
  statsKmThisMonth: string;
  statsYearsRunning: string;
}

const EMPTY: FormState = {
  slug: '',
  name: '',
  city: '',
  establishedYear: '',
  logoUrl: '',
  headerImageUrl: '',
  kicker: '',
  subtitle: '',
  description: '',
  tags: [],
  isVerified: false,
  isFeatured: false,
  publishedAt: '',
  whatsappUrl: '',
  instagramUrl: '',
  stravaUrl: '',
  joinUrl: '',
  requiresApproval: true,
  statsMembers: '0',
  statsRunsThisMonth: '0',
  statsKmThisMonth: '0',
  statsYearsRunning: '0',
};

function fromClub(club: Club): FormState {
  return {
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
    isFeatured: club.isFeatured,
    publishedAt: club.publishedAt ? club.publishedAt.slice(0, 16) : '',
    whatsappUrl: club.whatsappUrl ?? '',
    instagramUrl: club.instagramUrl ?? '',
    stravaUrl: club.stravaUrl ?? '',
    joinUrl: club.joinUrl ?? '',
    requiresApproval: club.requiresApproval,
    statsMembers: String(club.stats?.members ?? 0),
    statsRunsThisMonth: String(club.stats?.runsThisMonth ?? 0),
    statsKmThisMonth: String(club.stats?.kmThisMonth ?? 0),
    statsYearsRunning: String(club.stats?.yearsRunning ?? 0),
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
  joinForm: JoinFormField[],
): Record<string, unknown> {
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

  const cleanedJoinForm = joinForm
    .map((f) => ({
      id: f.id.trim(),
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      options: f.type === 'select' ? f.options ?? null : null,
      placeholder: f.placeholder?.trim() || null,
    }))
    .filter((f) => f.id && f.label);

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
    tags: form.tags.map((t) => t.trim()).filter(Boolean),
    isVerified: form.isVerified,
    isFeatured: form.isFeatured,
    publishedAt: form.publishedAt ? form.publishedAt : null,
    whatsappUrl: strOrNull(form.whatsappUrl),
    instagramUrl: strOrNull(form.instagramUrl),
    stravaUrl: strOrNull(form.stravaUrl),
    joinUrl: strOrNull(form.joinUrl),
    joinForm: cleanedJoinForm.length ? cleanedJoinForm : null,
    requiresApproval: form.requiresApproval,
    stats: {
      members: intOrNull(form.statsMembers) ?? 0,
      runsThisMonth: intOrNull(form.statsRunsThisMonth) ?? 0,
      kmThisMonth: intOrNull(form.statsKmThisMonth) ?? 0,
      yearsRunning: intOrNull(form.statsYearsRunning) ?? 0,
    },
    admins: cleanedAdmins,
  };
}

export function ClubFormContent({
  initialClub,
  isNew,
}: {
  initialClub: Club | null;
  isNew: boolean;
}) {
  const token = useAdminToken();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialClub ? fromClub(initialClub) : EMPTY);
  const [admins, setAdmins] = useState<ClubAdminPerson[]>(initialClub?.admins ?? []);
  const [joinForm, setJoinForm] = useState<JoinFormField[]>(initialClub?.joinForm ?? []);

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  // Hot-reload form when initialClub changes (e.g. router replace after slug rename).
  useEffect(() => {
    if (initialClub) {
      setForm(fromClub(initialClub));
      setAdmins(initialClub.admins ?? []);
      setJoinForm(initialClub.joinForm ?? []);
    }
  }, [initialClub]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSave = !!form.slug.trim() && !!form.name.trim() && !!form.city.trim();

  const handleSave = async () => {
    if (!token || !canSave) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload = buildPayload(form, admins, joinForm);
      const saved = await upsertClub(token, payload);
      // Featured flag is owned by a separate admin endpoint.
      const initialFeatured = initialClub?.isFeatured ?? false;
      if (form.isFeatured !== initialFeatured) {
        try {
          await setClubFeatured(token, saved.slug, form.isFeatured);
        } catch (e) {
          if (e instanceof AdminApiError) {
            setBanner({
              tone: 'err',
              msg: `Saved, but featured toggle failed: ${e.status} — ${e.message}`,
            });
            return;
          }
          throw e;
        }
      }
      // Fire-and-forget revalidation of the public page.
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: saved.slug }),
      }).catch(() => {});
      setBanner({ tone: 'ok', msg: `Saved "${saved.name}".` });
      if (isNew) {
        router.push(`/admin/clubs/${encodeURIComponent(saved.slug)}`);
      } else if (saved.slug !== form.slug) {
        // Slug rename — redirect to new URL.
        router.replace(`/admin/clubs/${encodeURIComponent(saved.slug)}`);
      }
    } catch (e) {
      let msg = 'Save failed.';
      if (e instanceof AdminApiError) msg = `Save failed: ${e.status} — ${e.message}`;
      else if (e instanceof Error) msg = `Save failed: ${e.message}`;
      setBanner({ tone: 'err', msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/admin/clubs" className="p-2 rounded-lg hover:bg-jet/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <h1 className="font-display text-xl font-bold uppercase text-jet truncate">
            {isNew ? 'New club' : form.name || form.slug || 'Club'}
          </h1>
          {!isNew && (
            <Link
              href={`/clubs/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs text-jet/50 hover:text-jet hover:underline"
            >
              View public page ↗
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Link
              href={`/admin/clubs/${encodeURIComponent(form.slug)}/events`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-jet/15 text-jet text-sm font-body font-medium hover:bg-jet/5 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Runs / events
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save club
          </button>
        </div>
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
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basics">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Slug *"
                value={form.slug}
                onChange={(v) =>
                  updateField('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="striders-delhi"
                hint={isNew ? 'Permanent. Use lowercase, hyphens.' : 'Renaming will move the public URL.'}
              />
              <Field label="Name *" value={form.name} onChange={(v) => updateField('name', v)} />
              <Field label="City *" value={form.city} onChange={(v) => updateField('city', v)} />
              <Field
                label="Established year"
                value={form.establishedYear}
                onChange={(v) => updateField('establishedYear', v.replace(/[^0-9]/g, '').slice(0, 4))}
                type="number"
              />
              <Field
                label="Published at"
                value={form.publishedAt}
                onChange={(v) => updateField('publishedAt', v)}
                type="datetime-local"
                hint="Set to publish; clear to unpublish."
              />
              <div className="space-y-2 self-end">
                <CheckboxField
                  label="Verified"
                  checked={form.isVerified}
                  onChange={(v) => updateField('isVerified', v)}
                />
                <CheckboxField
                  label="Featured"
                  checked={form.isFeatured}
                  onChange={(v) => updateField('isFeatured', v)}
                  hint="Pinned at top of /clubs."
                />
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
              hint="Cover image for cards and detail hero. Falls back to logo (darkened/zoomed) when empty."
            />
            <ImageUploadField
              label="Logo"
              shape="square"
              value={form.logoUrl}
              onChange={(v) => updateField('logoUrl', v)}
              folder={`clubs/${form.slug || 'tmp'}/logo`}
            />
            <Field
              label="Kicker"
              value={form.kicker}
              onChange={(v) => updateField('kicker', v)}
              placeholder="Delhi · Training Crew · Est. 2018"
            />
            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(v) => updateField('subtitle', v)}
              placeholder="Run hard. Finish together."
            />
            <Field
              label="Description"
              value={form.description}
              onChange={(v) => updateField('description', v)}
              textarea
              rows={5}
            />
            <TagsField label="Tags" value={form.tags} onChange={(v) => updateField('tags', v)} />
          </Card>

          <Card title="Social links">
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp URL" value={form.whatsappUrl} onChange={(v) => updateField('whatsappUrl', v)} />
              <Field label="Instagram URL" value={form.instagramUrl} onChange={(v) => updateField('instagramUrl', v)} />
              <Field label="Strava URL" value={form.stravaUrl} onChange={(v) => updateField('stravaUrl', v)} />
              <Field label="Join URL (deep link)" value={form.joinUrl} onChange={(v) => updateField('joinUrl', v)} />
            </div>
          </Card>

          <Card title="Join form">
            <CheckboxField
              label="Requires approval"
              checked={form.requiresApproval}
              onChange={(v) => updateField('requiresApproval', v)}
              hint="When on, new members go pending until an admin approves."
            />
            <JoinFormEditor fields={joinForm} onChange={setJoinForm} />
          </Card>
        </div>

        <div className="space-y-6">
          {!isNew && (
            <Card title="Runs / events">
              <p className="font-body text-sm text-jet/70 mb-3">
                Manage upcoming runs, race events, and post-event recaps with photos.
              </p>
              <Link
                href={`/admin/clubs/${encodeURIComponent(form.slug)}/events`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Open events
              </Link>
            </Card>
          )}

          <Card title="Stats (hero strip)">
            <Field
              label="Members"
              value={form.statsMembers}
              onChange={(v) => updateField('statsMembers', v)}
              type="number"
            />
            <Field
              label="Runs this month"
              value={form.statsRunsThisMonth}
              onChange={(v) => updateField('statsRunsThisMonth', v)}
              type="number"
            />
            <Field
              label="KM this month"
              value={form.statsKmThisMonth}
              onChange={(v) => updateField('statsKmThisMonth', v)}
              type="number"
            />
            <Field
              label="Years running"
              value={form.statsYearsRunning}
              onChange={(v) => updateField('statsYearsRunning', v)}
              type="number"
            />
          </Card>

          <Card title="Admins ('Led by')">
            <AdminsEditor admins={admins} onChange={setAdmins} slug={form.slug} />
          </Card>

          {!isNew && (
            <Card title="Danger zone">
              <p className="font-body text-xs text-jet/50">
                Unpublish by clearing the &quot;Published at&quot; field above.
              </p>
              <button
                disabled
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-body opacity-50 cursor-not-allowed"
                title="Use a database tool — clubs are not deletable from the admin UI yet."
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete club (DB only)
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-export getClub so server pages can use it without a separate import.
export { getClub };
