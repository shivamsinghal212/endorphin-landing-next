'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  ClubEvent,
  ClubEventRecapPhoto,
  ClubEventRecapVideo,
  ClubEventType,
} from '@/lib/admin-api';
import {
  describeError,
  useCreateClubEvent,
  useDeleteClubEvent,
  usePatchClubEvent,
  useStudioEvents,
} from '@/lib/studio/hooks';
import { StudioTopBar, Skeleton, ErrorState } from '../../../_components/ui';
import {
  FieldLabel,
  PrimaryButton,
  TextArea,
  TextInput,
} from '../../../_components/form';
import {
  ImageGalleryField,
  ImageUploadField,
} from '../../../../(super)/clubs/_components/image-upload';
import { VideoUploadField } from '../../../../(super)/clubs/_components/video-upload';

interface FormState {
  title: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startTime: string;
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
  recapPhotos: ClubEventRecapPhoto[];
  recapVideos: ClubEventRecapVideo[];
}

function emptyState(): FormState {
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
    recapVideos: [],
  };
}

function fromEvent(e: ClubEvent): FormState {
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
    recapPhotos: (e.recap?.photos ?? []).map((p) => ({
      url: p.url,
      captionTitle: p.captionTitle ?? null,
      captionMeta: p.captionMeta ?? null,
    })),
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

function buildPayload(form: FormState) {
  const recap = form.hasRecap
    ? {
        summary: form.recapSummary.trim() || null,
        showedUp: form.recapShowedUp ? Number(form.recapShowedUp) : null,
        paceGroups: form.recapPaceGroups.trim() || null,
        after: form.recapAfter.trim() || null,
        photos: form.recapPhotos
          .filter((p) => p.url)
          .map((p) => ({
            url: p.url,
            captionTitle: p.captionTitle?.trim() || null,
            captionMeta: p.captionMeta?.trim() || null,
          })),
        videos: form.recapVideos
          .filter((v) => v.url)
          .map((v) => ({
            url: v.url,
            posterUrl: v.posterUrl ?? null,
            durationSec: v.durationSec ?? null,
            captionTitle: v.captionTitle?.trim() || null,
            captionMeta: v.captionMeta?.trim() || null,
          })),
      }
    : null;
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    locationName: form.locationName.trim() || null,
    locationAddress: form.locationAddress.trim() || null,
    startTime: toIsoOrNull(form.startTime),
    endTime: toIsoOrNull(form.endTime),
    maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
    coverImageUrl: form.coverImageUrl.trim() || null,
    distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
    eventType: form.eventType,
    recap,
  };
}

const SECTIONS = [
  { id: 'basics', label: 'The basics' },
  { id: 'when-where', label: 'When & where' },
  { id: 'details', label: 'Run details' },
  { id: 'cover', label: 'Cover image' },
  { id: 'recap', label: 'Recap' },
] as const;

export function EventEditor({
  slug,
  clubName,
  eventId,
}: {
  slug: string;
  clubName: string;
  eventId: string | null;
}) {
  const router = useRouter();
  const isNew = eventId === null;

  const eventsQ = useStudioEvents(slug);
  const existing = useMemo(() => {
    if (isNew || !eventsQ.data) return null;
    return eventsQ.data.find((e) => e.id === eventId) ?? null;
  }, [eventsQ.data, eventId, isNew]);

  const [form, setForm] = useState<FormState>(emptyState());
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      setHydrated(true);
      return;
    }
    if (existing) {
      setForm(fromEvent(existing));
      setHydrated(true);
    }
  }, [existing, isNew]);

  const createMut = useCreateClubEvent(slug);
  const patchMut = usePatchClubEvent(slug, eventId ?? '');
  const deleteMut = useDeleteClubEvent(slug);

  const saving = createMut.isPending || patchMut.isPending;
  const deleting = deleteMut.isPending;
  const canSave = form.title.trim().length > 0 && !!form.startTime;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const folderBase = `clubs/${slug}/events/${eventId ?? 'new'}`;

  const handleSave = async () => {
    if (!canSave) return;
    const payload = buildPayload(form);
    try {
      if (isNew) {
        const created = await createMut.mutateAsync(payload);
        toast.success(`Created "${created.title}"`);
        router.push(`/admin/studio/${encodeURIComponent(slug)}/events/${created.id}`);
      } else {
        await patchMut.mutateAsync(payload);
        toast.success('Event saved');
      }
    } catch (e) {
      toast.error('Could not save', { description: describeError(e) });
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    if (!confirm(`Delete "${form.title}"? Members will lose access to RSVPs and recap.`)) return;
    try {
      await deleteMut.mutateAsync(eventId);
      toast.success('Event deleted');
      router.push(`/admin/studio/${encodeURIComponent(slug)}/events`);
    } catch (e) {
      toast.error('Could not delete', { description: describeError(e) });
    }
  };

  const base = `/admin/studio/${encodeURIComponent(slug)}`;
  const eventsHref = `${base}/events`;

  const isPast = form.startTime
    ? Date.parse(form.startTime) < Date.now()
    : false;

  // ─ Loading / error states ─────────────────────────────────────────────
  if (!isNew && eventsQ.isError) {
    return (
      <>
        <StudioTopBar back={{ href: eventsHref, label: 'Events' }} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          <ErrorState
            title="Couldn't load this event"
            message={describeError(eventsQ.error)}
            onRetry={() => eventsQ.refetch()}
          />
        </main>
      </>
    );
  }

  if (!isNew && !hydrated) {
    return (
      <>
        <StudioTopBar back={{ href: eventsHref, label: 'Events' }} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-40 mb-4" />
          <Skeleton className="h-40 mb-4" />
          <Skeleton className="h-40" />
        </main>
      </>
    );
  }

  if (!isNew && hydrated && !existing) {
    return (
      <>
        <StudioTopBar back={{ href: eventsHref, label: 'Events' }} />
        <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          <ErrorState title="Event not found" />
        </main>
      </>
    );
  }

  return (
    <>
      <StudioTopBar
        back={{ href: eventsHref, label: 'Events' }}
        title={
          <p className="font-display uppercase text-base font-bold truncate">
            {isNew ? 'New event' : form.title || 'Event'}
          </p>
        }
        right={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <PrimaryButton
              onClick={handleSave}
              disabled={!canSave}
              loading={saving}
              className="!py-1.5 !text-xs"
            >
              {isNew ? 'Create event' : 'Save'}
            </PrimaryButton>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto md:flex">
        {/* Desktop TOC sidebar */}
        <aside className="hidden md:flex w-52 flex-shrink-0 flex-col border-r border-jet/10 bg-[#F8F6F3]/40 sticky top-[57px] self-start">
          <nav className="p-3 space-y-0.5 text-sm">
            <p className="text-[10px] uppercase tracking-wider text-jet/40 px-2 py-2">
              Jump to
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block px-2.5 py-1.5 rounded-md text-jet/70 hover:bg-jet/5 hover:text-jet"
              >
                {s.label}
                {s.id === 'recap' && (
                  <span className="ml-2 text-[10px] text-jet/40">
                    {isPast ? 'add now' : 'after run'}
                  </span>
                )}
              </a>
            ))}
            <div className="border-t border-jet/10 my-3"></div>
            <p className="text-[10px] uppercase tracking-wider text-jet/40 px-2 py-2">
              Context
            </p>
            <p className="px-2.5 py-1 text-xs text-jet/50">
              For <span className="font-medium text-jet">{clubName}</span>
            </p>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-signal hover:bg-signal/5 text-xs"
              >
                Delete this event
              </button>
            )}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-6 pt-6 md:pt-8 pb-16 md:pb-20">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-1">
              {isNew ? 'New event' : 'Edit event'} · {clubName}
            </p>
            <h1 className="font-display uppercase text-2xl md:text-3xl font-bold tracking-tight">
              {isNew ? 'Schedule a run' : form.title || 'Untitled event'}
            </h1>
          </div>

          {/* Mobile chip strip */}
          <div className="md:hidden overflow-x-auto -mx-4 px-4 mb-4">
            <div className="flex gap-2 whitespace-nowrap">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="px-3 py-1.5 rounded-full bg-white border border-jet/10 text-xs text-jet/70 hover:bg-jet/5"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <FormSection id="basics" title="The basics">
            <div className="mb-3">
              <FieldLabel required>What&apos;s it called</FieldLabel>
              <TextInput
                value={form.title}
                onChange={(v) => update('title', v)}
                placeholder="Sunday long run · 10K"
              />
            </div>
            <div className="mb-3">
              <FieldLabel>Type</FieldLabel>
              <div className="inline-flex rounded-xl bg-white border border-jet/10 p-0.5">
                <button
                  type="button"
                  onClick={() => update('eventType', 'club_run')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    form.eventType === 'club_run'
                      ? 'bg-jet text-bone'
                      : 'text-jet/50 hover:text-jet'
                  }`}
                >
                  Club run
                </button>
                <button
                  type="button"
                  onClick={() => update('eventType', 'race_event')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    form.eventType === 'race_event'
                      ? 'bg-jet text-bone'
                      : 'text-jet/50 hover:text-jet'
                  }`}
                >
                  Race event
                </button>
              </div>
            </div>
            <FieldLabel hint="Pace groups, meeting point, what to bring…">
              Tell folks what to expect
            </FieldLabel>
            <TextArea
              rows={4}
              value={form.description}
              onChange={(v) => update('description', v)}
              placeholder="Three pace groups. Meet at the gazebo. Coffee after."
            />
          </FormSection>

          <FormSection id="when-where" title="When & where">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel required>Starts</FieldLabel>
                <TextInput
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(v) => update('startTime', v)}
                />
              </div>
              <div>
                <FieldLabel hint="Optional">Ends</FieldLabel>
                <TextInput
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(v) => update('endTime', v)}
                />
              </div>
            </div>
            <div className="mb-3">
              <FieldLabel>Place name</FieldLabel>
              <TextInput
                value={form.locationName}
                onChange={(v) => update('locationName', v)}
                placeholder="Bandstand promenade"
              />
            </div>
            <div>
              <FieldLabel hint="Helps maps and share links">Address</FieldLabel>
              <TextInput
                value={form.locationAddress}
                onChange={(v) => update('locationAddress', v)}
                placeholder="Bandstand, Bandra West, Mumbai"
              />
            </div>
          </FormSection>

          <FormSection id="details" title="Run details">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Distance (km)</FieldLabel>
                <TextInput
                  value={form.distanceKm}
                  onChange={(v) => update('distanceKm', v.replace(/[^0-9.]/g, ''))}
                  placeholder="10"
                />
              </div>
              <div>
                <FieldLabel hint="Leave blank for unlimited">
                  Cap on RSVPs
                </FieldLabel>
                <TextInput
                  value={form.maxParticipants}
                  onChange={(v) =>
                    update('maxParticipants', v.replace(/[^0-9]/g, ''))
                  }
                  placeholder="No limit"
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            id="cover"
            title="Cover image"
            description="Used on event cards and the WhatsApp share preview."
          >
            <ImageUploadField
              label="Cover"
              shape="wide"
              value={form.coverImageUrl}
              onChange={(v) => update('coverImageUrl', v)}
              folder={`${folderBase}/cover`}
              hint="Wide aspect — 16:9 looks best."
            />
          </FormSection>

          <FormSection
            id="recap"
            title="Recap"
            description={
              isPast
                ? 'Add it now — members love seeing photos.'
                : 'Fill this in after the run.'
            }
            rightSlot={
              <button
                type="button"
                onClick={() => update('hasRecap', !form.hasRecap)}
                className="text-xs text-signal font-medium hover:underline"
              >
                {form.hasRecap ? 'Hide fields' : 'Show fields'}
              </button>
            }
          >
            {!form.hasRecap ? (
              <div className="text-center text-xs text-jet/50 py-6">
                Click <span className="font-medium">Show fields</span> when
                you&apos;re ready to write it up.
              </div>
            ) : (
              <RecapFields
                form={form}
                update={update}
                folderBase={folderBase}
              />
            )}
          </FormSection>

          {!isNew && (
            <p className="text-[11px] text-jet/40 mt-6">
              Need to remove this event?{' '}
              <button
                onClick={handleDelete}
                className="text-signal hover:underline"
              >
                Delete it
              </button>
              . Members lose access to RSVPs and recap immediately.
            </p>
          )}
        </main>
      </div>
    </>
  );
}

function FormSection({
  id,
  title,
  description,
  rightSlot,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4 scroll-mt-[80px]"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-display uppercase text-sm font-bold">{title}</p>
          {description && (
            <p className="text-xs text-jet/50 mt-0.5">{description}</p>
          )}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function RecapFields({
  form,
  update,
  folderBase,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  folderBase: string;
}) {
  const updatePhoto = (i: number, patch: Partial<ClubEventRecapPhoto>) => {
    update(
      'recapPhotos',
      form.recapPhotos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  };
  const removePhoto = (i: number) =>
    update(
      'recapPhotos',
      form.recapPhotos.filter((_, idx) => idx !== i),
    );

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <FieldLabel>How did it go?</FieldLabel>
          <TextArea
            rows={4}
            value={form.recapSummary}
            onChange={(v) => update('recapSummary', v)}
            placeholder="The kilometre-7 chant, the post-run dosa…"
          />
        </div>
        <div className="space-y-3">
          <div>
            <FieldLabel>How many showed up</FieldLabel>
            <TextInput
              value={form.recapShowedUp}
              onChange={(v) =>
                update('recapShowedUp', v.replace(/[^0-9]/g, ''))
              }
              placeholder="38"
            />
          </div>
          <div>
            <FieldLabel>Pace groups</FieldLabel>
            <TextInput
              value={form.recapPaceGroups}
              onChange={(v) => update('recapPaceGroups', v)}
              placeholder="5:00 / 5:30 / 6:00"
            />
          </div>
          <div>
            <FieldLabel>After the run</FieldLabel>
            <TextInput
              value={form.recapAfter}
              onChange={(v) => update('recapAfter', v)}
              placeholder="Coffee at Blue Tokai"
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display uppercase text-xs font-bold">
            Photos · {form.recapPhotos.length}
          </p>
        </div>
        <ImageGalleryField
          label="Recap photos"
          urls={form.recapPhotos.map((p) => p.url)}
          onChange={(urls) =>
            update(
              'recapPhotos',
              urls.map((url, idx) => {
                const existing = form.recapPhotos[idx];
                return existing && existing.url === url
                  ? existing
                  : { url, captionTitle: null, captionMeta: null };
              }),
            )
          }
          folder={`${folderBase}/recap`}
          hint="Photos appear on the club page reel."
        />
        {form.recapPhotos.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-jet/60 cursor-pointer hover:text-jet">
              Edit captions ({form.recapPhotos.length})
            </summary>
            <div className="mt-2 space-y-2">
              {form.recapPhotos.map((p, i) => (
                <div
                  key={`${p.url}-${i}`}
                  className="flex items-start gap-2 p-2 rounded-lg border border-jet/10 bg-[#F8F6F3]/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={p.captionTitle ?? ''}
                      onChange={(e) =>
                        updatePhoto(i, { captionTitle: e.target.value || null })
                      }
                      placeholder="Caption title (optional)"
                      className="px-2.5 py-1.5 rounded-md border border-jet/10 text-xs bg-white outline-none focus:border-jet"
                    />
                    <input
                      value={p.captionMeta ?? ''}
                      onChange={(e) =>
                        updatePhoto(i, { captionMeta: e.target.value || null })
                      }
                      placeholder="Caption meta (optional)"
                      className="px-2.5 py-1.5 rounded-md border border-jet/10 text-xs bg-white outline-none focus:border-jet"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="text-jet/40 hover:text-signal text-xs px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-display uppercase text-xs font-bold">
            Videos · {form.recapVideos.length}
          </p>
        </div>
        <VideoUploadField
          label="Recap videos"
          videos={form.recapVideos}
          onChange={(videos) => update('recapVideos', videos)}
          folder={`${folderBase}/recap-videos`}
          hint="MP4, MOV, or WebM up to 100 MB."
        />
      </div>
    </>
  );
}
