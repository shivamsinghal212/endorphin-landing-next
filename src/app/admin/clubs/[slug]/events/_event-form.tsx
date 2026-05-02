'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw, Trash2 } from 'lucide-react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  createClubEvent,
  patchClubEvent,
  deleteClubEvent,
  AdminApiError,
  type ClubEvent,
  type ClubEventType,
} from '@/lib/admin-api';
import { Card } from '../../_components/card';
import { CheckboxField, Field } from '../../_components/field';
import { ImageUploadField, ImageGalleryField } from '../../_components/image-upload';

interface EventFormState {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startTime: string; // datetime-local
  endTime: string;
  maxParticipants: string;
  coverImageUrl: string;
  distanceKm: string;
  eventType: ClubEventType;

  hasRecap: boolean;
  recapSummary: string;
  recapShowedUp: string;
  recapPaceGroups: string;
  recapAfter: string;
  recapPhotos: string[];
}

function emptyState(): EventFormState {
  return {
    title: '',
    description: '',
    locationName: '',
    locationAddress: '',
    startTime: '',
    endTime: '',
    maxParticipants: '',
    coverImageUrl: '',
    distanceKm: '',
    eventType: 'club_run',
    hasRecap: false,
    recapSummary: '',
    recapShowedUp: '',
    recapPaceGroups: '',
    recapAfter: '',
    recapPhotos: [],
  };
}

function fromEvent(e: ClubEvent): EventFormState {
  return {
    title: e.title,
    description: e.description ?? '',
    locationName: e.locationName ?? '',
    locationAddress: e.locationAddress ?? '',
    startTime: e.startTime ? e.startTime.slice(0, 16) : '',
    endTime: e.endTime ? e.endTime.slice(0, 16) : '',
    maxParticipants: e.maxParticipants?.toString() ?? '',
    coverImageUrl: e.coverImageUrl ?? '',
    distanceKm: e.distanceKm?.toString() ?? '',
    eventType: e.eventType,
    hasRecap: !!e.recap,
    recapSummary: e.recap?.summary ?? '',
    recapShowedUp: e.recap?.showedUp?.toString() ?? '',
    recapPaceGroups: e.recap?.paceGroups ?? '',
    recapAfter: e.recap?.after ?? '',
    recapPhotos: (e.recap?.photos ?? []).map((p) => p.url),
  };
}

function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildPayload(form: EventFormState): Record<string, unknown> {
  const startIso = toIsoOrNull(form.startTime);
  const recap = form.hasRecap
    ? {
        summary: form.recapSummary.trim() || null,
        showedUp: form.recapShowedUp ? Number(form.recapShowedUp) : null,
        paceGroups: form.recapPaceGroups.trim() || null,
        after: form.recapAfter.trim() || null,
        photos: form.recapPhotos.map((url) => ({
          url,
          captionTitle: null,
          captionMeta: null,
        })),
      }
    : null;
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    locationName: form.locationName.trim() || null,
    locationAddress: form.locationAddress.trim() || null,
    startTime: startIso,
    endTime: toIsoOrNull(form.endTime),
    maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
    coverImageUrl: form.coverImageUrl.trim() || null,
    distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
    eventType: form.eventType,
    recap,
  };
}

export function EventFormContent({
  slug,
  initialEvent,
  isNew,
}: {
  slug: string;
  initialEvent: ClubEvent | null;
  isNew: boolean;
}) {
  const router = useRouter();
  const token = useAdminToken();
  const [form, setForm] = useState<EventFormState>(
    initialEvent ? fromEvent(initialEvent) : emptyState(),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  const update = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSave = !!form.title.trim() && !!form.startTime;
  const eventId = initialEvent?.id;
  const folderBase = `clubs/${slug}/events/${eventId ?? 'new'}`;

  const handleSave = async () => {
    if (!token || !canSave) return;
    setSaving(true);
    setBanner(null);
    try {
      const payload = buildPayload(form);
      if (isNew) {
        const created = await createClubEvent(token, slug, payload);
        setBanner({ tone: 'ok', msg: `Created "${created.title}".` });
        router.push(`/admin/clubs/${encodeURIComponent(slug)}/events/${created.id}`);
      } else if (eventId) {
        const saved = await patchClubEvent(token, slug, eventId, payload);
        setForm(fromEvent(saved));
        setBanner({ tone: 'ok', msg: `Saved "${saved.title}".` });
      }
      // Revalidate club detail since events surface there.
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      }).catch(() => {});
    } catch (e) {
      const msg =
        e instanceof AdminApiError
          ? `Save failed: ${e.status} — ${e.message}`
          : `Save failed: ${(e as Error).message}`;
      setBanner({ tone: 'err', msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !eventId) return;
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteClubEvent(token, slug, eventId);
      router.push(`/admin/clubs/${encodeURIComponent(slug)}/events`);
    } catch (e) {
      const msg =
        e instanceof AdminApiError
          ? `Delete failed: ${e.status} — ${e.message}`
          : `Delete failed: ${(e as Error).message}`;
      setBanner({ tone: 'err', msg });
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/admin/clubs/${encodeURIComponent(slug)}/events`}
            className="p-2 rounded-lg hover:bg-jet/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <h1 className="font-display text-xl font-bold uppercase text-jet truncate">
            {isNew ? 'New event' : form.title || 'Event'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-body font-medium hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create' : 'Save'}
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
          <Card title="Details">
            <Field label="Title *" value={form.title} onChange={(v) => update('title', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-medium text-jet/50 mb-1">Type</label>
                <select
                  value={form.eventType}
                  onChange={(e) => update('eventType', e.target.value as ClubEventType)}
                  className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet focus:outline-none focus:border-signal/30 transition-colors"
                >
                  <option value="club_run">Club run</option>
                  <option value="race_event">Race event</option>
                </select>
              </div>
              <Field
                label="Distance (km)"
                value={form.distanceKm}
                onChange={(v) => update('distanceKm', v.replace(/[^0-9.]/g, ''))}
                placeholder="10"
              />
              <Field
                label="Start time *"
                value={form.startTime}
                onChange={(v) => update('startTime', v)}
                type="datetime-local"
              />
              <Field
                label="End time"
                value={form.endTime}
                onChange={(v) => update('endTime', v)}
                type="datetime-local"
              />
              <Field
                label="Max participants"
                value={form.maxParticipants}
                onChange={(v) => update('maxParticipants', v.replace(/[^0-9]/g, ''))}
                placeholder="Optional"
              />
            </div>
            <Field
              label="Description"
              value={form.description}
              onChange={(v) => update('description', v)}
              textarea
              rows={4}
            />
          </Card>

          <Card title="Location">
            <Field
              label="Location name"
              value={form.locationName}
              onChange={(v) => update('locationName', v)}
              placeholder="Lodhi Garden"
            />
            <Field
              label="Address"
              value={form.locationAddress}
              onChange={(v) => update('locationAddress', v)}
              placeholder="Lodhi Estate, New Delhi"
            />
          </Card>

          <Card title="Recap (post-event)">
            <CheckboxField
              label="This event has a recap"
              checked={form.hasRecap}
              onChange={(v) => update('hasRecap', v)}
              hint="Toggle on after the run to add summary, attendance, photos."
            />
            {form.hasRecap && (
              <>
                <Field
                  label="Summary"
                  value={form.recapSummary}
                  onChange={(v) => update('recapSummary', v)}
                  textarea
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Showed up"
                    value={form.recapShowedUp}
                    onChange={(v) => update('recapShowedUp', v.replace(/[^0-9]/g, ''))}
                    placeholder="36"
                  />
                  <Field
                    label="Pace groups"
                    value={form.recapPaceGroups}
                    onChange={(v) => update('recapPaceGroups', v)}
                    placeholder="5:00 / 5:30 / 6:00"
                  />
                </div>
                <Field
                  label="After"
                  value={form.recapAfter}
                  onChange={(v) => update('recapAfter', v)}
                  placeholder="Coffee at Blue Tokai"
                />
                <ImageGalleryField
                  label="Recap photos"
                  urls={form.recapPhotos}
                  onChange={(urls) => update('recapPhotos', urls)}
                  folder={`${folderBase}/recap`}
                  hint="Photos shown on the club detail page reel."
                />
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cover image">
            <ImageUploadField
              label="Cover"
              shape="wide"
              value={form.coverImageUrl}
              onChange={(v) => update('coverImageUrl', v)}
              folder={`${folderBase}/cover`}
              hint="Used in the next-run hero on the club page."
            />
          </Card>
          {!isNew && initialEvent && (
            <Card title="Stats">
              <p className="font-body text-sm">
                <span className="text-jet/50">Going: </span>
                <span className="font-medium tabular-nums">{initialEvent.goingCount}</span>
              </p>
              <p className="font-body text-xs text-jet/50">
                Created {new Date(initialEvent.createdAt).toLocaleString()}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
