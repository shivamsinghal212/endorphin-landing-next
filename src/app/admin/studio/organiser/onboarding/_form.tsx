'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageUploader, type ImageValue } from '@/components/studio/ImageUploader';
import { MarkdownEditor } from '@/components/studio/MarkdownEditor';
import {
  describeOrganiserError,
  useMyOrganiser,
  useOnboardOrganiser,
} from '@/lib/studio/organiser-hooks';
import { validatePhone } from '@/lib/studio/event-validators';
import { ErrorState, Skeleton, StudioTopBar } from '../../_components/ui';

// ── Inline validators (event-validators.ts style) ─────────────────────────
// Lives here on purpose — `src/lib/studio` is owned by another stream.

type ValidationResult = { ok: true } | { ok: false; error: string };
const okResult: ValidationResult = { ok: true };
const failResult = (error: string): ValidationResult => ({ ok: false, error });

// Pragmatic email regex — same shape RFC 5322 lite checks the major form
// libraries use. Backend re-validates anyway.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmail(s: string): ValidationResult {
  if (!s) return failResult('Email is required');
  if (s.length > 254) return failResult('Email is too long');
  if (!EMAIL_RE.test(s)) return failResult('Enter a valid email address');
  return okResult;
}

// Indian GSTIN: 15 chars — 2-digit state, 5-letter PAN prefix, 4-digit
// number, 1-letter PAN suffix, 1 entity code, fixed "Z", 1 checksum.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
function validateGstin(s: string): ValidationResult {
  if (!s) return okResult; // optional
  if (!GSTIN_RE.test(s)) {
    return failResult('GSTIN must be 15 characters in the standard format');
  }
  return okResult;
}

function validateDisplayName(s: string): ValidationResult {
  const trimmed = s.trim();
  if (!trimmed) return failResult('Display name is required');
  if (trimmed.length > 100) return failResult('Display name must be 100 characters or fewer');
  return okResult;
}

// ── Form ─────────────────────────────────────────────────────────────────

type FieldErrors = {
  displayName?: string;
  bio?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstNumber?: string;
};

const BIO_MAX = 280;

export function OnboardingForm() {
  const router = useRouter();
  const meQ = useMyOrganiser();

  // If the user already has an organiser profile, bounce them home.
  useEffect(() => {
    if (meQ.isFetched && meQ.data) {
      router.replace('/admin/studio/organiser');
    }
  }, [meQ.isFetched, meQ.data, router]);

  if (meQ.isError) {
    return (
      <>
        <StudioTopBar back={{ href: '/admin/studio', label: 'Studio home' }} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <ErrorState
            title="Couldn't load your account"
            message={describeOrganiserError(meQ.error)}
            onRetry={() => meQ.refetch()}
          />
        </main>
      </>
    );
  }

  // Don't flash the form while we're checking for an existing profile, or
  // while we're mid-redirect after detecting one.
  if (!meQ.isFetched || meQ.data) {
    return (
      <>
        <StudioTopBar back={{ href: '/admin/studio', label: 'Studio home' }} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-9 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full max-w-md mb-8" />
          <Skeleton className="h-72 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </main>
      </>
    );
  }

  return <OnboardingFormInner />;
}

function OnboardingFormInner() {
  const router = useRouter();
  const onboardMut = useOnboardOrganiser();

  const [logo, setLogo] = useState<ImageValue | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    displayName: false,
    bio: false,
    contactEmail: false,
    contactPhone: false,
    gstNumber: false,
  });

  const errors = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    const name = validateDisplayName(displayName);
    if (!name.ok) e.displayName = name.error;
    if (bio.length > BIO_MAX) e.bio = `Bio must be ${BIO_MAX} characters or fewer`;
    const email = validateEmail(contactEmail.trim());
    if (!email.ok) e.contactEmail = email.error;
    const phone = validatePhone(contactPhone.trim(), { required: false });
    if (!phone.ok) e.contactPhone = phone.error;
    const gstin = validateGstin(gstNumber.trim().toUpperCase());
    if (!gstin.ok) e.gstNumber = gstin.error;
    return e;
  }, [displayName, bio, contactEmail, contactPhone, gstNumber]);

  const formValid =
    !errors.displayName &&
    !errors.bio &&
    !errors.contactEmail &&
    !errors.contactPhone &&
    !errors.gstNumber;

  const markTouched = (k: keyof FieldErrors) =>
    setTouched((prev) => (prev[k] ? prev : { ...prev, [k]: true }));

  const showError = (k: keyof FieldErrors) => touched[k] && !!errors[k];

  const onSubmit = async () => {
    setTouched({
      displayName: true,
      bio: true,
      contactEmail: true,
      contactPhone: true,
      gstNumber: true,
    });
    if (!formValid) {
      toast.error('Fix the highlighted fields and try again');
      return;
    }
    try {
      await onboardMut.mutateAsync({
        displayName: displayName.trim(),
        brandLogoUrl: logo?.url ?? null,
        bioMd: bio.trim() || null,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        businessName: businessName.trim() || null,
        gstNumber: gstNumber.trim().toUpperCase() || null,
      });
      toast.success('Organiser profile saved');
      router.replace('/admin/studio/organiser');
    } catch (e) {
      toast.error(describeOrganiserError(e));
    }
  };

  const inputBase =
    'mt-1 w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:border-jet outline-none';
  const inputCls = (errored: boolean) =>
    `${inputBase} ${errored ? 'border-signal bg-signal/[0.04]' : 'border-jet/10'}`;

  return (
    <>
      <StudioTopBar back={{ href: '/admin/studio', label: 'Studio home' }} />
      <main className="bg-bone min-h-[60vh]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-10 pb-32">
          <p className="text-[11px] uppercase tracking-wider text-jet/40 mb-2">
            Step 1 of 1 · You can edit this later
          </p>
          <h1 className="font-display uppercase text-2xl sm:text-3xl font-bold mb-2">
            Set up your organiser profile
          </h1>
          <p className="text-sm text-jet/60 mb-8 max-w-lg">
            Runners see this on every event page you publish. Keep it short — you&apos;re
            not writing a bio for LinkedIn.
          </p>

          {/* Identity */}
          <div className="bg-white border border-jet/10 rounded-2xl p-5 sm:p-6 mb-4">
            <p className="font-display uppercase text-sm font-bold mb-4">Identity</p>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-4">
                <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-2">Logo</p>
                <ImageUploader
                  value={logo}
                  onChange={setLogo}
                  aspectRatio="square"
                  maxSizeMB={2}
                  folder="studio/organisers"
                  bucket="avatars"
                />
                <p className="text-[10px] text-jet/40 mt-1.5">
                  PNG / JPG / WEBP · max 2&nbsp;MB · square works best
                </p>
              </div>

              <div className="col-span-12 sm:col-span-8 space-y-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <label className="text-[11px] uppercase tracking-wider text-jet/50">
                      Display name <span className="text-signal">*</span>
                    </label>
                    <span className="text-[10px] text-jet/40">
                      {displayName.trim().length} / 100
                    </span>
                  </div>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => markTouched('displayName')}
                    maxLength={100}
                    placeholder="Pacing Project"
                    className={inputCls(showError('displayName'))}
                  />
                  {showError('displayName') && (
                    <p className="text-signal text-[11px] mt-1">
                      ⚠ {errors.displayName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <label className="text-[11px] uppercase tracking-wider text-jet/50">
                      Short bio
                    </label>
                    <span
                      className={`text-[10px] tabular-nums ${
                        bio.length > BIO_MAX ? 'text-signal' : 'text-jet/40'
                      }`}
                    >
                      {bio.length} / {BIO_MAX}
                    </span>
                  </div>
                  <MarkdownEditor
                    value={bio}
                    onChange={(next) => {
                      setBio(next);
                      markTouched('bio');
                    }}
                    maxLength={BIO_MAX}
                    rows={4}
                    placeholder="Boutique race operator running themed virtual events out of Mumbai since 2024."
                  />
                  {showError('bio') && (
                    <p className="text-signal text-[11px] mt-1">⚠ {errors.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white border border-jet/10 rounded-2xl p-5 sm:p-6 mb-4">
            <p className="font-display uppercase text-sm font-bold mb-4">
              Contact (runners&apos; support email)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-jet/50">
                  Email <span className="text-signal">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={() => markTouched('contactEmail')}
                  placeholder="hello@pacingproject.in"
                  className={inputCls(showError('contactEmail'))}
                />
                {showError('contactEmail') && (
                  <p className="text-signal text-[11px] mt-1">
                    ⚠ {errors.contactEmail}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-jet/50">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  onBlur={() => markTouched('contactPhone')}
                  placeholder="+91 98200 12345"
                  className={inputCls(showError('contactPhone'))}
                  aria-invalid={showError('contactPhone') || undefined}
                />
                {showError('contactPhone') && (
                  <p className="text-signal text-[11px] mt-1">
                    ⚠ {errors.contactPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Business */}
          <div className="bg-white border border-jet/10 rounded-2xl p-5 sm:p-6 mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <p className="font-display uppercase text-sm font-bold">Business details</p>
              <span className="text-[11px] text-jet/40">
                Optional · needed before payouts
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-jet/50">
                  Registered business name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Pacing Project Pvt Ltd"
                  className={inputCls(false)}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-jet/50">
                  GSTIN
                </label>
                <input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('gstNumber')}
                  placeholder="27AABCT1234E1Z5"
                  className={inputCls(showError('gstNumber'))}
                />
                {showError('gstNumber') && (
                  <p className="text-signal text-[11px] mt-1">⚠ {errors.gstNumber}</p>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-jet/40 mb-2 sm:hidden">
            Your first 3 events are reviewed by the Endorfin team before going live.
          </p>
        </div>

        {/* Sticky bottom action */}
        <div className="sticky bottom-0 bg-bone/95 backdrop-blur border-t border-jet/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <p className="text-[11px] text-jet/40 hidden sm:block flex-1">
              Your first 3 events are reviewed by the Endorfin team before going live.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!formValid || onboardMut.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {onboardMut.isPending && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                  />
                </svg>
              )}
              Save &amp; enter Studio →
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
