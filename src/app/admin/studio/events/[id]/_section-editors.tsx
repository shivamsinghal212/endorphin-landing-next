'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type {
  DistanceCategoryIn,
  OrganiserEvent,
  RegistrationFieldType,
  RegistrationFormField,
} from '@/lib/organiser-api';
import {
  describeOrganiserError,
  useUpdateOrganiserEvent,
} from '@/lib/studio/organiser-hooks';
import {
  TSHIRT_SIZES,
  DEFAULT_REFUND_TEMPLATE,
  DEFAULT_REFUND_TEMPLATE_EXPERIENCE,
  DEFAULT_TERMS_TEMPLATE,
  DEFAULT_TERMS_TEMPLATE_EXPERIENCE,
} from '@/lib/event-defaults';
import {
  ImageGalleryField,
  ImageUploadField,
} from '../../../(super)/clubs/_components/image-upload';
import { PlaceAutocomplete } from '@/components/PlaceAutocomplete';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Field, Sheet, SheetActions, inputCls } from './_sheet';

/** Which section is being edited. Mirrors the composer's vocabulary, not
 *  the old wizard's — no "distances", no "what we collect" as a top-level
 *  concern, and no event-kind/format questions the composer never asks. */
export type SectionId =
  | 'details'
  | 'description'
  | 'tickets'
  | 'schedule'
  | 'policies'
  | 'questions'
  | 'charity';

/** `datetime-local` wants local wall-clock text, not an ISO instant. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function SectionEditor({
  section,
  event,
  onClose,
}: {
  section: SectionId | null;
  event: OrganiserEvent;
  onClose: () => void;
}) {
  const mut = useUpdateOrganiserEvent(event.id);
  const saving = mut.isPending;

  const save = async (patch: Parameters<typeof mut.mutateAsync>[0]) => {
    try {
      await mut.mutateAsync(patch);
      toast.success('Saved');
      onClose();
    } catch (e) {
      toast.error("Couldn't save", { description: describeOrganiserError(e) });
    }
  };

  if (!section) return null;

  const common = { open: true, onClose, busy: saving };

  if (section === 'details') {
    return <DetailsEditor {...common} event={event} onSave={save} />;
  }
  if (section === 'description') {
    return <DescriptionEditor {...common} event={event} onSave={save} />;
  }
  if (section === 'tickets') {
    return <TicketsEditor {...common} event={event} onSave={save} />;
  }
  if (section === 'schedule') {
    return <ScheduleEditor {...common} event={event} onSave={save} />;
  }
  if (section === 'policies') {
    return <PoliciesEditor {...common} event={event} onSave={save} />;
  }
  if (section === 'questions') {
    return <QuestionsEditor {...common} event={event} onSave={save} />;
  }
  return <CharityEditor {...common} event={event} onSave={save} />;
}

type EditorProps = {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  event: OrganiserEvent;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
};

// ── Event details — the composer's top half ───────────────────────────────

function DetailsEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const [title, setTitle] = useState(event.title);
  const [cover, setCover] = useState(event.coverImageUrl ?? '');
  const [gallery, setGallery] = useState<string[]>(event.galleryImages ?? []);
  const [start, setStart] = useState(toLocalInput(event.startTime));
  const [end, setEnd] = useState(toLocalInput(event.endTime));
  const [place, setPlace] = useState(event.locationName ?? '');
  const [address, setAddress] = useState(event.locationAddress ?? '');
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const endBeforeStart =
    !!end && !!start && Date.parse(end) <= Date.parse(start);
  const valid = title.trim().length > 0 && !!start && !endBeforeStart;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Event details"
      title="The"
      accent="essentials."
      intro="Name, cover, when it runs and where people meet."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={!valid}
          onSave={() =>
            onSave({
              title: title.trim(),
              coverImageUrl: cover.trim() || null,
              galleryImages: gallery.length ? gallery : null,
              startTime: toIso(start),
              endTime: toIso(end),
              locationName: place.trim() || null,
              locationAddress: address.trim() || null,
              ...(coords.latitude !== null ? coords : {}),
            })
          }
        />
      }
    >
      <Field label="Event name" htmlFor="d-title" required>
        <input
          id="d-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls(!title.trim())}
        />
      </Field>

      <Field label="Cover image" hint="Wide 16:9 — used on cards and shares.">
        <ImageUploadField
          label=""
          shape="wide"
          value={cover}
          onChange={setCover}
          folder="events/covers"
        />
      </Field>

      <Field label="More photos">
        <ImageGalleryField
          label=""
          urls={gallery}
          onChange={setGallery}
          folder={`events/${event.id}/gallery`}
          hint="Shown as a gallery on the event page. Drag to reorder."
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="d-start" required>
          <input
            id="d-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={inputCls(!start)}
          />
        </Field>
        <Field
          label="Ends"
          htmlFor="d-end"
          error={endBeforeStart ? 'Has to be after it starts.' : null}
        >
          <input
            id="d-end"
            type="datetime-local"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className={inputCls(endBeforeStart)}
          />
        </Field>
      </div>

      <Field label="Meeting point" htmlFor="d-place">
        <PlaceAutocomplete
          id="d-place"
          value={place}
          onChange={(v) => {
            setPlace(v);
            setCoords({ latitude: null, longitude: null });
          }}
          onPick={(p) => {
            setPlace(p.name);
            setAddress(p.address);
            setCoords({ latitude: p.latitude, longitude: p.longitude });
          }}
        />
      </Field>

      <Field label="Address" htmlFor="d-address" hint="Fills in when you pick a place.">
        <input
          id="d-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputCls()}
        />
      </Field>
    </Sheet>
  );
}

// ── Description ───────────────────────────────────────────────────────────

function DescriptionEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const [md, setMd] = useState(event.descriptionMd ?? '');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Description"
      title="What to"
      accent="expect."
      intro="Pace groups, the route, what happens after. Markdown works."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          onSave={() => onSave({ descriptionMd: md.trim() || null })}
        />
      }
    >
      <MarkdownEditor
        value={md}
        onChange={setMd}
        minHeight={280}
        ariaLabel="Event description"
        placeholder="Three pace groups off the promenade at first light…"
      />
    </Sheet>
  );
}

// ── Tickets — "Entry" from the composer, grown up ─────────────────────────

function TicketsEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const [groupBooking, setGroupBooking] = useState(event.allowGroupBooking);
  const [bibPrefix, setBibPrefix] = useState(event.bibPrefix ?? '');
  const [rows, setRows] = useState<DistanceCategoryIn[]>(
    (event.distanceCategories ?? []).map((d) => ({
      id: d.id,
      categoryName: d.categoryName,
      price: d.price ?? 0,
      currency: d.currency ?? 'INR',
      maxParticipants: d.maxParticipants ?? null,
      isActive: d.isActive,
    })),
  );

  const patch = (i: number, p: Partial<DistanceCategoryIn>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const valid =
    rows.length > 0 && rows.every((r) => r.categoryName.trim().length > 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Tickets"
      title="What people"
      accent="pay for."
      intro="One row per ticket. ₹0 is a free ticket — people still register."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={!valid}
          onSave={() =>
            onSave({
              allowGroupBooking: groupBooking,
              bibPrefix: bibPrefix.trim().toUpperCase() || null,
              distanceCategories: rows.map((r) => ({
                ...r,
                categoryName: r.categoryName.trim().slice(0, 20),
              })),
            })
          }
        />
      }
    >
      {rows.map((r, i) => (
        <div
          key={r.id ?? `new-${i}`}
          // Name gets the room — it holds "Half Marathon · 21.1K", while
          // the numeric columns only ever hold a few digits.
          className="grid grid-cols-[1fr_84px_72px_40px] gap-2 items-end"
        >
          <Field label={i === 0 ? 'Name' : ''} htmlFor={`t-name-${i}`}>
            <input
              id={`t-name-${i}`}
              value={r.categoryName}
              maxLength={20}
              onChange={(e) => patch(i, { categoryName: e.target.value })}
              placeholder="Half Marathon"
              className={inputCls(!r.categoryName.trim())}
            />
          </Field>
          <Field label={i === 0 ? 'Price ₹' : ''} htmlFor={`t-price-${i}`}>
            <input
              id={`t-price-${i}`}
              inputMode="numeric"
              // RUPEES — the column is a legacy rupee value that checkout
              // multiplies by 100. Never send paise here.
              value={String(r.price ?? 0)}
              onChange={(e) =>
                patch(i, { price: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })
              }
              className={inputCls()}
            />
          </Field>
          <Field label={i === 0 ? 'Cap' : ''} htmlFor={`t-cap-${i}`}>
            <input
              id={`t-cap-${i}`}
              inputMode="numeric"
              value={r.maxParticipants == null ? '' : String(r.maxParticipants)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                patch(i, { maxParticipants: v ? Number(v) : null });
              }}
              placeholder="∞"
              className={inputCls()}
            />
          </Field>
          <button
            type="button"
            aria-label={`Remove ${r.categoryName || 'this ticket'}`}
            title={
              rows.length === 1
                ? 'An event needs at least one ticket'
                : 'Remove ticket'
            }
            onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            className="h-[42px] w-10 flex items-center justify-center rounded-lg text-jet/35 hover:text-signal hover:bg-signal/5 disabled:opacity-25 disabled:hover:text-jet/35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setRows((r) => [
            ...r,
            {
              categoryName: '',
              price: 0,
              currency: 'INR',
              maxParticipants: null,
              isActive: true,
            },
          ])
        }
        className="self-start text-xs font-medium border-b border-jet/25 pb-px hover:border-jet"
      >
        + Add another ticket
      </button>

      {event.distanceCategories?.some((d) => d.id) && (
        <p className="text-[11px] text-jet/40 leading-relaxed">
          Pricing locks once the first registration comes in.
        </p>
      )}

      <div className="border-t border-jet/[0.07] pt-4 flex flex-col gap-3.5">
        <div className="rounded-xl border border-jet/10 p-3.5">
          <Toggle
            label="Let one person book for several"
            hint="They pay once and enter each guest's name and email. Normal for a club run; turn it off to force one ticket per account."
            checked={groupBooking}
            onChange={setGroupBooking}
          />
        </div>

        <Field
          label="Bib prefix"
          htmlFor="t-bib"
          hint="Bibs are numbered from this — e.g. MHM-0001. Letters and digits, up to 8. Defaults to END."
        >
          <input
            id="t-bib"
            value={bibPrefix}
            maxLength={8}
            onChange={(e) =>
              setBibPrefix(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
              )
            }
            placeholder="END"
            className={`${inputCls()} font-mono tracking-wide sm:w-40`}
          />
        </Field>
      </div>
    </Sheet>
  );
}

// ── Opening schedule ──────────────────────────────────────────────────────

/** Optional: hold registrations back until a set moment.
 *
 *  This used to be two required fields (open + close) and it was the only
 *  required row with no counterpart in the composer. In practice nobody
 *  maintained the close date — three live events sat months past theirs
 *  still taking signups — so the sensible default is "open from now until
 *  the event starts", with the pause switch for stopping early.
 *
 *  What a switch genuinely can't do is open at 10am on a Monday without
 *  someone being awake to flip it, so that one capability stays.
 */
function ScheduleEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const initialOpen = toLocalInput(event.registrationOpenAt);
  const [openAt, setOpenAt] = useState(initialOpen);

  const eventStart = Date.parse(event.startTime);
  const eventStartLocal = toLocalInput(event.startTime);
  const now = Date.now();

  // "Not in the past" only bites on a value actually changed — an event
  // whose registration opened last week has a legitimately past date.
  const openError =
    openAt && openAt !== initialOpen && Date.parse(openAt) < now
      ? 'That time has already passed.'
      : openAt && Number.isFinite(eventStart) && Date.parse(openAt) > eventStart
        ? 'Has to be before the event starts.'
        : null;

  const hasCloseDate = !!event.registrationCloseAt;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Optional"
      title="Hold signups until"
      accent="a set time?"
      intro="By default registration is open from now until the event starts. Set a time here if you want everyone to arrive at once."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={!!openError}
          saveLabel={openAt ? 'Save' : 'Open immediately'}
          onSave={() => onSave({ registrationOpenAt: toIso(openAt) })}
        />
      }
    >
      <Field
        label="Registration opens"
        htmlFor="s-open"
        hint="Leave blank to open as soon as the event is live."
        error={openError}
      >
        <input
          id="s-open"
          type="datetime-local"
          value={openAt}
          min={
            initialOpen && Date.parse(initialOpen) < now
              ? undefined
              : toLocalInput(new Date(now).toISOString())
          }
          max={eventStartLocal || undefined}
          onChange={(e) => setOpenAt(e.target.value)}
          className={inputCls(!!openError)}
        />
      </Field>

      {/* A close date is no longer something we ask for, but older events
          have one and it still shuts registration off — so it has to be
          visible and removable rather than silently in effect. */}
      {hasCloseDate && (
        <div className="rounded-xl border border-jet/10 bg-jet/[0.02] p-3.5 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[13px] font-medium">
              Closes {fmtWhen(event.registrationCloseAt)}
            </p>
            <p className="text-[11px] text-jet/45 leading-relaxed mt-px">
              Set on an older version of this form. Registration stops then,
              regardless of the pause switch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSave({ registrationCloseAt: null })}
            disabled={busy}
            className="text-xs text-signal border-b border-signal/40 pb-px hover:border-signal disabled:opacity-40 whitespace-nowrap"
          >
            Remove
          </button>
        </div>
      )}
    </Sheet>
  );
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Policies ──────────────────────────────────────────────────────────────

function PoliciesEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const isExperience = event.category === 'experience';
  const [refund, setRefund] = useState(event.refundPolicyMd ?? '');
  const [terms, setTerms] = useState(event.termsMd ?? '');
  const [autoRefund, setAutoRefund] = useState(event.autoRefundOnCancel);
  const [deadlineDays, setDeadlineDays] = useState(
    event.refundDeadlineDays == null ? '' : String(event.refundDeadlineDays),
  );

  // Start from the template rather than a blank box — reviewing beats
  // authoring, and these are the same defaults the old wizard offered.
  useEffect(() => {
    if (!open) return;
    setRefund(
      event.refundPolicyMd?.trim() ||
        (isExperience
          ? DEFAULT_REFUND_TEMPLATE_EXPERIENCE
          : DEFAULT_REFUND_TEMPLATE),
    );
    setTerms(
      event.termsMd?.trim() ||
        (isExperience ? DEFAULT_TERMS_TEMPLATE_EXPERIENCE : DEFAULT_TERMS_TEMPLATE),
    );
  }, [open, event.refundPolicyMd, event.termsMd, isExperience]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Policies"
      title="Refunds and"
      accent="terms."
      intro="Drafted for you — read them over and fix anything in braces."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={!refund.trim() || !terms.trim()}
          onSave={() =>
            onSave({
              refundPolicyMd: refund.trim(),
              termsMd: terms.trim(),
              autoRefundOnCancel: autoRefund,
              refundDeadlineDays: deadlineDays ? Number(deadlineDays) : null,
            })
          }
        />
      }
    >
      <Field label="Refund policy" required>
        <MarkdownEditor
          value={refund}
          onChange={setRefund}
          minHeight={220}
          ariaLabel="Refund policy"
        />
      </Field>
      <Field label="Terms" required>
        <MarkdownEditor
          value={terms}
          onChange={setTerms}
          minHeight={220}
          ariaLabel="Terms"
        />
      </Field>

      {/* The prose above is what runners read; these two are what the
          system actually does, so they belong next to it rather than in a
          settings screen nobody opens. */}
      <div className="border-t border-jet/[0.07] pt-4 flex flex-col gap-3.5">
        <div className="rounded-xl border border-jet/10 p-3.5">
          <Toggle
            label="Refund automatically if you cancel"
            hint="If you cancel the event, everyone is refunded in full without you doing anything."
            checked={autoRefund}
            onChange={setAutoRefund}
          />
        </div>

        <Field
          label="Self-cancel window (days)"
          htmlFor="p-deadline"
          hint="How many days before the event a runner can still cancel themselves. Blank = they can't."
        >
          <input
            id="p-deadline"
            inputMode="numeric"
            value={deadlineDays}
            onChange={(e) =>
              setDeadlineDays(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))
            }
            placeholder="10"
            className={`${inputCls()} sm:w-32`}
          />
        </Field>
      </div>
    </Sheet>
  );
}


// ── Registration questions ────────────────────────────────────────────────

/** The backend caps `registration_form` at 15 entries. */
const MAX_QUESTIONS = 15;

const QUESTION_TYPES: { value: RegistrationFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Pick one' },
  { value: 'multi_select', label: 'Pick many' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

const needsOptions = (t: RegistrationFieldType) =>
  t === 'select' || t === 'multi_select';

/** Stable, backend-legal id derived from the label (`^[a-z0-9_]+$`).
 *  Ids are only minted for new rows — an existing one is never rewritten,
 *  because answers already submitted are keyed on it. */
function makeId(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'question';
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}_${n++}`;
  taken.add(id);
  return id;
}

function QuestionsEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const [rows, setRows] = useState<RegistrationFormField[]>(
    () => event.registrationForm ?? [],
  );
  // The platform's built-in fields live here rather than under
  // "Registration" — from the organiser's point of view these are the same
  // decision as the custom questions: what each runner gets asked.
  const [collectDob, setCollectDob] = useState(event.collectDob);
  const [collectGender, setCollectGender] = useState(event.collectGender);
  const [collectPhone, setCollectPhone] = useState(event.collectPhone);
  const [collectTshirt, setCollectTshirt] = useState(event.collectTshirt);
  const [collectAddress, setCollectAddress] = useState(event.collectAddress);
  const [sizes, setSizes] = useState<string[]>(event.tshirtSizes ?? []);

  const patch = (i: number, p: Partial<RegistrationFormField>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const invalid =
    (collectTshirt && sizes.length === 0) ||
    rows.some(
    (r) =>
      !r.label.trim() ||
      (needsOptions(r.type) && !(r.options ?? []).some((o) => o.trim())),
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Registration questions"
      title="What each runner"
      accent="gets asked."
      intro="Some details we always collect. Everything below that is up to you."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={invalid}
          saveLabel={rows.length ? 'Save questions' : 'Save'}
          onSave={() => {
            const taken = new Set(rows.map((r) => r.id).filter(Boolean));
            onSave({
              collectDob,
              collectGender,
              collectPhone,
              collectTshirt,
              tshirtSizes: collectTshirt && sizes.length ? sizes : null,
              collectAddress,
              registrationForm: rows.length
                ? rows.map((r) => ({
                    ...r,
                    id: r.id || makeId(r.label, taken),
                    label: r.label.trim(),
                    options: needsOptions(r.type)
                      ? (r.options ?? []).map((o) => o.trim()).filter(Boolean)
                      : null,
                  }))
                : null,
            });
          }}
        />
      }
    >
      <div className="rounded-xl border border-jet/10 p-3.5 flex flex-col gap-2.5">
        <p className="text-[11px] uppercase tracking-wider text-jet/50">
          Standard details
        </p>

        {/* Name and email come from the account itself, so there's nothing
            to decide about them. Everything else is the organiser's call. */}
        <AlwaysRow label="Name" />
        <AlwaysRow label="Email" />

        <div className="h-px bg-jet/[0.07] my-0.5" />

        <Toggle
          label="Phone number"
          checked={collectPhone}
          onChange={setCollectPhone}
        />
        <Toggle label="Date of birth" checked={collectDob} onChange={setCollectDob} />
        <Toggle label="Gender" checked={collectGender} onChange={setCollectGender} />
        <Toggle
          label="T-shirt size"
          checked={collectTshirt}
          onChange={setCollectTshirt}
        />
        {/* Asking for a size without offering any is a dead field, so the
            options come with the toggle rather than living elsewhere. */}
        {collectTshirt && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {TSHIRT_SIZES.map((sz) => {
              const on = sizes.includes(sz);
              return (
                <button
                  key={sz}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSizes((cur) =>
                      on ? cur.filter((x) => x !== sz) : [...cur, sz],
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    on
                      ? 'bg-jet text-bone'
                      : 'border border-jet/15 text-jet/55 hover:border-jet/35'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        )}
        {collectTshirt && sizes.length === 0 && (
          <p role="alert" className="text-[11px] text-signal">
            Pick at least one size.
          </p>
        )}
        <Toggle
          label="Postal address"
          hint="Needed if you're shipping anything."
          checked={collectAddress}
          onChange={setCollectAddress}
        />
      </div>

      <p className="text-[11px] uppercase tracking-wider text-jet/50">
        Your own questions
      </p>

      {rows.length === 0 && (
        <p className="text-[13px] text-jet/45 leading-relaxed -mt-1">
          None yet — only the standard details above will be asked.
        </p>
      )}

      {rows.map((r, i) => (
        <div
          key={r.id || `new-${i}`}
          className="rounded-xl border border-jet/10 p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-start gap-2">
            <input
              value={r.label}
              maxLength={200}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder="T-shirt size"
              aria-label={`Question ${i + 1}`}
              className={inputCls(!r.label.trim())}
            />
            <button
              type="button"
              aria-label={`Remove ${r.label || `question ${i + 1}`}`}
              title="Remove question"
              onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}
              className="h-[42px] w-10 flex-shrink-0 flex items-center justify-center rounded-lg text-jet/35 hover:text-signal hover:bg-signal/5 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={r.type}
              aria-label={`Answer type for ${r.label || `question ${i + 1}`}`}
              onChange={(e) => {
                const type = e.target.value as RegistrationFieldType;
                patch(i, {
                  type,
                  options: needsOptions(type) ? (r.options ?? ['']) : null,
                });
              }}
              className="px-3 py-2 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-jet/60 cursor-pointer">
              <input
                type="checkbox"
                checked={r.required}
                onChange={(e) => patch(i, { required: e.target.checked })}
                className="w-4 h-4 accent-[#E6232A]"
              />
              Required
            </label>
          </div>

          {needsOptions(r.type) && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-wider text-jet/50">
                Choices
              </p>
              {(r.options ?? ['']).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    value={opt}
                    aria-label={`Choice ${oi + 1}`}
                    onChange={(e) => {
                      const next = [...(r.options ?? [''])];
                      next[oi] = e.target.value;
                      patch(i, { options: next });
                    }}
                    placeholder={`Choice ${oi + 1}`}
                    className="w-full px-3 py-1.5 rounded-lg border border-jet/10 text-sm bg-white focus:border-jet outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Remove choice ${oi + 1}`}
                    onClick={() =>
                      patch(i, {
                        options: (r.options ?? []).filter((_, x) => x !== oi),
                      })
                    }
                    disabled={(r.options ?? []).length <= 1}
                    className="text-xs text-jet/35 hover:text-signal px-1 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch(i, { options: [...(r.options ?? []), ''] })}
                className="self-start text-[11px] text-jet/55 border-b border-jet/20 pb-px hover:text-jet"
              >
                + Add choice
              </button>
            </div>
          )}
        </div>
      ))}

      {rows.length < MAX_QUESTIONS ? (
        <button
          type="button"
          onClick={() =>
            setRows((r) => [
              ...r,
              { id: '', label: '', type: 'text', required: false, options: null },
            ])
          }
          className="self-start text-xs font-medium border-b border-jet/25 pb-px hover:border-jet"
        >
          + Add question
        </button>
      ) : (
        <p className="text-[11px] text-jet/40">
          {MAX_QUESTIONS} is the maximum.
        </p>
      )}
    </Sheet>
  );
}

// ── Charity ───────────────────────────────────────────────────────────────

function CharityEditor({ open, onClose, busy, event, onSave }: EditorProps) {
  const [name, setName] = useState(event.ngoName ?? '');
  const [url, setUrl] = useState(event.ngoUrl ?? '');
  const [percent, setPercent] = useState(
    event.donationPercent == null ? '' : String(event.donationPercent),
  );
  const pct = Number(percent);
  const pctInvalid = !!percent && (pct < 1 || pct > 100);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={busy}
      eyebrow="Optional"
      title="Running for"
      accent="a cause?"
      intro="Shown on the event page next to the entry price."
      footer={
        <SheetActions
          onCancel={onClose}
          saving={busy}
          disabled={pctInvalid}
          saveLabel={name.trim() ? 'Save' : 'Remove partner'}
          onSave={() =>
            onSave({
              ngoName: name.trim() || null,
              ngoUrl: url.trim() || null,
              donationPercent: percent ? pct : null,
            })
          }
        />
      }
    >
      <Field label="Charity name" htmlFor="c-name">
        <input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leave blank to remove"
          className={inputCls()}
        />
      </Field>
      <Field label="Website" htmlFor="c-url">
        <input
          id="c-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
          className={inputCls()}
        />
      </Field>
      <Field
        label="Share of each entry (%)"
        htmlFor="c-pct"
        error={pctInvalid ? 'Between 1 and 100.' : null}
      >
        <input
          id="c-pct"
          inputMode="numeric"
          value={percent}
          onChange={(e) => setPercent(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="10"
          className={inputCls(pctInvalid)}
        />
      </Field>
    </Sheet>
  );
}

// ── shared ────────────────────────────────────────────────────────────────

/** A standard field the organiser can't switch off. */
function AlwaysRow({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-jet/70">{label}</p>
        {hint && (
          <p className="text-[11px] text-jet/40 leading-relaxed mt-px">{hint}</p>
        )}
      </div>
      <span className="flex-shrink-0 font-display text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-jet/[0.06] text-jet/45">
        Always
      </span>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="text-[11px] text-jet/40 leading-relaxed mt-px">{hint}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors p-0.5 ${
          checked ? 'bg-signal' : 'bg-jet/20'
        }`}
      >
        <span
          className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}
