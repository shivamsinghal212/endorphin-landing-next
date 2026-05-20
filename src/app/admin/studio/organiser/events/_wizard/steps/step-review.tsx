'use client';

import { useMemo } from 'react';
import {
  validateSlug,
  validateWindowsConsistent,
} from '@/lib/studio/event-validators';
import { useMyOrganiser } from '@/lib/studio/organiser-hooks';
import { STEP_IDS, type StepId, type WizardDraft } from '../wizard-state';

export type ReviewIssue = { message: string; step: StepId };

export function StepReview({
  draft,
  onJumpToStep,
}: {
  draft: WizardDraft;
  onJumpToStep: (step: StepId) => void;
}) {
  const orgQ = useMyOrganiser();
  const { errors, warnings } = useMemo(
    () => collectIssues(draft, orgQ.data?.gstNumber ?? null),
    [draft, orgQ.data?.gstNumber],
  );

  const fmtDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const gallerySlotsEmpty = Math.max(0, 6 - (draft.galleryImages?.length ?? 0));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">
          Review &amp; publish
        </h1>
        <p className="text-sm text-jet/60">
          Last look. You can edit anything after publishing, but pricing
          can&apos;t change once registrations start.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <SummaryCard
            title="Basics"
            onEdit={() => onJumpToStep('basics')}
          >
            <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-[12px]">
              <dt className="text-jet/40">Format</dt>
              <dd className="col-span-2">
                {draft.eventFormat === 'virtual' ? 'Virtual' : 'Physical'}
              </dd>
              <dt className="text-jet/40">Title</dt>
              <dd className="col-span-2">{draft.title || '—'}</dd>
              <dt className="text-jet/40">Slug</dt>
              <dd className="col-span-2">
                {draft.slug ? `/races/${draft.slug}` : '—'}
              </dd>
              <dt className="text-jet/40">Registration</dt>
              <dd className="col-span-2">
                {fmtDate(draft.registrationOpenAt)} –{' '}
                {fmtDate(draft.registrationCloseAt)}
              </dd>
              <dt className="text-jet/40">Run window</dt>
              <dd className="col-span-2">
                {fmtDate(draft.resultWindowStart)} –{' '}
                {fmtDate(draft.resultWindowEnd)}
              </dd>
              <dt className="text-jet/40">Hero</dt>
              <dd className="col-span-2">
                {draft.coverImageUrl ? (
                  <>
                    <span className="text-emerald-700">✓ uploaded</span> ·{' '}
                    {gallerySlotsEmpty} gallery slots empty
                  </>
                ) : (
                  <span className="text-signal">missing</span>
                )}
              </dd>
            </dl>
          </SummaryCard>

          <SummaryCard
            title={`Distances · ${draft.distanceCategories.length}`}
            onEdit={() => onJumpToStep('distances')}
          >
            {draft.distanceCategories.length === 0 ? (
              <p className="text-[12px] text-signal">⚠ At least one distance is required.</p>
            ) : (
              <ul className="text-[12px] space-y-1">
                {draft.distanceCategories.map((d, i) => (
                  <li key={d.id ?? i} className="flex justify-between gap-3">
                    <span>{d.categoryName || `Distance ${i + 1}`}</span>
                    <span className="text-jet/55">
                      ₹{d.price} ·{' '}
                      {d.maxParticipants ? `cap ${d.maxParticipants}` : 'unlimited'}
                      {d.inclusions && d.inclusions.length > 0
                        ? ` · ${d.inclusions.join(', ')}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SummaryCard>

          <SummaryCard
            title="What we collect"
            onEdit={() => onJumpToStep('collect')}
          >
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {draft.collectDob && <Chip>DOB</Chip>}
              {draft.collectGender && <Chip>Gender</Chip>}
              {draft.collectTshirt && (
                <Chip>
                  T-shirt size{' '}
                  {draft.tshirtSizes?.length
                    ? `(${draft.tshirtSizes.join(', ')})`
                    : ''}
                </Chip>
              )}
              {draft.collectAddress && <Chip>Address</Chip>}
              {draft.shipsMedal && <Chip>Ships medal</Chip>}
              {draft.requiresRunProof && <Chip>Run proof</Chip>}
            </div>
          </SummaryCard>

          <SummaryCard
            title={`Custom questions · ${(draft.registrationForm ?? []).length}`}
            onEdit={() => onJumpToStep('questions')}
          >
            {(draft.registrationForm ?? []).length === 0 ? (
              <p className="text-[12px] text-jet/55">No custom questions.</p>
            ) : (
              <ul className="text-[12px] space-y-1 text-jet/70">
                {(draft.registrationForm ?? []).map((f) => (
                  <li key={f.id}>
                    {f.label || 'Untitled'}
                    {f.required && <span className="text-signal"> *</span>}
                    {f.bindToUserField && (
                      <span className="text-jet/40">
                        {' · saves to profile'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SummaryCard>

          <SummaryCard title="Coupons" onEdit={() => onJumpToStep('coupons')}>
            <p className="text-[12px] text-jet/55">
              Coupons can be added before or after publishing — managed from the
              event dashboard.
            </p>
          </SummaryCard>

          <SummaryCard title="Policies" onEdit={() => onJumpToStep('policies')}>
            <p className="text-[12px] text-jet/70">
              {draft.refundPolicyMd?.trim() ? (
                <>
                  <span className="text-emerald-700">✓</span> Refund policy ·{' '}
                  {wordCount(draft.refundPolicyMd)} words
                </>
              ) : (
                <span className="text-signal">⚠ Refund policy missing</span>
              )}
            </p>
            <p className="text-[12px] text-jet/70">
              {draft.termsMd?.trim() ? (
                <>
                  <span className="text-emerald-700">✓</span> Terms &amp;
                  conditions · {wordCount(draft.termsMd)} words
                </>
              ) : (
                <span className="text-signal">⚠ Terms missing</span>
              )}
            </p>
          </SummaryCard>

          {errors.length > 0 && (
            <div className="rounded-2xl border border-signal/40 bg-signal/10 p-4">
              <p className="text-[11px] uppercase tracking-wider text-signal font-bold mb-1">
                {errors.length} issue{errors.length === 1 ? '' : 's'} to fix before publishing
              </p>
              <ul className="text-[12px] text-jet/80 list-disc pl-5">
                {errors.map((e, i) => (
                  <li key={i}>
                    {e.message}{' '}
                    <button
                      type="button"
                      onClick={() => onJumpToStep(e.step)}
                      className="underline text-jet/60 hover:text-jet"
                    >
                      Fix
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-[11px] uppercase tracking-wider text-gold font-bold mb-1">
                {warnings.length} warning{warnings.length === 1 ? '' : 's'}{' '}
                (won&apos;t block publish)
              </p>
              <ul className="text-[12px] text-jet/75 list-disc pl-5">
                {warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="lg:sticky lg:top-20">
            <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2">
              Public race page · preview
            </p>
            <PublicPreview draft={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-display uppercase text-sm font-bold">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] text-jet/50 hover:text-jet underline"
        >
          ✎ Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-jet text-bone">{children}</span>
  );
}

function PublicPreview({ draft }: { draft: WizardDraft }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-jet/10 bg-white">
      <div className="aspect-[16/9] bg-jet/10 relative">
        {draft.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-jet/30 text-xs">
            Hero image will appear here
          </div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bone/95 text-[10px] uppercase tracking-wider font-bold">
          {draft.eventFormat === 'virtual' ? 'Virtual' : 'Physical'}
        </div>
      </div>
      <div className="p-4">
        <p className="font-display uppercase font-bold text-base leading-tight">
          {draft.title || 'Your event title'}
        </p>
        <p className="text-[11px] text-jet/55 mt-0.5">
          {draft.resultWindowStart
            ? new Date(draft.resultWindowStart).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Date TBD'}
        </p>
        <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
          {draft.distanceCategories.slice(0, 4).map((d, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-jet/[0.06]">
              {d.categoryName || 'Distance'} ₹{d.price}
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="w-full mt-3 py-2 rounded-lg bg-jet text-bone text-sm font-medium opacity-90"
        >
          Register →
        </button>
      </div>
    </div>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function collectIssues(
  draft: WizardDraft,
  gstNumber: string | null,
): { errors: ReviewIssue[]; warnings: ReviewIssue[] } {
  const errors: ReviewIssue[] = [];
  const warnings: ReviewIssue[] = [];

  // Step 1
  if (!draft.title.trim()) errors.push({ message: 'Title is required.', step: 'basics' });
  if (!draft.slug.trim()) {
    errors.push({ message: 'Slug is required.', step: 'basics' });
  } else {
    const slugCheck = validateSlug(draft.slug);
    if (!slugCheck.ok)
      errors.push({ message: `Slug: ${slugCheck.error}`, step: 'basics' });
  }
  if (!draft.descriptionMd?.trim())
    errors.push({ message: 'Description is required.', step: 'basics' });
  if (!draft.coverImageUrl)
    errors.push({ message: 'Hero image is required.', step: 'basics' });
  const isPhysical = draft.eventFormat === 'in_person';
  const missingDates =
    !draft.registrationOpenAt ||
    (isPhysical && !draft.registrationCloseAt) ||
    !draft.resultWindowStart ||
    !draft.resultWindowEnd;
  if (missingDates) {
    errors.push({
      message: isPhysical
        ? 'Registration open/close and event date/time are required.'
        : 'Registration open and the run window are required.',
      step: 'basics',
    });
  } else {
    const wins = validateWindowsConsistent(
      {
        regOpen: draft.registrationOpenAt,
        regClose: draft.registrationCloseAt,
        runStart: draft.resultWindowStart,
        runEnd: draft.resultWindowEnd,
      },
      { regCloseOptional: !isPhysical },
    );
    if (!wins.ok) errors.push({ message: `Dates: ${wins.error}`, step: 'basics' });
  }

  // Step 2
  if (draft.distanceCategories.length === 0) {
    errors.push({ message: 'Add at least one distance.', step: 'distances' });
  } else {
    draft.distanceCategories.forEach((d, i) => {
      if (!d.categoryName.trim())
        errors.push({
          message: `Distance ${i + 1}: name is required.`,
          step: 'distances',
        });
      if (d.price < 0)
        errors.push({
          message: `Distance ${i + 1}: price must be ≥ 0.`,
          step: 'distances',
        });
      if (d.maxParticipants !== null && d.maxParticipants !== undefined && d.maxParticipants < 1)
        errors.push({
          message: `Distance ${i + 1}: cap must be ≥ 1 when set.`,
          step: 'distances',
        });
      if (!d.maxParticipants)
        warnings.push({
          message: `${d.categoryName || `Distance ${i + 1}`} has no participant cap. Set one if shipping is constrained.`,
          step: 'distances',
        });
    });
  }

  // Step 3
  if (draft.collectTshirt && !(draft.tshirtSizes?.length ?? 0)) {
    errors.push({
      message: 'Pick at least one t-shirt size when t-shirts are on.',
      step: 'collect',
    });
  }

  // Step 6
  if (!draft.refundPolicyMd?.trim())
    errors.push({ message: 'Refund policy is required.', step: 'policies' });
  if (!draft.termsMd?.trim())
    errors.push({ message: 'Terms & conditions are required.', step: 'policies' });

  // Warnings
  const gallery = draft.galleryImages?.length ?? 0;
  if (gallery < 3)
    warnings.push({
      message: `Only ${gallery} gallery image${gallery === 1 ? '' : 's'} uploaded — galleries with 3+ images convert better.`,
      step: 'basics',
    });
  if (!gstNumber)
    warnings.push({
      message: 'No GSTIN on the organiser profile — add one for compliant invoices.',
      step: 'basics',
    });

  // sanity check — never include a step id not in STEP_IDS
  for (const issue of [...errors, ...warnings]) {
    if (!(STEP_IDS as readonly string[]).includes(issue.step)) {
      issue.step = 'basics';
    }
  }

  return { errors, warnings };
}
