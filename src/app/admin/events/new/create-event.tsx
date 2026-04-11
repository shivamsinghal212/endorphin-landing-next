'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminToken } from '@/lib/use-admin-token';
import { createEvent } from '@/lib/admin-api';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';

const DISTANCE_OPTIONS = ['3K', '5K', '10K', '15K', 'HM', 'M', '50K', '65K', '100K', 'Ultra'];

export function CreateEventContent() {
  const token = useAdminToken();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    locationName: '',
    locationAddress: '',
    imageUrl: '',
    priceMin: '',
    currency: 'INR',
    registrationUrl: '',
    website: '',
    organizerName: '',
    distanceCategories: [] as string[],
  });

  const updateField = (key: string, value: string) => setForm({ ...form, [key]: value });

  const toggleTag = (tag: string) => {
    setForm({
      ...form,
      distanceCategories: form.distanceCategories.includes(tag)
        ? form.distanceCategories.filter((t) => t !== tag)
        : [...form.distanceCategories, tag],
    });
  };

  const handleCreate = async () => {
    if (!token || !form.title || !form.startTime) return;
    setSaving(true);
    try {
      const event = await createEvent(token, {
        ...form,
        priceMin: form.priceMin ? parseInt(form.priceMin) : null,
      });
      router.push(`/admin/events/${event.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/events" className="p-2 rounded-lg hover:bg-jet/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-jet/50" />
          </Link>
          <h1 className="font-display text-xl font-bold uppercase text-jet">Add Race Event</h1>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !form.title || !form.startTime}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Create Event
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information">
            <Field label="Title *" value={form.title} onChange={(v) => updateField('title', v)} />
            <Field label="Description" value={form.description} onChange={(v) => updateField('description', v)} textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Time *" value={form.startTime} onChange={(v) => updateField('startTime', v)} type="datetime-local" />
              <Field label="End Time" value={form.endTime} onChange={(v) => updateField('endTime', v)} type="datetime-local" />
            </div>
          </Card>

          <Card title="Location">
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" value={form.locationName} onChange={(v) => updateField('locationName', v)} />
              <Field label="Organizer" value={form.organizerName} onChange={(v) => updateField('organizerName', v)} />
            </div>
            <Field label="Address" value={form.locationAddress} onChange={(v) => updateField('locationAddress', v)} />
          </Card>

          <Card title="Links & Pricing">
            <Field label="Image URL" value={form.imageUrl} onChange={(v) => updateField('imageUrl', v)} />
            <Field label="Registration URL" value={form.registrationUrl} onChange={(v) => updateField('registrationUrl', v)} />
            <Field label="Website" value={form.website} onChange={(v) => updateField('website', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (min)" value={form.priceMin} onChange={(v) => updateField('priceMin', v)} />
              <Field label="Currency" value={form.currency} onChange={(v) => updateField('currency', v)} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Distance Categories">
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-body font-medium cursor-pointer transition-colors ${
                    form.distanceCategories.includes(tag)
                      ? 'bg-signal text-white'
                      : 'bg-jet/5 text-jet/40 hover:bg-jet/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Card>
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
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; type?: string;
}) {
  const cls = "w-full px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors";
  return (
    <div>
      <label className="block font-body text-xs font-medium text-jet/50 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`${cls} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
