'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import LoginModal from '@/components/LoginModal';
import { useStudioAuth } from '@/lib/studio/auth-context';
import { useMyClubs } from '@/lib/studio/hooks';
import { describeOrganiserError } from '@/lib/studio/organiser-hooks';
import {
  STUDIO_EVENT_DRAFT_KEY,
  createStudioEvent,
  updateOrganiserEvent,
  type StudioEventCreate,
} from '@/lib/organiser-api';
import { uploadFile } from '../admin/(super)/clubs/_components/image-upload';
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete';

/** Everything the composer collects. Persisted to localStorage as-is, so
 *  keep it flat and JSON-safe — it has to survive a full page load when the
 *  visitor signs in. */
interface Draft {
  title: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  /** Set only when a Google Places suggestion is picked; cleared on retype. */
  latitude: number | null;
  longitude: number | null;
  descriptionMd: string;
  coverImageUrl: string;
  isPaid: boolean;
  price: string;
  capacity: string;
  ticketName: string;
  clubId: string | null;
}

function emptyDraft(): Draft {
  return {
    title: '',
    startTime: '',
    endTime: '',
    locationName: '',
    locationAddress: '',
    latitude: null,
    longitude: null,
    descriptionMd: '',
    coverImageUrl: '',
    isPaid: false,
    price: '',
    capacity: '',
    ticketName: '',
    clubId: null,
  };
}

function readDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_EVENT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'title' in parsed) {
      return { ...emptyDraft(), ...parsed } as Draft;
    }
  } catch {
    // Corrupt or unreadable (private mode) — start fresh rather than blow up.
  }
  return null;
}

/** `datetime-local` wants local wall-clock text, not an ISO instant. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** `datetime-local` gives us wall-clock text with no zone. Treating it as
 *  local time is what the user means, and `Date` already parses it that way. */
function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toPayload(d: Draft): StudioEventCreate {
  const start = toIso(d.startTime);
  const priceRupees = d.isPaid ? Number(d.price || 0) : 0;
  return {
    title: d.title.trim(),
    startTime: start!,
    endTime: toIso(d.endTime),
    coverImageUrl: d.coverImageUrl.trim() || null,
    descriptionMd: d.descriptionMd.trim() || null,
    locationName: d.locationName.trim() || null,
    locationAddress: d.locationAddress.trim() || null,
    latitude: d.latitude,
    longitude: d.longitude,
    // RUPEES, not paise. `EventDistanceCategory.price` is a legacy rupee
    // column — `registration_service` does `int(distance.price) * 100` to
    // reach paise at checkout. Sending paise here overcharges by 100×.
    price: Math.round(priceRupees),
    capacity: d.capacity ? Number(d.capacity) : null,
    ticketName:
      d.ticketName.trim().slice(0, 20) || (d.isPaid ? 'Entry' : 'Standard'),
    clubId: d.clubId,
  };
}

export function EventComposer() {
  const router = useRouter();
  const studio = useStudioAuth();
  // The server's answer, not the client's. `useAdminToken` falls back to a
  // NextAuth session when the studio one is null, which is how this page came
  // to show the host picker to someone the header called signed-out.
  const token = studio?.token ?? null;
  const isAuthed = !!token;

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Set when they hit Create while signed out — replays once a token lands. */
  const wantsCreateAfterLogin = useRef(false);
  /** Cover chosen before we had a session, uploaded right after the event
   *  exists. The file lives in a ref so the submit closure always sees the
   *  latest one; the object URL is state because it drives the preview. */
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string | null>(
    null,
  );
  const pendingCoverRef = useRef<File | null>(null);

  const [coverUploading, setCoverUploading] = useState(false);

  /** Same control either way: show the picked file straight away, then
   *  upload it now if we have a session, or hold it for after sign-in if we
   *  don't. A failed immediate upload falls back to the deferred path, so
   *  the image still lands when the event is created. */
  const pickCover = useCallback(
    async (f: File) => {
      setPendingCoverPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
      if (!token) {
        pendingCoverRef.current = f;
        return;
      }
      setCoverUploading(true);
      try {
        const url = await uploadFile(f, 'events/covers');
        pendingCoverRef.current = null;
        setDraft((d) => ({ ...d, coverImageUrl: url }));
      } catch (e) {
        pendingCoverRef.current = f;
        toast.error("Couldn't upload that image", {
          description:
            e instanceof Error ? e.message : 'We’ll retry when you create it.',
        });
      } finally {
        setCoverUploading(false);
      }
    },
    [token],
  );

  const clearCover = useCallback(() => {
    pendingCoverRef.current = null;
    setPendingCoverPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setDraft((d) => ({ ...d, coverImageUrl: '' }));
  }, []);

  // Don't leak the object URL when the page goes away.
  useEffect(
    () => () => {
      if (pendingCoverPreview) URL.revokeObjectURL(pendingCoverPreview);
    },
    [pendingCoverPreview],
  );

  // Computed on mount, not at render: `new Date()` differs between the
  // server and client render and would trip a hydration mismatch.
  const [nowLocal, setNowLocal] = useState('');
  useEffect(() => {
    setNowLocal(toLocalInput(new Date()));
  }, []);

  const clubsQ = useMyClubs('admin');
  const clubs = clubsQ.data ?? [];

  // ── draft persistence ───────────────────────────────────────────────
  useEffect(() => {
    setDraft(readDraft() ?? emptyDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STUDIO_EVENT_DRAFT_KEY,
        JSON.stringify(draft),
      );
    } catch {
      // Quota or private mode — the draft just won't survive a reload.
    }
  }, [draft, hydrated]);

  const set = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    [],
  );

  // `min` on the input stops the picker offering past dates, but a typed or
  // pasted value still gets through in most browsers — so check for real.
  const startInPast =
    !!draft.startTime && Date.parse(draft.startTime) < Date.now();
  const endBeforeStart =
    !!draft.endTime &&
    !!draft.startTime &&
    Date.parse(draft.endTime) <= Date.parse(draft.startTime);

  // "Paid" with an empty price would silently create a ₹0 ticket labelled as
  // paid — worse than either honest option, so require a real number.
  const canCreate =
    draft.title.trim().length > 0 &&
    !!draft.startTime &&
    !startInPast &&
    !endBeforeStart &&
    (!draft.isPaid || Number(draft.price) > 0);

  // ── create ──────────────────────────────────────────────────────────
  const submit = useCallback(
    async (authToken: string, d: Draft) => {
      setSubmitting(true);
      try {
        const created = await createStudioEvent(authToken, toPayload(d));

        // Cover picked before sign-in: now that there's a session, upload it
        // and attach. Failing here must not undo a created event — the
        // checklist asks for a cover anyway, so we tell them and move on.
        const file = pendingCoverRef.current;
        if (file) {
          try {
            const url = await uploadFile(file, 'events/covers');
            await updateOrganiserEvent(authToken, created.id, {
              coverImageUrl: url,
            });
            pendingCoverRef.current = null;
          } catch {
            toast.warning('Event created — but the cover didn’t upload', {
              description: 'Add it again from the checklist.',
            });
          }
        }

        try {
          posthog.capture('event_created', {
            event_id: created.id,
            is_paid: d.isPaid,
            has_club: !!d.clubId,
            source: 'unified_composer',
          });
        } catch {
          // Analytics is never allowed to fail a creation.
        }
        // Only clear the local draft once the server definitely has it.
        try {
          window.localStorage.removeItem(STUDIO_EVENT_DRAFT_KEY);
        } catch {
          /* ignore */
        }
        router.push(`/admin/studio/events/${created.id}`);
      } catch (e) {
        toast.error("Couldn't create your event", {
          description: describeOrganiserError(e),
        });
        setSubmitting(false);
        setFinalizing(false);
      }
    },
    [router],
  );

  const onCreate = () => {
    if (!canCreate || submitting) return;
    if (!token) {
      // The gate lands here, at the commit — not on the way into the page.
      wantsCreateAfterLogin.current = true;
      setLoginOpen(true);
      return;
    }
    void submit(token, draft);
  };

  // Resume the create once sign-in has produced a token. `router.refresh()`
  // in the modal's onSuccess re-renders the layout, which feeds a real
  // StudioAuth into the provider and flips `token` from null.
  useEffect(() => {
    if (!token || !wantsCreateAfterLogin.current) return;
    wantsCreateAfterLogin.current = false;
    setLoginOpen(false);
    void submit(token, draft);
  }, [token, draft, submit]);

  const busy = submitting || finalizing;

  return (
    <>
      {/* StudioTopBar used to render here for signed-in hosts, purely because
          there was otherwise no way back out. The close control provides that
          now, and the bar is a light-themed studio component that would fight
          this dark surface — /admin/studio still uses it, untouched. */}

      {/* Single column, deliberately. Two columns only balance when both
          carry comparable content, which was true for exactly one auth
          state; this way there is no dead space and no layout shift when
          signing in mid-draft. ~680px is also the right measure for eight
          short fields. */}
      {/* pt-3 on mobile: the close button makes this first row 44px tall, so
          the old pt-6 stacked 24px of padding on top of that and left a dead
          band under the nav. Desktop keeps its own spacing below the modal
          header. */}
      <main className="max-w-[680px] mx-auto px-4 md:px-6 pt-3 md:pt-5 pb-16 md:pb-10">
        <div className="flex items-center justify-between mb-2.5 md:mb-4">
          <div className="flex items-center gap-2.5">
            {/* Mobile only — on desktop CreateModalShell's header owns the
                close. Signed out there is no StudioTopBar above either, so
                without this the composer had no way out at all. The draft
                lives in localStorage, so leaving costs nothing and needs no
                confirm. history.length: opened cold in a fresh tab there is
                nothing to go back TO and router.back() would no-op.
                44px hit area, negative margin so the icon still lines up
                with the text below it rather than the padding. */}
            <button
              type="button"
              aria-label="Close and go back"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) router.back();
                else router.push('/');
              }}
              className="grid md:hidden place-items-center -ml-2.5 -my-2.5 w-11 h-11 rounded-full text-bone/68 transition-colors duration-150 hover:text-bone hover:bg-bone/[0.08] active:bg-bone/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone/30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <p className="text-[10px] uppercase tracking-wider text-bone/65">
              New event
            </p>
          </div>
          {hydrated && (draft.title || draft.startTime) && (
            <p className="text-[11px] text-bone/62">
              Draft saved on this device
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <CoverField
            previewUrl={pendingCoverPreview || draft.coverImageUrl || null}
            uploading={coverUploading}
            deferred={!isAuthed}
            onPickFile={pickCover}
            onClear={clearCover}
          />

          {/* A card like every other field. As a bare underlined input with
              a 42px placeholder it read as a faded heading, not something
              you type into. */}
          <section className="cx-field relative rounded-2xl px-4 md:px-[18px] py-3.5">
            <label
              htmlFor="title"
              className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
            >
              Event name <span className="text-[#FF6B6F]">·</span>
            </label>
            <input
              id="title"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Monsoon Half Marathon"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl cx-input text-base font-medium outline-none"
            />
          </section>

          <section className="cx-field relative rounded-2xl p-4 md:p-[18px]">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="start"
                  className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
                >
                  Starts <span className="text-[#FF6B6F]">·</span>
                </label>
                <input
                  id="start"
                  type="datetime-local"
                  value={draft.startTime}
                  min={nowLocal || undefined}
                  onChange={(e) => set('startTime', e.target.value)}
                  aria-invalid={startInPast || undefined}
                  aria-describedby={startInPast ? 'start-err' : undefined}
                  className={`w-full px-3 py-2.5 rounded-xl cx-input text-sm outline-none ${
                    startInPast
                      ? 'border-signal focus:border-signal'
                      : 'border-bone/10 focus:border-bone/40'
                  }`}
                />
                {startInPast && (
                  <p
                    id="start-err"
                    role="alert"
                    className="text-[11px] text-signal mt-1"
                  >
                    That time has already passed — pick a future one.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="end"
                  className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
                >
                  Ends
                </label>
                <input
                  id="end"
                  type="datetime-local"
                  value={draft.endTime}
                  // Can't end before it starts, and can't end in the past
                  // either — whichever bound is later wins.
                  min={draft.startTime || nowLocal || undefined}
                  onChange={(e) => set('endTime', e.target.value)}
                  aria-invalid={endBeforeStart || undefined}
                  aria-describedby={endBeforeStart ? 'end-err' : undefined}
                  className={`w-full px-3 py-2.5 rounded-xl cx-input text-sm outline-none ${
                    endBeforeStart
                      ? 'border-signal focus:border-signal'
                      : 'border-bone/10 focus:border-bone/40'
                  }`}
                />
                {endBeforeStart && (
                  <p
                    id="end-err"
                    role="alert"
                    className="text-[11px] text-signal mt-1"
                  >
                    Has to be after it starts.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="cx-field relative rounded-2xl px-4 md:px-[18px] py-3.5">
            <label
              htmlFor="place"
              className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
            >
              Meeting point
            </label>
            <PlaceAutocomplete
              theme="dark"
              id="place"
              value={draft.locationName}
              onChange={(v) =>
                // Typing by hand invalidates a previously picked pin —
                // stale coordinates are worse than none.
                setDraft((d) => ({
                  ...d,
                  locationName: v,
                  latitude: null,
                  longitude: null,
                }))
              }
              onPick={(p) =>
                setDraft((d) => ({
                  ...d,
                  locationName: p.name,
                  locationAddress: p.address,
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))
              }
            />
            {draft.locationAddress && (
              <p className="text-[11px] text-bone/68 mt-1.5 leading-relaxed">
                {draft.locationAddress}
              </p>
            )}
          </section>

          <section className="cx-field relative rounded-2xl px-4 md:px-[18px] py-3.5">
            <label
              htmlFor="desc"
              className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
            >
              Event description
            </label>
            <textarea
              id="desc"
              rows={3}
              value={draft.descriptionMd}
              onChange={(e) => set('descriptionMd', e.target.value)}
              placeholder="Pace groups, what to bring, coffee after."
              className="w-full px-3 py-2 rounded-xl cx-input text-sm outline-none"
            />
          </section>

          {/* Signed out there is nothing to choose between — one dead
              option and a nudge to sign in is noise on the first screen.
              The club picker returns after creation, in the checklist. */}
          {isAuthed && (
            <section className="cx-field relative rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-wider text-bone/70 mb-2">
                Hosted by
              </p>
              {clubs.length > 0 ? (
                <>
                  <select
                    value={draft.clubId ?? ''}
                    onChange={(e) => set('clubId', e.target.value || null)}
                    aria-label="Who is hosting this event"
                    className="w-full px-3 py-2.5 rounded-xl cx-input text-sm outline-none"
                  >
                    <option value="">
                      Just me{studio?.name ? ` — ${studio.name}` : ''}
                    </option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-bone/65 mt-2 leading-relaxed">
                    {draft.clubId
                      ? 'Shows on the club page and notifies its members.'
                      : 'You can attach a club now or any time after creating it.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full px-3 py-2.5 rounded-xl border border-bone/10 text-sm bg-bone/[0.05] text-bone/68">
                    Just me{studio?.name ? ` — ${studio.name}` : ''}
                  </div>
                  <p className="text-[11px] text-bone/65 mt-2 leading-relaxed">
                    Run a club? Claim it and you can host events as the club.
                  </p>
                </>
              )}
            </section>
          )}

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <p className="text-[10px] uppercase tracking-wider text-bone/65">
              Event options
            </p>
            <p className="text-[11px] text-bone/62">
              More options available post creation.
            </p>
          </div>
          <section className="cx-field relative rounded-2xl overflow-hidden">
            <div className="px-4 md:px-[18px] py-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">Entry</span>
                <div
                  role="radiogroup"
                  aria-label="Entry price"
                  className="inline-flex rounded-xl border border-bone/10 p-0.5"
                >
                  {([false, true] as const).map((paid) => (
                    <button
                      key={String(paid)}
                      type="button"
                      role="radio"
                      aria-checked={draft.isPaid === paid}
                      onClick={() => set('isPaid', paid)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        draft.isPaid === paid
                          ? 'bg-bone text-jet'
                          : 'text-bone/70 hover:text-bone'
                      }`}
                    >
                      {paid ? 'Paid' : 'Free'}
                    </button>
                  ))}
                </div>
              </div>

              {draft.isPaid && (
                <div className="grid sm:grid-cols-[1fr_auto] gap-2.5 items-end mt-3">
                  <div>
                    <label
                      htmlFor="ticket"
                      className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
                    >
                      Ticket name
                    </label>
                    <input
                      id="ticket"
                      value={draft.ticketName}
                      onChange={(e) =>
                        set('ticketName', e.target.value.slice(0, 20))
                      }
                      placeholder="Half Marathon"
                      maxLength={20}
                      className="w-full px-3 py-2 rounded-xl cx-input text-sm outline-none"
                    />
                  </div>
                  <div className="sm:w-40">
                    <label
                      htmlFor="price"
                      className="block text-[11px] uppercase tracking-wider text-bone/70 mb-1"
                    >
                      Price <span className="text-[#FF6B6F]">·</span>
                    </label>
                    <div className="flex items-center px-3 rounded-xl cx-input">
                      <span className="text-sm text-bone/68 pr-1">₹</span>
                      <input
                        id="price"
                        inputMode="numeric"
                        value={draft.price}
                        onChange={(e) =>
                          set('price', e.target.value.replace(/[^0-9]/g, ''))
                        }
                        placeholder="499"
                        className="w-full py-2 text-sm bg-transparent outline-none"
                      />
                    </div>
                  </div>
                  <p className="sm:col-span-2 text-[11px] text-bone/68 leading-relaxed">
                    More tickets, early-bird pricing and coupons come after you
                    create it. We collect the ticket money and settle it with
                    you directly.
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-bone/[0.09] mx-4 md:mx-[18px]" />

            <div className="px-4 md:px-[18px] py-3 flex items-center gap-3">
              <label htmlFor="cap" className="flex-1 text-sm font-medium">
                Capacity
              </label>
              <input
                id="cap"
                inputMode="numeric"
                value={draft.capacity}
                onChange={(e) =>
                  set('capacity', e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Unlimited"
                className="w-36 px-3 py-1.5 rounded-xl cx-input text-sm outline-none text-right tabular-nums"
              />
            </div>
          </section>

          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate || busy}
            className="cx-cta mt-2 h-[52px] rounded-xl text-white text-[15px] font-semibold disabled:text-bone/40 disabled:cursor-not-allowed"
          >
            {busy ? 'Creating…' : 'Create event'}
          </button>
          <p className="text-center text-[11px] text-bone/65">
            Only a name and a start time are needed. Everything else can wait.
          </p>
        </div>
      </main>

      <LoginModal
        open={loginOpen || finalizing}
        onClose={() => {
          if (finalizing) return;
          wantsCreateAfterLogin.current = false;
          setLoginOpen(false);
        }}
        onSuccess={() => {
          // Keep the modal in its loader state while the layout re-renders
          // with a real session — the effect above picks it up from there.
          setFinalizing(true);
          router.refresh();
        }}
        finalizing={finalizing}
        title={
          <>
            One step away to host your{' '}
            <span className="v1lm-red">event.</span>
          </>
        }
        subtitle="Nothing is public yet. Sign in and we'll keep this draft on your account."
      />
    </>
  );
}

/** Cover picker — one control in every state.
 *
 *  It used to swap between a bespoke dropzone (signed out) and
 *  `ImageUploadField` (signed in), which are two different designs for the
 *  same field: the composer visibly restructured itself on login. Now the
 *  chrome is fixed and only the timing of the upload differs, which the
 *  caller owns.
 */
function CoverField({
  previewUrl,
  uploading,
  deferred,
  onPickFile,
  onClear,
}: {
  previewUrl: string | null;
  uploading: boolean;
  /** True when there's no session yet, so the file uploads after creation. */
  deferred: boolean;
  onPickFile: (f: File) => void;
  onClear: () => void;
}) {
  const input = (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPickFile(f);
        // Let the same file be re-picked after a Remove.
        e.target.value = '';
      }}
    />
  );

  if (previewUrl) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-bone/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Cover preview"
          className="w-full aspect-video object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 bg-jet/70">
          <span className="text-[11px] text-bone/80">
            {uploading
              ? 'Uploading…'
              : deferred
                ? 'Uploads when you create the event'
                : 'Wide 16:9 — used on cards and shares'}
          </span>
          <span className="flex items-center gap-3 flex-shrink-0">
            <label className="text-[11px] text-bone/90 border-b border-bone/40 pb-px hover:border-bone cursor-pointer">
              Replace
              {input}
            </label>
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-bone/90 border-b border-bone/40 pb-px hover:border-bone"
            >
              Remove
            </button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <label className="cx-cover w-full h-40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer">
      {input}
      <span className="w-11 h-11 rounded-xl bg-bone/[0.07] flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-bone/68"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </span>
      <span className="text-[13px] font-medium text-bone/70">
        {uploading ? 'Uploading…' : 'Add a cover image'}
      </span>
      <span className="text-[11px] text-bone/65">
        Wide 16:9 — used on cards and WhatsApp previews
      </span>
    </label>
  );
}
