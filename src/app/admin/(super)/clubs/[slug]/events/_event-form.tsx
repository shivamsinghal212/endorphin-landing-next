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
  type ClubEventRecapVideo,
  type ClubEventType,
} from '@/lib/admin-api';
import { Card } from '../../_components/card';
import { CheckboxField, Field } from '../../_components/field';
import { ImageUploadField, ImageGalleryField } from '../../_components/image-upload';
import { TagsField } from '../../_components/tags-field';
import { VideoUploadField } from '../../_components/video-upload';

// Stay in sync with the EventType Literal in
// EndorphinBackend/app/schemas/club_event.py. ``race_event`` is the legacy
// race-import value and stays visible so admins can audit pre-scrape rows;
// the scraper itself only emits the ``club_*`` family.
const EVENT_TYPE_OPTIONS: { value: ClubEventType; label: string }[] = [
  { value: 'club_run', label: 'Club run' },
  { value: 'club_race', label: 'Club race' },
  { value: 'club_workshop', label: 'Workshop' },
  { value: 'club_social', label: 'Social' },
  { value: 'club_meetup', label: 'Meetup' },
  { value: 'club_cross_train', label: 'Cross-train' },
  { value: 'race_event', label: 'Race event (legacy)' },
];

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
  // Scrape-derived; editable here.
  tagline: string;
  secondaryActivities: string[];
  sponsorsSeen: string[];

  hasRecap: boolean;
  recapSummary: string;
  recapShowedUp: string;
  recapPaceGroups: string;
  recapAfter: string;
  recapPhotos: string[];
  recapVideos: ClubEventRecapVideo[];
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
    tagline: '',
    secondaryActivities: [],
    sponsorsSeen: [],
    hasRecap: false,
    recapSummary: '',
    recapShowedUp: '',
    recapPaceGroups: '',
    recapAfter: '',
    recapPhotos: [],
    recapVideos: [],
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
    tagline: e.tagline ?? '',
    secondaryActivities: e.secondaryActivities ?? [],
    sponsorsSeen: e.sponsorsSeen ?? [],
    hasRecap: !!e.recap,
    recapSummary: e.recap?.summary ?? '',
    recapShowedUp: e.recap?.showedUp?.toString() ?? '',
    recapPaceGroups: e.recap?.paceGroups ?? '',
    recapAfter: e.recap?.after ?? '',
    recapPhotos: (e.recap?.photos ?? []).map((p) => p.url),
    recapVideos: (e.recap?.videos ?? []).map((v) => ({
      url: v.url,
      posterUrl: v.posterUrl ?? null,
      durationSec: v.durationSec ?? null,
      captionTitle: v.captionTitle ?? null,
      captionMeta: v.captionMeta ?? null,
    })),
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
        videos: form.recapVideos.map((v) => ({
          url: v.url,
          posterUrl: v.posterUrl ?? null,
          durationSec: v.durationSec ?? null,
          captionTitle: v.captionTitle ?? null,
          captionMeta: v.captionMeta ?? null,
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
    tagline: form.tagline.trim() || null,
    secondaryActivities: form.secondaryActivities.map((t) => t.trim()).filter(Boolean),
    sponsorsSeen: form.sponsorsSeen.map((t) => t.trim()).filter(Boolean),
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
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
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
            <Field
              label="Tagline"
              value={form.tagline}
              onChange={(v) => update('tagline', v)}
              placeholder="RUN & SMASH"
              hint="Short tagline pulled off the flyer by the scraper. Editable."
            />
            <TagsField
              label="Secondary activities"
              value={form.secondaryActivities}
              onChange={(v) => update('secondaryActivities', v)}
            />
            <TagsField
              label="Sponsors seen"
              value={form.sponsorsSeen}
              onChange={(v) => update('sponsorsSeen', v)}
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
                <VideoUploadField
                  label="Recap videos"
                  videos={form.recapVideos}
                  onChange={(videos) => update('recapVideos', videos)}
                  folder={`${folderBase}/recap-videos`}
                  hint="MP4, MOV, or WebM up to 100 MB. Uploads direct to storage."
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

          {!isNew && initialEvent && initialEvent.source === 'instagram_scrape' && (
            <Card title="Instagram scrape">
              {initialEvent.sourcePostUrl && (
                <p className="font-body text-xs text-jet/50">
                  Sourced from{' '}
                  <a
                    href={initialEvent.sourcePostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-jet hover:underline break-all"
                  >
                    {initialEvent.sourcePostUrl.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
              {initialEvent.topComments && initialEvent.topComments.length > 0 && (
                <div className="mt-3">
                  <p className="font-body text-xs font-medium text-jet/50 mb-2">
                    Top comments ({initialEvent.topComments.length})
                  </p>
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {initialEvent.topComments.map((c, i) => (
                      <li
                        key={`${c.user ?? 'anon'}-${i}`}
                        className="rounded-lg border border-jet/10 p-2 font-body text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-jet truncate">
                            @{c.user ?? 'anonymous'}
                          </span>
                          {c.likes > 0 && (
                            <span className="text-jet/40 shrink-0">♥ {c.likes}</span>
                          )}
                        </div>
                        <div className="text-jet/70 break-words">{c.text ?? ''}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-body text-xs text-jet/40">
                    Captured at scrape time; refreshed on next run.
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
