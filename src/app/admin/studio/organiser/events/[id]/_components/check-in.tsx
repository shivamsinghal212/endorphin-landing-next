'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SectionCard, PrimaryButton, SecondaryButton, TextInput } from '@/app/admin/studio/_components/form';
import { describeOrganiserError, useCheckIn } from '@/lib/studio/organiser-hooks';
import { checkInLookup } from '@/lib/organiser-api';
import type { OrganiserEvent, RegistrationRow } from '@/lib/organiser-api';
import { useAdminToken } from '@/lib/use-admin-token';
import { runnerInitials } from './_utils';

// `BarcodeDetector` is a native browser API (Chrome/Edge/Android). Not in the
// TS lib yet, and absent on iOS Safari — we feature-detect and fall back to
// manual paste. ponytail: native detector, no scanner dependency; add
// @zxing/browser only if organisers need in-browser camera scan on iOS.
type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

/** Pull the registration id or booking id out of a scanned ticket. The QR
 *  encodes the success-page URL — `?id=<uuid>` (single) or `?booking=<uuid>`
 *  (group). Accepts a full URL or a raw query fragment. */
function parseTicket(
  text: string,
): { registrationId?: string; bookingId?: string } | null {
  const grab = (key: string) => {
    try {
      const v = new URL(text).searchParams.get(key);
      if (v) return v;
    } catch {
      /* not a URL — fall through to regex */
    }
    const m = new RegExp(`[?&]${key}=([0-9a-fA-F-]{36})`).exec(text);
    return m ? m[1] : null;
  };
  const bookingId = grab('booking');
  if (bookingId) return { bookingId };
  const registrationId = grab('id');
  if (registrationId) return { registrationId };
  return null;
}

type Phase = 'idle' | 'scanning' | 'roster';

export function CheckIn({
  eventId,
  event,
}: {
  eventId: string;
  event: OrganiserEvent | null;
}) {
  const token = useAdminToken();
  const checkInMut = useCheckIn(eventId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [roster, setRoster] = useState<RegistrationRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [manual, setManual] = useState('');
  const [looking, setLooking] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cameraSupported =
    typeof window !== 'undefined' &&
    !!window.BarcodeDetector &&
    !!navigator.mediaDevices?.getUserMedia;

  const stopCamera = useCallback(() => {
    if (scanTimer.current) {
      clearInterval(scanTimer.current);
      scanTimer.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const distanceName = useCallback(
    (id: string | null) =>
      event?.distanceCategories?.find((d) => d.id === id)?.categoryName ?? null,
    [event?.distanceCategories],
  );

  const openRoster = useCallback(
    (items: RegistrationRow[]) => {
      setRoster(items);
      // Pre-select everyone not already checked in.
      setSelected(new Set(items.filter((r) => !r.checkedInAt).map((r) => r.id)));
      setPhase('roster');
    },
    [],
  );

  const lookup = useCallback(
    async (by: { registrationId?: string; bookingId?: string }) => {
      if (!token) return;
      setLooking(true);
      try {
        const res = await checkInLookup(token, eventId, by);
        if (res.items.length === 0) {
          toast.error('No attendees found for this ticket');
          return;
        }
        openRoster(res.items);
      } catch (e) {
        toast.error(describeOrganiserError(e));
      } finally {
        setLooking(false);
      }
    },
    [token, eventId, openRoster],
  );

  // Camera scan loop. Starts when phase flips to 'scanning'; tears down on any
  // other phase or unmount.
  useEffect(() => {
    if (phase !== 'scanning' || !cameraSupported) return;
    let cancelled = false;
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        scanTimer.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length === 0) return;
            const parsed = parseTicket(codes[0].rawValue);
            if (!parsed) {
              toast.error('Unrecognised QR — not an Endorfin ticket');
              return;
            }
            stopCamera();
            void lookup(parsed);
          } catch {
            /* transient detect error between frames — ignore */
          }
        }, 400);
      } catch {
        if (!cancelled) {
          toast.error('Camera unavailable — check browser permissions');
          setPhase('idle');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [phase, cameraSupported, lookup, stopCamera]);

  const submit = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      const res = await checkInMut.mutateAsync(ids);
      // Reflect the server's new checkedInAt in the open roster immediately.
      const byId = new Map(res.items.map((r) => [r.id, r]));
      setRoster((prev) => prev.map((r) => byId.get(r.id) ?? r));
      setSelected(new Set());
      toast.success(
        `Checked in ${ids.length} ${ids.length === 1 ? 'attendee' : 'attendees'}`,
      );
    } catch (e) {
      toast.error(describeOrganiserError(e));
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const scanAnother = () => {
    setRoster([]);
    setSelected(new Set());
    setManual('');
    setPhase(cameraSupported ? 'scanning' : 'idle');
  };

  const submitManual = () => {
    const parsed = parseTicket(manual.trim());
    if (!parsed) {
      toast.error('Paste the full ticket link (contains ?id= or ?booking=)');
      return;
    }
    stopCamera();
    void lookup(parsed);
  };

  // ── Roster view ────────────────────────────────────────────────────────────
  if (phase === 'roster') {
    const bookingCode = roster.find((r) => r.bookingCode)?.bookingCode ?? null;
    const pendingCount = roster.filter((r) => !r.checkedInAt).length;
    return (
      <SectionCard
        title={bookingCode ? `Booking ${bookingCode}` : 'Ticket'}
        description={
          roster.length === 1
            ? 'Confirm this attendee to check them in.'
            : `${roster.length} attendees on this booking · ${pendingCount} not yet in`
        }
        rightSlot={
          <SecondaryButton onClick={scanAnother}>Scan another</SecondaryButton>
        }
      >
        <ul className="divide-y divide-jet/5">
          {roster.map((r) => {
            const name = r.attendeeName || r.user?.name || 'Anonymous';
            const dist = distanceName(r.distanceCategoryId);
            const checked = selected.has(r.id);
            const alreadyIn = !!r.checkedInAt;
            return (
              <li key={r.id}>
                <label
                  className={`flex items-center gap-3 py-3 ${alreadyIn ? 'opacity-60' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-signal shrink-0"
                    checked={alreadyIn || checked}
                    disabled={alreadyIn}
                    onChange={() => toggle(r.id)}
                  />
                  <div className="w-8 h-8 rounded-full bg-jet text-bone grid place-items-center text-[11px] font-semibold shrink-0">
                    {runnerInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{name}</p>
                    <p className="text-[11px] text-jet/50 truncate">
                      {[dist, r.bibNumber ? `Bib ${r.bibNumber}` : null]
                        .filter(Boolean)
                        .join(' · ') || (r.attendeeEmail || r.user?.email || '—')}
                    </p>
                  </div>
                  {alreadyIn ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap">
                      Checked in
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
        <div className="pt-3 mt-1 border-t border-jet/5 flex justify-end">
          <PrimaryButton
            onClick={submit}
            disabled={selected.size === 0}
            loading={checkInMut.isPending}
          >
            {selected.size > 0 ? `Check in ${selected.size}` : 'Select attendees'}
          </PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  // ── Scan / idle view ─────────────────────────────────────────────────────────
  return (
    <SectionCard
      title="Check-in"
      description="Scan a runner's ticket QR to mark them present at the venue."
    >
      {phase === 'scanning' ? (
        <div className="space-y-3">
          <div className="relative mx-auto max-w-sm aspect-square rounded-2xl overflow-hidden bg-jet/90">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-8 border-2 border-bone/70 rounded-xl" />
          </div>
          <p className="text-center text-xs text-jet/50">
            {looking ? 'Looking up ticket…' : 'Point the camera at the ticket QR'}
          </p>
          <div className="flex justify-center">
            <SecondaryButton onClick={() => { stopCamera(); setPhase('idle'); }}>
              Stop
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {cameraSupported ? (
            <div className="text-center py-4">
              <PrimaryButton onClick={() => setPhase('scanning')}>
                Start scanning
              </PrimaryButton>
            </div>
          ) : (
            <p className="text-xs text-jet/50 bg-jet/[0.03] rounded-xl p-3">
              Camera scanning isn't supported in this browser (try Chrome on
              Android, or a laptop with a webcam). You can still check people in
              by pasting their ticket link below.
            </p>
          )}

          <div className="border-t border-jet/5 pt-4">
            <p className="text-[11px] uppercase tracking-wider text-jet/45 mb-2">
              Or enter a ticket link
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput
                  value={manual}
                  onChange={setManual}
                  placeholder="Paste the ticket link (…/success?booking=…)"
                />
              </div>
              <SecondaryButton onClick={submitManual} disabled={looking || !manual.trim()}>
                {looking ? 'Looking…' : 'Look up'}
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
