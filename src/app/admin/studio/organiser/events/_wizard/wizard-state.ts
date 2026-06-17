/**
 * In-memory draft model for the 7-step event-creation wizard.
 *
 * Shape mirrors `OrganiserEventCreate` so the autosave call can serialise
 * straight onto the backend's `/organiser/events` body. A handful of UI-only
 * fields (`_eventId`, `currentStepId`, `currentStepLabel`, `title` clone,
 * `updatedAt`) live alongside so the localStorage mirror can power the
 * dashboard's Resume-draft banner — see `resume-draft-banner.tsx`, which keys
 * off `title`, `currentStepLabel`, and `updatedAt`.
 */

import type {
  DistanceCategoryIn,
  EventFormat,
  OrganiserEventCreate,
  RegistrationFormField,
} from '@/lib/organiser-api';

export const STEP_IDS = [
  'basics',
  'distances',
  'collect',
  'questions',
  'coupons',
  'policies',
  'review',
] as const;

export type StepId = (typeof STEP_IDS)[number];

export const STEP_LABELS: Record<StepId, string> = {
  basics: 'The basics',
  distances: 'Distances & pricing',
  collect: 'What we collect',
  questions: 'Custom questions',
  coupons: 'Coupons',
  policies: 'Refunds & T&Cs',
  review: 'Review & publish',
};

export function isStepId(s: string | null | undefined): s is StepId {
  return !!s && (STEP_IDS as readonly string[]).includes(s);
}

/** Step label, adapted for non-running events. Experiences sell "tickets",
 *  not "distances". Everything else reads fine generically. */
export function stepLabelFor(s: StepId, category: string | undefined): string {
  if (s === 'distances' && category === 'experience') return 'Tickets & pricing';
  return STEP_LABELS[s];
}

export function nextStep(s: StepId): StepId | null {
  const i = STEP_IDS.indexOf(s);
  if (i < 0 || i >= STEP_IDS.length - 1) return null;
  return STEP_IDS[i + 1];
}

export function prevStep(s: StepId): StepId | null {
  const i = STEP_IDS.indexOf(s);
  if (i <= 0) return null;
  return STEP_IDS[i - 1];
}

/** Default templates inserted by the Step 6 markdown editors when blank. */
export const DEFAULT_REFUND_TEMPLATE = `## Refunds

- **Full refund** if you cancel before {10 days before run window opens}.
- **50% refund** until {5 days before run window opens}.
- **No refund** after that — your medal still ships if you submit a valid run.

If we cancel the event for any reason, we refund **100%** automatically within 7 working days.

Contact us to request a cancellation.`;

export const DEFAULT_TERMS_TEMPLATE = `## Terms

By registering you agree to:

1. Run the full distance you registered for within the run window.
2. Submit a single valid screenshot from Strava, Garmin, Apple Health, or Google Fit.
3. We may **reject** submissions that look edited, look like indoor treadmill runs, or that don't match your registered distance within ±2%.
4. Medals are shipped only to verified finishers, to the address you entered at checkout.`;

/** Experience variants — no run window, no medals, plain ticketed-event language. */
export const DEFAULT_REFUND_TEMPLATE_EXPERIENCE = `## Refunds

- **Full refund** if you cancel up to {7 days before the event}.
- **50% refund** until {2 days before the event}.
- **No refund** after that.

If we cancel the event for any reason, we refund **100%** automatically within 7 working days.

Contact us to request a cancellation.`;

export const DEFAULT_TERMS_TEMPLATE_EXPERIENCE = `## Terms

By booking you agree to:

1. Arrive at the venue on time with a valid ticket (digital is fine).
2. Each ticket admits one guest unless stated otherwise.
3. Follow the organiser's and venue's instructions on the day.
4. Tickets are non-transferable unless the organiser allows it.`;

/** Fixed inclusion vocabulary surfaced by the Step 2 chip picker. */
export const INCLUSION_OPTIONS = [
  'T-shirt',
  'Medal',
  'Bib',
  'Tech tee',
  'Goody bag',
  'Race-day breakfast',
] as const;

export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export type WizardDraft = OrganiserEventCreate & {
  /** UI-only — the event id once the backend has minted one. */
  _eventId?: string | null;
  /** UI-only — last touched step so reload resumes where the user left off. */
  currentStepId: StepId;
  /** UI-only — mirrors STEP_LABELS for the resume-draft banner. */
  currentStepLabel: string;
  /** UI-only — ISO string written on every save so the banner can show "x min ago". */
  updatedAt: string;
};

export function makeEmptyDraft(): WizardDraft {
  return {
    title: '',
    slug: '',
    category: 'running',
    eventFormat: 'virtual',
    coverImageUrl: null,
    galleryImages: null,
    descriptionMd: '',
    refundPolicyMd: '',
    termsMd: '',
    collectDob: true,
    collectGender: true,
    collectTshirt: false,
    tshirtSizes: null,
    collectAddress: false,
    requiresRunProof: false,
    shipsMedal: false,
    locationName: null,
    locationAddress: null,
    registrationOpenAt: null,
    registrationCloseAt: null,
    acceptingRegistrations: true,
    allowGroupBooking: false,
    resultWindowStart: null,
    resultWindowEnd: null,
    bibPrefix: null,
    accentColor: null,
    autoRefundOnCancel: true,
    refundDeadlineDays: 10,
    registrationForm: null,
    distanceCategories: [],
    _eventId: null,
    currentStepId: 'basics',
    currentStepLabel: STEP_LABELS.basics,
    updatedAt: new Date().toISOString(),
  };
}

/** Strip UI-only fields before serialising for the backend. */
export function toBackendBody(draft: WizardDraft): OrganiserEventCreate {
  const {
    _eventId: _e,
    currentStepId: _c,
    currentStepLabel: _l,
    updatedAt: _u,
    ...rest
  } = draft;
  void _e; void _c; void _l; void _u;
  return rest;
}

/** Seed a draft from a server-loaded event (edit mode). */
export function fromServerEvent(
  e: {
    id: string;
    title: string;
    slug: string | null;
    category: string;
    eventFormat: EventFormat;
    coverImageUrl: string | null;
    galleryImages: string[] | null;
    descriptionMd: string | null;
    refundPolicyMd: string | null;
    termsMd: string | null;
    collectDob: boolean;
    collectGender: boolean;
    collectTshirt: boolean;
    tshirtSizes: string[] | null;
    collectAddress: boolean;
    requiresRunProof: boolean;
    shipsMedal: boolean;
    locationName: string | null;
    locationAddress: string | null;
    registrationOpenAt: string | null;
    registrationCloseAt: string | null;
    acceptingRegistrations: boolean;
    allowGroupBooking: boolean;
    resultWindowStart: string | null;
    resultWindowEnd: string | null;
    bibPrefix: string | null;
    accentColor: string | null;
    autoRefundOnCancel: boolean;
    refundDeadlineDays: number | null;
    registrationForm: RegistrationFormField[] | null;
    distanceCategories: Array<{
      id?: string;
      categoryName: string;
      fullTitle: string | null;
      price: number | null;
      currency: string | null;
      inclusions: string[] | null;
      maxParticipants: number | null;
      startTime: string | null;
      isActive: boolean;
    }>;
  },
): WizardDraft {
  const distances: DistanceCategoryIn[] = (e.distanceCategories ?? []).map((d) => ({
    id: d.id,
    categoryName: d.categoryName,
    fullTitle: d.fullTitle ?? null,
    price: d.price ?? 0,
    currency: d.currency ?? 'INR',
    inclusions: d.inclusions ?? null,
    maxParticipants: d.maxParticipants ?? null,
    startTime: d.startTime ?? null,
    isActive: d.isActive,
  }));
  return {
    title: e.title,
    slug: e.slug ?? '',
    category: e.category === 'experience' ? 'experience' : 'running',
    eventFormat: e.eventFormat,
    coverImageUrl: e.coverImageUrl,
    galleryImages: e.galleryImages,
    descriptionMd: e.descriptionMd ?? '',
    refundPolicyMd: e.refundPolicyMd ?? '',
    termsMd: e.termsMd ?? '',
    collectDob: e.collectDob,
    collectGender: e.collectGender,
    collectTshirt: e.collectTshirt,
    tshirtSizes: e.tshirtSizes,
    collectAddress: e.collectAddress,
    requiresRunProof: e.requiresRunProof,
    shipsMedal: e.shipsMedal,
    locationName: e.locationName ?? null,
    locationAddress: e.locationAddress ?? null,
    registrationOpenAt: e.registrationOpenAt,
    registrationCloseAt: e.registrationCloseAt,
    acceptingRegistrations: e.acceptingRegistrations,
    allowGroupBooking: e.allowGroupBooking,
    resultWindowStart: e.resultWindowStart,
    resultWindowEnd: e.resultWindowEnd,
    bibPrefix: e.bibPrefix,
    accentColor: e.accentColor,
    autoRefundOnCancel: e.autoRefundOnCancel,
    refundDeadlineDays: e.refundDeadlineDays,
    registrationForm: e.registrationForm,
    distanceCategories: distances,
    _eventId: e.id,
    currentStepId: 'basics',
    currentStepLabel: STEP_LABELS.basics,
    updatedAt: new Date().toISOString(),
  };
}

// ── Pure mutators ─────────────────────────────────────────────────────────
// We keep these out of components so steps can reuse them without prop drilling.

export function patchDraft(
  draft: WizardDraft,
  patch: Partial<WizardDraft>,
): WizardDraft {
  return {
    ...draft,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

/** Auto-derive a slug from a title using the same rules as `validateSlug`. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

let tmpCounter = 0;
export function makeTempFieldId(): string {
  tmpCounter += 1;
  return `tmp_${Date.now()}_${tmpCounter}`;
}
