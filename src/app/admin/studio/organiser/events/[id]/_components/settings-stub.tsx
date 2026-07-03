'use client';

import { toast } from 'sonner';
import { SectionCard } from '@/app/admin/studio/_components/form';
import {
  describeOrganiserError,
  useSetOrganiserEventOnline,
} from '@/lib/studio/organiser-hooks';
import type { OrganiserEvent } from '@/lib/organiser-api';

export function Settings({ event }: { event: OrganiserEvent | null }) {
  return (
    <SectionCard
      title="Visibility"
      description="Control whether this event appears in search, on club pages, and everywhere else it's listed publicly."
    >
      {event ? <VisibilityControl event={event} /> : <p className="text-xs text-jet/40">Loading…</p>}
    </SectionCard>
  );
}

// Live ↔ offline toggle. Taking an event offline hides it from every public
// surface (discover search, club "look out for", etc.) without touching
// registrations — the mirror of the backend's live/offline gate.
function VisibilityControl({ event }: { event: OrganiserEvent }) {
  const mut = useSetOrganiserEventOnline(event.id);
  const status = event.eventStatus;

  // Only live/offline events can be toggled. Draft / pending / cancelled /
  // completed have no public listing to hide, so we explain instead.
  if (status !== 'live' && status !== 'offline') {
    return (
      <p className="text-xs text-jet/50">
        This event is <b>{status.replace('_', ' ')}</b>. You can take it offline
        once it&apos;s live.
      </p>
    );
  }

  const isLive = status === 'live';

  const toggle = async () => {
    if (isLive && !window.confirm('Take this event offline? It will disappear from search and club pages until you bring it back. Existing registrations are unaffected.')) {
      return;
    }
    try {
      await mut.mutateAsync(!isLive);
      toast.success(isLive ? 'Event taken offline' : 'Event back online', {
        description: isLive
          ? 'It no longer appears in any public listing.'
          : 'It’s publicly listed again.',
      });
    } catch (err) {
      toast.error('Could not update visibility', { description: describeOrganiserError(err) });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {isLive ? 'This event is live' : 'This event is offline'}
        </p>
        <p className="text-xs text-jet/50 mt-0.5">
          {isLive
            ? 'Visible in search, on club pages, and to anyone with the link.'
            : 'Hidden from all public listings. Only you can see it here.'}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={mut.isPending}
        className={`text-sm px-4 py-2 rounded-lg whitespace-nowrap disabled:opacity-50 ${
          isLive
            ? 'border border-signal/40 text-signal hover:bg-signal/5'
            : 'bg-jet text-bone hover:bg-jet/90'
        }`}
      >
        {mut.isPending ? 'Saving…' : isLive ? 'Take offline' : 'Bring online'}
      </button>
    </div>
  );
}
