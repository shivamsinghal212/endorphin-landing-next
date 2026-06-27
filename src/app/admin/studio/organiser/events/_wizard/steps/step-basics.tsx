'use client';

import { useMemo, useState } from 'react';
import { ImageUploader, type ImageValue } from '@/components/studio/ImageUploader';
import { GalleryUploader } from '@/components/studio/GalleryUploader';
import { MarkdownEditor } from '@/components/studio/MarkdownEditor';
import { FieldLabel, SectionCard } from '@/app/admin/studio/_components/form';
import {
  validateSlug,
  validateWindowsConsistent,
} from '@/lib/studio/event-validators';
import { patchDraft, slugifyTitle, type WizardDraft } from '../wizard-state';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 1000;

export function StepBasics({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (next: WizardDraft) => void;
}) {
  /**
   * Track whether the user has hand-edited the slug. We only auto-slugify
   * from the title while it's pristine — once they type into the slug box we
   * stop overriding their work, even if they wipe it back to empty.
   */
  const [slugTouched, setSlugTouched] = useState<boolean>(() => !!draft.slug);

  const slugCheck = useMemo(() => validateSlug(draft.slug || ''), [draft.slug]);

  const isPhysical = draft.eventFormat === 'in_person';
  const isExperience = draft.category === 'experience';
  const urlPrefix = isExperience ? 'experiences' : 'running-events';

  const windowCheck = useMemo(
    () =>
      validateWindowsConsistent(
        {
          regOpen: draft.registrationOpenAt,
          regClose: draft.registrationCloseAt,
          runStart: draft.resultWindowStart,
          runEnd: draft.resultWindowEnd,
        },
        // Virtual events can leave registration open indefinitely — the
        // organiser toggles `acceptingRegistrations` to stop signups.
        { regCloseOptional: !isPhysical },
      ),
    [
      isPhysical,
      draft.registrationOpenAt,
      draft.registrationCloseAt,
      draft.resultWindowStart,
      draft.resultWindowEnd,
    ],
  );

  const set = (patch: Partial<WizardDraft>) => onChange(patchDraft(draft, patch));

  const onTitleChange = (next: string) => {
    const sliced = next.slice(0, TITLE_MAX);
    if (slugTouched) {
      set({ title: sliced });
    } else {
      set({ title: sliced, slug: slugifyTitle(sliced) });
    }
  };

  const onSlugChange = (next: string) => {
    setSlugTouched(true);
    set({ slug: next.toLowerCase().replace(/[^a-z0-9-]/g, '') });
  };

  const heroValue: ImageValue | null = draft.coverImageUrl
    ? { url: draft.coverImageUrl }
    : null;

  const galleryValues: ImageValue[] = (draft.galleryImages ?? []).map((url) => ({
    url,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl font-bold">The basics</h1>
        <p className="text-sm text-jet/60">
          Title, when it runs, and the hero image. You can change everything
          until the first registration comes in.
        </p>
      </div>

      <SectionCard title="Event kind">
        <div className="grid grid-cols-2 gap-3">
          <FormatCard
            name="event-kind"
            checked={!isExperience}
            onSelect={() => set({ category: 'running' })}
            title="Running"
            body="Races, runs and timed challenges — distances, bibs, finisher medals."
          />
          <FormatCard
            name="event-kind"
            checked={isExperience}
            onSelect={() =>
              set({
                category: 'experience',
                // Experiences are venue events by default; run-proof/medals
                // don't apply, so clear them.
                eventFormat: 'in_person',
                requiresRunProof: false,
                shipsMedal: false,
              })
            }
            title="Experience"
            body="Yoga, workshops, socials and other ticketed activities — guests book a spot."
          />
        </div>
      </SectionCard>

      <SectionCard title="Event format">
        <div className="grid grid-cols-2 gap-3">
          <FormatCard
            checked={draft.eventFormat === 'virtual'}
            onSelect={() => set({ eventFormat: 'virtual' })}
            title="Virtual"
            body={
              isExperience
                ? 'Guests join online from anywhere.'
                : 'Runners complete on their own and submit a screenshot. We verify and ship medals.'
            }
          />
          <FormatCard
            checked={draft.eventFormat === 'in_person'}
            onSelect={() =>
              set({
                eventFormat: 'in_person',
                requiresRunProof: false, // run proof is virtual-only
              })
            }
            title="Physical"
            body={
              isExperience
                ? 'Single venue, single date. Guests check in on the day.'
                : 'Single venue, single date. Runners check in on race day.'
            }
          />
        </div>
      </SectionCard>

      <SectionCard title="Identity">
        <div className="space-y-3">
          <div>
            <FieldLabel
              required
              hint={`${draft.title.length} / ${TITLE_MAX}`}
            >
              Title
            </FieldLabel>
            <input
              value={draft.title}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Monsoon Mileage · Virtual 10K"
              className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
            />
          </div>

          <div>
            <FieldLabel required>URL slug</FieldLabel>
            <div
              className={`flex items-stretch rounded-xl border overflow-hidden text-sm bg-white ${
                draft.slug && !slugCheck.ok
                  ? 'border-signal'
                  : 'border-jet/10 focus-within:border-jet'
              }`}
            >
              <span className="px-3 py-2.5 bg-jet/[0.04] text-jet/50 hidden sm:inline">
                endorfin.app/{urlPrefix}/
              </span>
              <span className="px-3 py-2.5 bg-jet/[0.04] text-jet/50 sm:hidden">
                /{urlPrefix}/
              </span>
              <input
                value={draft.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="monsoon-mileage-2026"
                className="flex-1 px-3 py-2.5 outline-none min-w-0 bg-white"
              />
            </div>
            {draft.slug && !slugCheck.ok && (
              <p className="text-[11px] text-signal mt-1">⚠ {slugCheck.error}</p>
            )}
          </div>

          <div>
            <MarkdownEditor
              label="Description"
              required
              value={draft.descriptionMd ?? ''}
              onChange={(v) => set({ descriptionMd: v })}
              maxLength={DESCRIPTION_MAX}
              rows={6}
              placeholder={
                isExperience
                  ? "Tell guests what this experience is about, why it's special, and what to expect on the day."
                  : "Tell runners what this race is about, why it's special, how the day will run."
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Media"
        description={`Hero is what ${isExperience ? 'guests' : 'runners'} see on the event page and cards. JPG/PNG/WebP · max 5 MB · we crop to 16:9.`}
      >
        <ImageUploader
          label="Hero image"
          required
          value={heroValue}
          aspectRatio="16/9"
          folder="studio/events"
          onChange={(next) => set({ coverImageUrl: next?.url ?? null })}
        />
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-2">
            Gallery <span className="text-jet/30">· optional, up to 6</span>
          </p>
          <GalleryUploader
            value={galleryValues}
            onChange={(items) =>
              set({ galleryImages: items.length ? items.map((i) => i.url) : null })
            }
            folder="studio/events"
          />
        </div>
      </SectionCard>

      <SectionCard title="Where">
        <div className="space-y-3">
          <div>
            <FieldLabel>{isExperience ? 'Venue / location' : 'Location'}</FieldLabel>
            <input
              value={draft.locationName ?? ''}
              onChange={(e) => set({ locationName: e.target.value || null })}
              placeholder="e.g. Play Haus, Adventure Island, Rohini"
              className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
            />
          </div>
          <div>
            <FieldLabel>
              Full address <span className="text-jet/30">· optional</span>
            </FieldLabel>
            <textarea
              value={draft.locationAddress ?? ''}
              onChange={(e) => set({ locationAddress: e.target.value || null })}
              rows={2}
              placeholder="Street, area, city, pincode"
              className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="When it runs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateTimeField
            label="Registration opens"
            value={draft.registrationOpenAt}
            onChange={(v) => set({ registrationOpenAt: v })}
          />
          <DateTimeField
            label={
              isPhysical
                ? 'Registration closes'
                : 'Registration closes (optional)'
            }
            value={draft.registrationCloseAt}
            onChange={(v) => set({ registrationCloseAt: v })}
          />
          {isPhysical ? (
            <>
              <DateTimeField
                label="Event date"
                value={draft.resultWindowStart}
                onChange={(v) =>
                  set({ resultWindowStart: v, resultWindowEnd: v ?? draft.resultWindowEnd })
                }
              />
              <DateTimeField
                label="End time"
                value={draft.resultWindowEnd}
                onChange={(v) => set({ resultWindowEnd: v })}
              />
            </>
          ) : (
            <>
              <DateTimeField
                label="Run window starts"
                value={draft.resultWindowStart}
                onChange={(v) => set({ resultWindowStart: v })}
              />
              <DateTimeField
                label="Run window ends"
                value={draft.resultWindowEnd}
                onChange={(v) => set({ resultWindowEnd: v })}
              />
            </>
          )}
        </div>
        <p className="text-[11px] text-jet/40 mt-3">
          All times are IST (Asia/Kolkata).{' '}
          {isPhysical
            ? 'Registration must close on or before the event date.'
            : 'Registration and the run window are independent — leave the close date blank to keep registration open until you flip the toggle below.'}
        </p>
        {windowCheck.ok ? (
          draft.registrationOpenAt &&
          draft.resultWindowStart &&
          draft.resultWindowEnd ? (
            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 flex items-start gap-2">
              <span>✓</span>
              <span>Looks good — dates are valid.</span>
            </div>
          ) : null
        ) : (
          <div className="mt-3 rounded-xl bg-signal/10 px-3 py-2 text-[11px] text-signal flex items-start gap-2">
            <span>⚠</span>
            <span>{windowCheck.error}</span>
          </div>
        )}

        {/* Master signup switch — most useful for virtual events that have
         *  no hard close date, but available on physical too as an emergency
         *  stop (e.g. venue capacity reached early). */}
        <div className="mt-4 flex items-start justify-between gap-4 p-3 rounded-xl border border-jet/10">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              Accepting registrations
            </p>
            <p className="text-[11px] text-jet/55 mt-0.5">
              {draft.acceptingRegistrations
                ? 'Runners can sign up right now (subject to dates above).'
                : 'New signups are blocked. Existing registrations stay valid.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.acceptingRegistrations}
            onClick={() =>
              set({ acceptingRegistrations: !draft.acceptingRegistrations })
            }
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
              draft.acceptingRegistrations ? 'bg-jet' : 'bg-jet/20'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-bone transition-all ${
                draft.acceptingRegistrations ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Charity / fundraising"
        description="Optional. Set an NGO and we'll show a “Proceeds to …” badge plus a “Where your money goes” section on the event page."
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>NGO / cause name</FieldLabel>
            <input
              value={draft.ngoName ?? ''}
              onChange={(e) => set({ ngoName: e.target.value || null })}
              placeholder="e.g. Goonj"
              className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
            />
          </div>

          {draft.ngoName && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>NGO website <span className="text-jet/30">· optional</span></FieldLabel>
                  <input
                    type="url"
                    value={draft.ngoUrl ?? ''}
                    onChange={(e) => set({ ngoUrl: e.target.value || null })}
                    placeholder="https://…"
                    className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
                  />
                </div>
                <div>
                  <FieldLabel>% of proceeds donated <span className="text-jet/30">· optional</span></FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.donationPercent ?? ''}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      set({ donationPercent: Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : null });
                    }}
                    placeholder="100"
                    className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-jet/50 mb-2">
                  NGO logo <span className="text-jet/30">· optional</span>
                </p>
                <ImageUploader
                  label="NGO logo"
                  value={draft.ngoLogoUrl ? { url: draft.ngoLogoUrl } : null}
                  aspectRatio="1/1"
                  folder="studio/events"
                  onChange={(next) => set({ ngoLogoUrl: next?.url ?? null })}
                />
              </div>

              <MarkdownEditor
                label="Where the money goes"
                value={draft.donationNoteMd ?? ''}
                onChange={(v) => set({ donationNoteMd: v || null })}
                maxLength={500}
                rows={4}
                placeholder="One or two lines on the cause and how funds are used."
              />
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function FormatCard({
  checked,
  onSelect,
  title,
  body,
  name = 'event-format',
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  name?: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl p-4 flex items-start gap-3 border-2 transition-colors ${
        checked
          ? 'border-jet bg-jet/[0.02]'
          : 'border-jet/10 hover:border-jet/30'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1 accent-jet"
      />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[12px] text-jet/55 mt-0.5">{body}</p>
      </div>
    </label>
  );
}

/**
 * `datetime-local` returns "YYYY-MM-DDTHH:mm" without timezone — we treat that
 * as IST and store the ISO string the backend expects. There's no second-level
 * precision needed for race scheduling, so we round/store as minutes.
 */
function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}) {
  // Convert the stored ISO back into the local "YYYY-MM-DDTHH:mm" the input
  // wants. We deliberately format in IST so what the organiser typed is what
  // they see on every reload, regardless of where they're physically located.
  const inputValue = value ? toLocalInput(value) : '';
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="datetime-local"
        value={inputValue}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return onChange(null);
          // Reinterpret the local-string as IST by treating it as the IST
          // clock-face and computing the matching UTC instant.
          onChange(istLocalToUtcIso(v));
        }}
        className="w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white outline-none focus:border-jet"
      />
    </div>
  );
}

const IST_OFFSET_MIN = 330; // +05:30

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Shift UTC to IST clock-face, then format.
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mi = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function istLocalToUtcIso(local: string): string {
  // `local` looks like "2026-05-20T09:00"
  const [date, time] = local.split('T');
  if (!date || !time) return new Date(local).toISOString();
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // Build a UTC instant for the IST clock-face value: that means the UTC
  // wallclock equivalent is (IST - 5:30).
  const utc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - IST_OFFSET_MIN * 60_000;
  return new Date(utc).toISOString();
}
