'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { WizardShell, type WizardStep } from '@/components/studio/WizardShell';
import { NOT_READY_MARKER, useAutosave } from '@/components/studio/useAutosave';
import {
  ORGANISER_EVENT_DRAFT_KEY as DRAFT_LOCAL_KEY,
  type OrganiserEvent,
} from '@/lib/organiser-api';
import {
  describeOrganiserError,
  useCreateOrganiserEvent,
  useOrganiserEvent,
  useSubmitEventForReview,
  useUpdateOrganiserEvent,
} from '@/lib/studio/organiser-hooks';
import {
  fromServerEvent,
  isStepId,
  makeEmptyDraft,
  nextStep,
  prevStep,
  STEP_IDS,
  STEP_LABELS,
  stepLabelFor,
  toBackendBody,
  type StepId,
  type WizardDraft,
} from './wizard-state';
import { eventPath } from '@/lib/event-path';
import { StepBasics } from './steps/step-basics';
import { StepDistances } from './steps/step-distances';
import { StepCollect } from './steps/step-collect';
import { StepQuestions } from './steps/step-questions';
import { StepCoupons } from './steps/step-coupons';
import { StepPolicies } from './steps/step-policies';
import { collectIssues, StepReview } from './steps/step-review';

export type WizardMode = 'new' | 'edit';

export function EventWizard({
  mode,
  eventId,
}: {
  mode: WizardMode;
  eventId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Draft state ─────────────────────────────────────────────────────────
  const [draft, setDraft] = useState<WizardDraft>(() => makeEmptyDraft());
  const [hydrated, setHydrated] = useState(mode === 'new');
  const [restorePrompt, setRestorePrompt] = useState<WizardDraft | null>(null);

  // Track whether we've completed the first server save. Until then, the
  // `useUpdateOrganiserEvent` hook receives an empty id and would 404.
  const createMut = useCreateOrganiserEvent();
  const updateMut = useUpdateOrganiserEvent(draft._eventId ?? '');
  const submitMut = useSubmitEventForReview(draft._eventId ?? '');
  const serverEventQ = useOrganiserEvent(mode === 'edit' && eventId ? eventId : null);

  // Hydrate edit mode from server.
  useEffect(() => {
    if (mode !== 'edit') return;
    if (!serverEventQ.data) return;
    setDraft(fromServerEvent(serverEventQ.data));
    setHydrated(true);
  }, [mode, serverEventQ.data]);

  // Hydrate new mode — offer to restore a local draft if one exists.
  const newModeHydratedRef = useRef(false);
  useEffect(() => {
    if (mode !== 'new' || newModeHydratedRef.current) return;
    newModeHydratedRef.current = true;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_LOCAL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WizardDraft;
      if (parsed && typeof parsed === 'object' && 'title' in parsed) {
        setRestorePrompt(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [mode]);

  // ── Step from URL ───────────────────────────────────────────────────────
  const stepParam = searchParams.get('step');
  const currentStepId: StepId = isStepId(stepParam) ? stepParam : 'basics';

  // Keep draft.currentStepId in sync with URL so the local mirror always
  // reflects the active step (the resume-draft banner reads this).
  useEffect(() => {
    if (draft.currentStepId !== currentStepId) {
      setDraft((d) => ({
        ...d,
        currentStepId,
        currentStepLabel: STEP_LABELS[currentStepId],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]);

  const goToStep = useCallback(
    (step: StepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('step', step);
      router.replace(`?${params.toString()}`, { scroll: true });
    },
    [router, searchParams],
  );

  // ── Server save ─────────────────────────────────────────────────────────
  const save = useCallback(
    async (value: WizardDraft) => {
      // Until the backend has the minimum it'll accept (title + slug), we
      // throw a sentinel instead of returning silently. Returning silently
      // lets useAutosave treat the call as a success, which then wipes the
      // localStorage backup and we lose the user's draft.
      if (!value.title.trim() || !value.slug.trim()) {
        throw new Error(NOT_READY_MARKER);
      }
      if (value._eventId) {
        const updated = await updateMut.mutateAsync(toBackendBody(value));
        hydrateServerIds(updated);
      } else {
        const created = await createMut.mutateAsync(toBackendBody(value));
        hydrateServerIds(created);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createMut, updateMut],
  );

  /**
   * Merge the server-assigned ids back into the draft after a save:
   * `_eventId`, plus the real UUID for each distance/ticket that doesn't
   * have one yet (matched by name). Without this the coupon step's
   * "Applies to" sent a temporary id (`tmp-0`) and the backend rejected it
   * as a non-UUID. We only write when something actually changed (returning
   * the same draft reference otherwise) so the merge doesn't retrigger the
   * autosave debounce into a loop, and we only fill *missing* ids so a
   * user's in-flight edits to a row aren't clobbered.
   */
  const hydrateServerIds = useCallback((serverEvent: OrganiserEvent) => {
    setDraft((d) => {
      const idByName = new Map<string, string>();
      for (const sd of serverEvent.distanceCategories ?? []) {
        if (sd.categoryName && sd.id) idByName.set(sd.categoryName, sd.id);
      }
      let changed = d._eventId !== serverEvent.id;
      const distanceCategories = d.distanceCategories.map((dc) => {
        if (dc.id) return dc; // already has a real UUID
        const sid = idByName.get(dc.categoryName);
        if (sid) {
          changed = true;
          return { ...dc, id: sid };
        }
        return dc;
      });
      if (!changed) return d;
      return { ...d, _eventId: serverEvent.id, distanceCategories };
    });
  }, []);

  const { status, lastSavedAt, forceSave, clearLocal } = useAutosave(
    draft,
    save,
    {
      debounceMs: 1500,
      localStorageKey: mode === 'new' ? DRAFT_LOCAL_KEY : undefined,
    },
  );

  // ── Wizard steps for the rail ───────────────────────────────────────────
  const steps: WizardStep[] = useMemo(
    () =>
      STEP_IDS.map((id) => ({
        id,
        label: stepLabelFor(id, draft.category),
        href: hrefFor(id, searchParams),
        isComplete: isStepComplete(id, draft),
      })),
    [draft, searchParams],
  );

  // ── Action handlers ─────────────────────────────────────────────────────
  const onSaveExit = useCallback(async () => {
    const ok = await forceSave();
    if (!ok) {
      toast.error("Couldn't save your changes", {
        description: 'Stay on this page or click Retry on the autosave chip.',
      });
      return;
    }
    router.push('/admin/studio/organiser');
  }, [forceSave, router]);

  const onAutosaveRetry = useCallback(() => {
    void forceSave();
  }, [forceSave]);

  const onContinue = useCallback(async () => {
    if (currentStepId === 'review') return; // review uses Submit
    const next = nextStep(currentStepId);
    if (!next) return;
    // Flush the debounced save before navigating so the current step's
    // changes are durable even if the user closes the tab on the next
    // screen. If the save fails we stay put — navigating would silently
    // drop edits.
    const ok = await forceSave();
    if (!ok) {
      // `draft` is captured fresh because it's in this callback's deps.
      if (!draft.title.trim() || !draft.slug.trim()) {
        toast.error('Add a title and slug to start saving');
      } else {
        toast.error("Couldn't save this step", {
          description: 'Click Retry on the autosave chip, or stay on the page.',
        });
      }
      return;
    }
    goToStep(next);
  }, [currentStepId, draft, forceSave, goToStep]);

  const onBack = currentStepId === 'basics'
    ? undefined
    : () => {
        const p = prevStep(currentStepId);
        if (p) goToStep(p);
      };

  const onSubmit = useCallback(async () => {
    if (!draft._eventId) {
      toast.error('Save the event first', {
        description: 'Step 1 needs a title and slug before we can submit.',
      });
      return;
    }
    try {
      await forceSave();
      await submitMut.mutateAsync();
      clearLocal();
      toast.success('Submitted for review!');
      router.push(`/admin/studio/organiser/events/${draft._eventId}`);
    } catch (e) {
      toast.error('Could not submit', { description: describeOrganiserError(e) });
    }
  }, [draft._eventId, forceSave, submitMut, clearLocal, router]);

  // ── Validation gating for Continue ──────────────────────────────────────
  const continueDisabled = useMemo(
    () => !canAdvance(currentStepId, draft),
    [currentStepId, draft],
  );

  const previewHref =
    draft.slug && draft._eventId
      ? `${eventPath({ category: draft.category, slug: draft.slug, id: draft._eventId })}?preview=1`
      : undefined;

  // ── Render ──────────────────────────────────────────────────────────────
  if (mode === 'edit' && !hydrated) {
    return (
      <div className="min-h-screen bg-bone grid place-items-center">
        <div className="text-sm text-jet/50">Loading event…</div>
      </div>
    );
  }

  if (restorePrompt) {
    return (
      <RestoreDialog
        candidate={restorePrompt}
        onResume={() => {
          setDraft(restorePrompt);
          setRestorePrompt(null);
          setHydrated(true);
          goToStep(
            isStepId(restorePrompt.currentStepId)
              ? restorePrompt.currentStepId
              : 'basics',
          );
        }}
        onDiscard={() => {
          clearLocal();
          setRestorePrompt(null);
          setHydrated(true);
        }}
      />
    );
  }

  const continueLabel = currentStepId === 'review' ? 'Submit for review →' : 'Continue →';

  return (
    <WizardShell
      eventTitle={draft.title || 'Untitled event'}
      steps={steps}
      currentStepId={currentStepId}
      autosaveStatus={status}
      lastSavedAt={lastSavedAt}
      onAutosaveRetry={onAutosaveRetry}
      onBack={onBack}
      onContinue={currentStepId === 'review' ? onSubmit : onContinue}
      onSaveExit={onSaveExit}
      continueDisabled={
        currentStepId === 'review'
          ? collectIssues(draft, null).errors.length > 0 || submitMut.isPending
          : continueDisabled
      }
      continueLabel={continueLabel}
      previewHref={previewHref}
    >
      {renderStep(currentStepId, draft, setDraft, goToStep)}
    </WizardShell>
  );
}

function hrefFor(step: StepId, searchParams: URLSearchParams): string {
  const p = new URLSearchParams(searchParams.toString());
  p.set('step', step);
  return `?${p.toString()}`;
}

function renderStep(
  step: StepId,
  draft: WizardDraft,
  setDraft: (next: WizardDraft) => void,
  goToStep: (step: StepId) => void,
) {
  switch (step) {
    case 'basics':
      return <StepBasics draft={draft} onChange={setDraft} />;
    case 'distances':
      return <StepDistances draft={draft} onChange={setDraft} />;
    case 'collect':
      return <StepCollect draft={draft} onChange={setDraft} />;
    case 'questions':
      return <StepQuestions draft={draft} onChange={setDraft} />;
    case 'coupons':
      return <StepCoupons draft={draft} />;
    case 'policies':
      return <StepPolicies draft={draft} onChange={setDraft} />;
    case 'review':
      return <StepReview draft={draft} onJumpToStep={goToStep} />;
  }
}

function isStepComplete(step: StepId, draft: WizardDraft): boolean {
  const isPhysical = draft.eventFormat === 'in_person';
  switch (step) {
    case 'basics':
      return !!(
        draft.title.trim() &&
        draft.slug.trim() &&
        draft.coverImageUrl &&
        draft.descriptionMd?.trim() &&
        draft.registrationOpenAt &&
        // Virtual events don't require a close date — `acceptingRegistrations`
        // gates new signups instead.
        (isPhysical ? !!draft.registrationCloseAt : true) &&
        draft.resultWindowStart &&
        draft.resultWindowEnd
      );
    case 'distances':
      return draft.distanceCategories.length > 0;
    case 'collect':
      // Defaults are always valid but "completion" only makes sense once
      // the user has interacted — we don't track that, so skip the tick.
      return false;
    case 'questions':
      // Optional — tick once at least one question has been added.
      return (draft.registrationForm?.length ?? 0) > 0;
    case 'coupons':
      // Optional and managed via a separate fetch. No tick from draft alone.
      return false;
    case 'policies':
      return !!(draft.refundPolicyMd?.trim() && draft.termsMd?.trim());
    case 'review':
      return false;
  }
}

function canAdvance(step: StepId, draft: WizardDraft): boolean {
  // Optional steps can always be skipped. Required steps gate on completion.
  if (step === 'questions' || step === 'coupons') return true;
  if (step === 'collect') {
    // Default-valid, but if t-shirts are on we need at least one size picked.
    return !(draft.collectTshirt && !(draft.tshirtSizes?.length));
  }
  return isStepComplete(step, draft);
}

function RestoreDialog({
  candidate,
  onResume,
  onDiscard,
}: {
  candidate: WizardDraft;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const updatedAt = candidate.updatedAt
    ? new Date(candidate.updatedAt)
    : null;
  const ago = updatedAt
    ? relativeMinutes(updatedAt)
    : 'recently';

  return (
    <div className="min-h-screen bg-bone grid place-items-center px-4">
      <div className="max-w-md w-full bg-white border border-jet/10 rounded-2xl p-6 shadow-lg">
        <p className="font-display uppercase text-xl font-bold mb-2">
          Resume your draft?
        </p>
        <p className="text-sm text-jet/60">
          You have an unsaved draft from {ago}
          {candidate.title ? ` for "${candidate.title}"` : ''}. Resume where you
          left off, or start fresh.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5"
          >
            Start fresh
          </button>
          <button
            type="button"
            onClick={onResume}
            className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium"
          >
            Resume →
          </button>
        </div>
      </div>
    </div>
  );
}

function relativeMinutes(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.max(0, Math.round(diff / 60_000));
  if (m < 1) return 'moments ago';
  if (m === 1) return '1 min ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h === 1) return '1 hr ago';
  if (h < 24) return `${h} hrs ago`;
  const days = Math.round(h / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
