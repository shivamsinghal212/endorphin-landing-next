'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useStudioAuth } from '@/lib/studio/auth-context';
import {
  describeOrganiserError,
  useMyOrganiser,
  useOnboardOrganiser,
  useUpdateMyOrganiser,
} from '@/lib/studio/organiser-hooks';
import { Skeleton } from '../../_components/ui';
import { useBodyScrollLock } from './_sheet';
import { ImageUploadField } from '../../../(super)/clubs/_components/image-upload';

/** Create or edit the organiser profile that fronts an event.
 *
 *  There was nowhere to do this: `/organiser/onboarding` redirects away the
 *  moment a profile exists, so details could be set once and never changed.
 *  This is the edit surface, and it doubles as the create form for anyone
 *  who reached a draft through the composer without onboarding.
 *
 *  Only `displayName` and `contactEmail` are required — they're the two
 *  NOT NULL columns, and both prefill from the signed-in user so the
 *  "add details" case is a confirm rather than a form.
 */
export function OrganiserSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const studio = useStudioAuth();
  const meQ = useMyOrganiser();
  const existing = meQ.data ?? null;
  const createMut = useOnboardOrganiser();
  const updateMut = useUpdateMyOrganiser();
  const saving = createMut.isPending || updateMut.isPending;

  const [displayName, setDisplayName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [bioMd, setBioMd] = useState('');
  const [touched, setTouched] = useState(false);

  // Reseed on every open: from the profile when there is one, otherwise from
  // the signed-in user, so this starts as a confirmation not a blank form.
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setDisplayName(existing?.displayName ?? studio?.name ?? '');
    setContactEmail(existing?.contactEmail ?? studio?.email ?? '');
    setContactPhone(existing?.contactPhone ?? '');
    setBrandLogoUrl(existing?.brandLogoUrl ?? '');
    setBioMd(existing?.bioMd ?? '');
  }, [open, existing, studio?.name, studio?.email]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, saving]);

  useBodyScrollLock(open);

  if (!open) return null;

  const nameError = !displayName.trim() ? 'Give the host a name' : null;
  const emailError = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())
    ? 'A working email — runners reply to this'
    : null;
  const valid = !nameError && !emailError;

  const onSave = async () => {
    setTouched(true);
    if (!valid) return;
    const body = {
      displayName: displayName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,
      brandLogoUrl: brandLogoUrl.trim() || null,
      bioMd: bioMd.trim() || null,
    };
    try {
      if (existing) {
        await updateMut.mutateAsync(body);
        toast.success('Host details updated');
      } else {
        await createMut.mutateAsync(body);
        toast.success('Host details saved');
      }
      onClose();
    } catch (e) {
      toast.error("Couldn't save those details", {
        description: describeOrganiserError(e),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organiser-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !saving && onClose()}
        className="absolute inset-0 bg-jet/70 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-2xl shadow-2xl">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-5">
        <div className="px-6 pt-6 pb-4">
          <p className="text-[10px] uppercase tracking-wider text-jet/40 mb-2">
            Host details
          </p>
          <h2
            id="organiser-sheet-title"
            className="text-[28px] md:text-[30px] italic font-bold leading-[1.05] tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}
          >
            Who&rsquo;s <span className="text-signal">behind it?</span>
          </h2>
          <p className="text-[13px] text-jet/55 leading-relaxed">
            This is the name and contact runners see on the event page and in
            their confirmation email.
          </p>
        </div>

        {!meQ.isFetched ? (
          <div className="px-6 flex flex-col gap-3">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : (
          <div className="px-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="org-name"
                className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1"
              >
                Host name <span className="text-signal">·</span>
              </label>
              <input
                id="org-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Your name, or your brand"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white outline-none ${
                  touched && nameError
                    ? 'border-signal focus:border-signal'
                    : 'border-jet/10 focus:border-jet'
                }`}
              />
              {touched && nameError && (
                <p role="alert" className="text-[11px] text-signal mt-1">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="org-email"
                className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1"
              >
                Contact email <span className="text-signal">·</span>
              </label>
              <input
                id="org-email"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="you@example.com"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white outline-none ${
                  touched && emailError
                    ? 'border-signal focus:border-signal'
                    : 'border-jet/10 focus:border-jet'
                }`}
              />
              {touched && emailError && (
                <p role="alert" className="text-[11px] text-signal mt-1">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="org-phone"
                className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1"
              >
                Contact phone
              </label>
              <input
                id="org-phone"
                type="tel"
                autoComplete="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="org-bio"
                className="block text-[11px] uppercase tracking-wider text-jet/50 mb-1"
              >
                About <span className="text-jet/35">(280 max)</span>
              </label>
              <textarea
                id="org-bio"
                rows={2}
                maxLength={280}
                value={bioMd}
                onChange={(e) => setBioMd(e.target.value)}
                placeholder="One or two lines about who you are."
                className="w-full px-3 py-2 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
              />
            </div>

            <div>
              <ImageUploadField
                label="Logo"
                shape="square"
                value={brandLogoUrl}
                onChange={setBrandLogoUrl}
                folder="events/covers"
                hint="Optional — shown next to the host name."
              />
            </div>
          </div>
        )}

        </div>

        {/* Pinned: the panel scrolls, this bar does not, so the
            actions are never below the fold. */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2.5 px-6 py-4 border-t border-jet/[0.08] bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-jet/15 text-sm hover:bg-jet/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !meQ.isFetched}
            className="px-4 py-2.5 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Save details'}
          </button>
        </div>
      </div>
    </div>
  );
}
