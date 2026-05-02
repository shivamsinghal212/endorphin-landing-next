'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useAdminToken } from '@/lib/use-admin-token';
import { getClubEvent, AdminApiError, type ClubEvent } from '@/lib/admin-api';
import { EventFormContent } from '../_event-form';

export function EventEditClient({
  slug,
  eventId,
}: {
  slug: string;
  eventId: string;
}) {
  const token = useAdminToken();
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const e = await getClubEvent(token, slug, eventId);
        if (cancelled) return;
        if (!e) {
          setMissing(true);
        } else {
          setEvent(e);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof AdminApiError ? `${err.status} — ${err.message}` : (err as Error).message,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, slug, eventId]);

  if (missing) notFound();
  if (loading) {
    return <p className="font-body text-sm text-jet/50">Loading event…</p>;
  }
  if (error) {
    return (
      <div className="px-4 py-3 rounded-lg text-sm font-body bg-red-50 text-red-800 border border-red-200">
        {error}
      </div>
    );
  }
  if (!event) return null;
  return <EventFormContent slug={slug} initialEvent={event} isNew={false} />;
}
