'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { AutosaveIndicator, type AutosaveStatus } from './AutosaveIndicator';

export type WizardStep = {
  id: string;
  label: string;
  href: string;
  isComplete?: boolean;
};

export type WizardShellProps = {
  /** Shown in the top breadcrumb bar. */
  eventTitle: string;
  steps: WizardStep[];
  currentStepId: string;
  autosaveStatus: AutosaveStatus;
  lastSavedAt?: Date;
  /** Manual retry hook — surfaced on the autosave indicator when status='error'. */
  onAutosaveRetry?: () => void;
  onBack?: () => void;
  onContinue: () => void;
  onSaveExit: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  /** Optional preview URL — when set, the Preview button renders as a real link. */
  previewHref?: string;
  onPreview?: () => void;
  children: ReactNode;
};

export function WizardShell({
  eventTitle,
  steps,
  currentStepId,
  autosaveStatus,
  lastSavedAt,
  onAutosaveRetry,
  onBack,
  onContinue,
  onSaveExit,
  continueDisabled,
  continueLabel = 'Continue →',
  previewHref,
  onPreview,
  children,
}: WizardShellProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  );

  return (
    <div className="min-h-screen bg-bone flex flex-col">
      {/* ── Top breadcrumb bar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-jet/10 px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link
            href="/admin/studio"
            className="text-xs text-jet/50 hover:text-jet whitespace-nowrap"
          >
            ← Home
          </Link>
          <span className="text-jet/20 hidden sm:inline">·</span>
          <span className="text-xs font-medium truncate">{eventTitle}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-jet/10 text-jet/60 uppercase tracking-wider font-medium shrink-0">
            Draft
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs ml-auto">
          <span className="hidden sm:inline-flex">
            <AutosaveIndicator
              status={autosaveStatus}
              lastSavedAt={lastSavedAt}
              onRetry={onAutosaveRetry}
            />
          </span>
          {previewHref ? (
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-jet/15 hover:bg-jet/5 whitespace-nowrap"
            >
              Preview
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPreview}
              disabled={!onPreview}
              className="px-3 py-1.5 rounded-lg border border-jet/15 hover:bg-jet/5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile pill strip (md:hidden) ───────────────────────────────── */}
      <div
        className="md:hidden bg-white border-b border-jet/5 px-4 py-2 overflow-x-auto"
        aria-label="Wizard steps"
      >
        <div className="flex items-center gap-1 min-w-max">
          {steps.map((step, i) => {
            const isCurrent = step.id === currentStepId;
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
                  isCurrent
                    ? 'bg-jet text-bone font-medium'
                    : 'text-jet/55 hover:bg-jet/5'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {i + 1} · {step.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Body: sidebar + main ────────────────────────────────────────── */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-12 gap-6">
        <aside className="hidden md:block md:col-span-3">
          <ol className="space-y-1 sticky top-20">
            {steps.map((step, i) => {
              const isCurrent = step.id === currentStepId;
              const stepNum = i + 1;
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      isCurrent
                        ? 'bg-jet text-bone'
                        : 'text-jet/60 hover:bg-jet/5'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${
                        isCurrent
                          ? 'bg-bone text-jet'
                          : step.isComplete
                            ? 'bg-emerald-500 text-white'
                            : 'border border-jet/20'
                      }`}
                    >
                      {step.isComplete && !isCurrent ? '✓' : stepNum}
                    </span>
                    <span
                      className={`text-sm ${isCurrent ? 'font-medium' : ''}`}
                    >
                      {step.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="col-span-12 md:col-span-9 space-y-4 pb-24">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-jet text-bone font-bold">
              {currentIndex + 1}
            </span>
            <p className="text-[11px] uppercase tracking-wider text-jet/40">
              Step {currentIndex + 1} of {steps.length}
            </p>
          </div>
          {children}
        </div>
      </div>

      {/* ── Sticky footer ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 px-4 md:px-6 py-3 bg-bone/95 backdrop-blur border-t border-jet/10 flex items-center justify-between gap-2 z-20">
        <span className="hidden sm:inline-flex">
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={onAutosaveRetry}
          />
        </span>
        <button
          type="button"
          onClick={onSaveExit}
          className="text-xs sm:text-sm text-jet/60 hover:text-jet whitespace-nowrap"
        >
          <span className="sm:hidden">Exit</span>
          <span className="hidden sm:inline">Save & exit</span>
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="px-3 sm:px-4 py-2 rounded-lg border border-jet/15 text-xs sm:text-sm hover:bg-jet/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="px-3 sm:px-4 py-2 rounded-lg bg-jet text-bone text-xs sm:text-sm font-medium hover:bg-jet/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
