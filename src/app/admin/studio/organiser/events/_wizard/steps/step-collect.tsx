'use client';

import { Toggle } from '@/app/admin/studio/_components/form';
import { patchDraft, TSHIRT_SIZES, type WizardDraft } from '../wizard-state';

export function StepCollect({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (next: WizardDraft) => void;
}) {
  const set = (patch: Partial<WizardDraft>) => onChange(patchDraft(draft, patch));
  const isPhysical = draft.eventFormat === 'in_person';
  // Run proof + finisher medals are running-only concepts.
  const isExperience = draft.category === 'experience';

  const sizes = draft.tshirtSizes ?? [];

  const toggleSize = (s: string) => {
    if (sizes.includes(s)) {
      set({ tshirtSizes: sizes.filter((x) => x !== s) });
    } else {
      set({ tshirtSizes: [...sizes, s] });
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h1 className="font-display uppercase text-2xl font-bold">
          What we collect at checkout
        </h1>
        <p className="text-sm text-jet/60">
          These are platform-known fields. Toggle on what your event needs —
          runners only fill them once and we re-use the answer.
        </p>
      </div>

      <CollectCard
        title="Date of birth"
        body="Saved to runner's profile. Used to bucket into age groups (M30-39 etc.)."
        chip={<RequiredChip label="Required for leaderboard" tone="gold" />}
        checked={!!draft.collectDob}
        onChange={(v) => set({ collectDob: v })}
      />

      <CollectCard
        title="Gender"
        body="Saved to runner's profile. Options: Male, Female, Non-binary, Prefer not to say."
        chip={<RequiredChip label="Required for leaderboard" tone="gold" />}
        checked={!!draft.collectGender}
        onChange={(v) => set({ collectGender: v })}
      />

      <div className="bg-white border border-jet/10 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="font-medium text-sm mb-1">T-shirt size</p>
            <p className="text-[12px] text-jet/55">Pick the sizes you&apos;ll stock.</p>
          </div>
          <Toggle
            checked={!!draft.collectTshirt}
            onChange={(v) =>
              set({
                collectTshirt: v,
                tshirtSizes: v ? draft.tshirtSizes ?? ['S', 'M', 'L', 'XL'] : null,
              })
            }
          />
        </div>
        {draft.collectTshirt && (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TSHIRT_SIZES.map((s) => {
                const active = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-full ${
                      active
                        ? 'bg-jet text-bone'
                        : 'border border-jet/15 text-jet/40 hover:border-jet hover:text-jet'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sizes.length === 0 && (
              <p className="text-[11px] text-signal mt-2">
                ⚠ Pick at least one size when t-shirts are on.
              </p>
            )}
          </>
        )}
      </div>

      <CollectCard
        title="Shipping address"
        body="Full Indian address with pincode. Used for t-shirt and medal dispatch."
        chip={
          draft.shipsMedal ? (
            <RequiredChip label="Auto-on with medal" tone="jet" />
          ) : null
        }
        checked={!!draft.collectAddress}
        onChange={(v) => set({ collectAddress: v })}
        // Once medal shipping is on we lock address to true.
        disabled={!!draft.shipsMedal}
      />

      {!isExperience && (
        <CollectCard
          title="Ship a finisher's medal"
          body="Dispatched after the run is verified."
          checked={!!draft.shipsMedal}
          onChange={(v) =>
            set({
              shipsMedal: v,
              // Turning medal on flips address on too. Turning it off doesn't
              // forcibly turn address off — the organiser may still want it.
              collectAddress: v ? true : draft.collectAddress,
            })
          }
        />
      )}

      <CollectCard
        title="Allow group booking (multi-ticket)"
        body="Let one person buy several tickets in a single checkout — across ticket types — and enter each guest's name and email. Best for parties, workshops and socials."
        checked={!!draft.allowGroupBooking}
        onChange={(v) => set({ allowGroupBooking: v })}
      />

      {!isExperience && (
        <CollectCard
          title="Require run proof"
          body={
            isPhysical
              ? 'Disabled for physical events — runners check in on race day.'
              : 'Screenshot of Strava/Garmin/phone app. We verify before medal dispatch.'
          }
          chip={
            isPhysical ? (
              <RequiredChip label="Virtual only" tone="jet" />
            ) : null
          }
          checked={!!draft.requiresRunProof}
          onChange={(v) => set({ requiresRunProof: v })}
          disabled={isPhysical}
        />
      )}
    </div>
  );
}

function CollectCard({
  title,
  body,
  chip,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  body: string;
  chip?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-5 flex items-start gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-medium text-sm">{title}</p>
          {chip}
        </div>
        <p className="text-[12px] text-jet/55">{body}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function RequiredChip({
  label,
  tone,
}: {
  label: string;
  tone: 'gold' | 'jet';
}) {
  const cls =
    tone === 'gold'
      ? 'bg-gold/20 text-gold'
      : 'bg-jet/10 text-jet/60';
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
