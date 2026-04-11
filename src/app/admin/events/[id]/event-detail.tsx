'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getEventDetail, updateEvent, deleteEvent, enrichEvent,
  type AdminEvent,
} from '@/lib/admin-api';
import {
  ArrowLeft, Save, Trash2, Sparkles, RefreshCw, ExternalLink,
} from 'lucide-react';

const DISTANCE_OPTIONS = ['3K', '5K', '10K', '15K', 'HM', 'M', '50K', '65K', '100K', 'Ultra'];

export function EventDetailContent({ eventId }: { eventId: string }) {
  const token = useAdminToken();
  const router = useRouter();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const e = await getEventDetail(token, eventId);
      setEvent(e);
      setForm(e as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEvent(token, eventId, {
        title: form.title,
        description: form.description,
        locationName: form.locationName,
        locationAddress: form.locationAddress,
        startTime: form.startTime,
        endTime: form.endTime,
        imageUrl: form.imageUrl,
        priceMin: form.priceMin,
        currency: form.currency,
        eventType: form.eventType,
        sportsType: form.sportsType,
        isFeatured: form.isFeatured,
        eventStatus: form.eventStatus,
        visibility: form.visibility,
        registrationUrl: form.registrationUrl,
        website: form.website,
        organizerName: form.organizerName,
        venueName: form.venueName,
        distanceCategories: form.distanceCategories,
      });
      setEvent(updated);
      setForm(updated as unknown as Record<string, unknown>);
    } catch (e) {
      setError(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEnrich = async () => {
    if (!token) return;
    setEnriching(true);
    setError(null);
    try {
      const updated = await enrichEvent(token, eventId);
      setEvent(updated);
      setForm(updated as unknown as Record<string, unknown>);
    } catch (e) {
      setError(`Enrich failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirm('Delete this event permanently?')) return;
    await deleteEvent(token, eventId);
    router.push('/admin/events');
  };

  const toggleTag = (tag: string) => {
    const current = (form.distanceCategories as string[]) || [];
    setForm({
      ...form,
      distanceCategories: current.includes(tag)
        ? current.filter((t: string) => t !== tag)
        : [...current, tag],
    });
  };

  const updateField = (key: string, value: unknown) => setForm({ ...form, [key]: value });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
      </div>
    );
  }

  if (!event) return <p className="font-body text-jet/50">Event not found.</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/events" className="p-2 rounded-lg hover:bg-jet/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold uppercase text-jet">{event.title}</h1>
            <p className="font-body text-xs text-jet/40 mt-0.5">
              {event.source} &middot; {event.sourceId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-body font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {enriching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Enrich with AI
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-body font-medium hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 font-body text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — main fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card title="Basic Information">
            <Field label="Title" value={form.title as string} onChange={(v) => updateField('title', v)} />
            <Field label="Description" value={form.description as string} onChange={(v) => updateField('description', v)} textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Time" value={form.startTime as string} onChange={(v) => updateField('startTime', v)} type="datetime-local" />
              <Field label="End Time" value={form.endTime as string} onChange={(v) => updateField('endTime', v)} type="datetime-local" />
            </div>
          </Card>

          {/* Location */}
          <Card title="Location">
            <div className="grid grid-cols-2 gap-4">
              <Field label="City / Name" value={form.locationName as string} onChange={(v) => updateField('locationName', v)} />
              <Field label="Venue" value={form.venueName as string} onChange={(v) => updateField('venueName', v)} />
            </div>
            <Field label="Address" value={form.locationAddress as string} onChange={(v) => updateField('locationAddress', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" value={form.latitude as string} onChange={(v) => updateField('latitude', v ? parseFloat(v) : null)} />
              <Field label="Longitude" value={form.longitude as string} onChange={(v) => updateField('longitude', v ? parseFloat(v) : null)} />
            </div>
          </Card>

          {/* Links */}
          <Card title="Links">
            <Field label="Registration URL" value={form.registrationUrl as string} onChange={(v) => updateField('registrationUrl', v)} />
            <Field label="Website" value={form.website as string} onChange={(v) => updateField('website', v)} />
            <Field label="Image URL" value={form.imageUrl as string} onChange={(v) => updateField('imageUrl', v)} />
          </Card>
        </div>

        {/* Right column — metadata */}
        <div className="space-y-6">
          {/* Preview */}
          {event.imageUrl && (
            <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
              <img src={event.imageUrl} alt={event.title} className="w-full aspect-video object-cover" />
            </div>
          )}

          {/* Distance tags */}
          <Card title="Distance Categories">
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-body font-medium cursor-pointer transition-colors ${
                    ((form.distanceCategories as string[]) || []).includes(tag)
                      ? 'bg-signal text-white'
                      : 'bg-jet/5 text-jet/40 hover:bg-jet/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Card>

          {/* Status & metadata */}
          <Card title="Status & Metadata">
            <div className="space-y-3">
              <div>
                <label className="block font-body text-xs font-medium text-jet/50 mb-1">Status</label>
                <select
                  value={(form.eventStatus as string) || ''}
                  onChange={(e) => updateField('eventStatus', e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm cursor-pointer"
                >
                  <option value="">Active</option>
                  <option value="live">Live</option>
                  <option value="offline">Offline</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (min)" value={form.priceMin as string} onChange={(v) => updateField('priceMin', v ? parseInt(v) : null)} />
                <Field label="Currency" value={form.currency as string} onChange={(v) => updateField('currency', v)} />
              </div>
              <Field label="Organizer" value={form.organizerName as string} onChange={(v) => updateField('organizerName', v)} />
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 font-body text-sm text-jet cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.isFeatured}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Featured
                </label>
              </div>
            </div>
          </Card>

          {/* External links */}
          {event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-jet/10 text-sm font-body text-jet/60 hover:bg-jet/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Original
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-jet/10 p-5">
      <h2 className="font-display text-sm font-semibold uppercase text-jet/60 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, textarea, type = 'text',
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const inputClasses = "w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors";

  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}
    </div>
  );
}
