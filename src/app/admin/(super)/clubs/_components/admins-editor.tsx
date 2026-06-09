'use client';

import type { ClubAdminPerson } from '@/lib/admin-api';
import { AvatarUpload } from './image-upload';

const inputCls =
  'px-3 py-2 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/30 transition-colors';

export function AdminsEditor({
  admins,
  onChange,
  slug,
}: {
  admins: ClubAdminPerson[];
  onChange: (v: ClubAdminPerson[]) => void;
  slug: string;
}) {
  // Auto-derived cards (owner/admin roster) are read-only and must survive every
  // edit untouched — operate only on the editable subset, then re-append derived.
  const derivedCards = admins.filter((a) => a.derived);
  const editable = admins.filter((a) => !a.derived);

  const commit = (next: ClubAdminPerson[]) => onChange([...next, ...derivedCards]);
  const update = (i: number, patch: Partial<ClubAdminPerson>) =>
    commit(editable.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => commit(editable.filter((_, idx) => idx !== i));
  const add = () =>
    commit([
      ...editable,
      { name: '', role: '', avatarUrl: '', whatsappUrl: '', instagramUrl: '', stravaUrl: '' },
    ]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= editable.length) return;
    const next = [...editable];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const addButton = (full: boolean) => (
    <button
      type="button"
      onClick={add}
      className={
        full
          ? 'w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-body font-medium hover:bg-jet/5 transition-colors cursor-pointer'
          : 'px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer'
      }
    >
      + Add admin
    </button>
  );

  return (
    <div className="space-y-3">
      {derivedCards.length > 0 && (
        <div className="space-y-2">
          {derivedCards.map((a, i) => (
            <DerivedCard key={`derived-${i}`} admin={a} />
          ))}
          <p className="font-body text-[11px] text-jet/40">
            Auto-added from the club&apos;s owner/admin roster. Manage these in
            the club&apos;s membership settings, not here.
          </p>
        </div>
      )}

      {editable.length === 0 ? (
        <div>
          {derivedCards.length === 0 && (
            <p className="font-body text-sm text-jet/50 mb-3">No admins yet.</p>
          )}
          {addButton(false)}
        </div>
      ) : (
        <>
          {editable.map((a, i) => (
            <div key={i} className="rounded-lg border border-jet/10 p-3 bg-jet/[0.015]">
              <div className="flex items-start gap-3">
                <AvatarUpload
                  url={a.avatarUrl ?? ''}
                  onChange={(url) => update(i, { avatarUrl: url })}
                  folder={`clubs/${slug || 'tmp'}/admins`}
                  size={56}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={a.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Full name *"
                      className={`${inputCls} flex-1`}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === editable.length - 1}
                        className="text-jet/40 hover:text-jet disabled:opacity-30 leading-none text-xs"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="font-body text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={a.role ?? ''}
                    onChange={(e) => update(i, { role: e.target.value })}
                    placeholder="Role (e.g. Captain, Founder)"
                    className={`${inputCls} w-full`}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={a.whatsappUrl ?? ''}
                      onChange={(e) => update(i, { whatsappUrl: e.target.value })}
                      placeholder="WhatsApp URL"
                      className={inputCls}
                    />
                    <input
                      value={a.instagramUrl ?? ''}
                      onChange={(e) => update(i, { instagramUrl: e.target.value })}
                      placeholder="Instagram URL"
                      className={inputCls}
                    />
                    <input
                      value={a.stravaUrl ?? ''}
                      onChange={(e) => update(i, { stravaUrl: e.target.value })}
                      placeholder="Strava URL"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {addButton(true)}
        </>
      )}
    </div>
  );
}

function DerivedCard({ admin }: { admin: ClubAdminPerson }) {
  const avatarStyle = admin.avatarUrl
    ? { backgroundImage: `url('${admin.avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  return (
    <div className="rounded-lg border border-jet/10 p-3 bg-jet/[0.03] flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full bg-jet/10 shrink-0 flex items-center justify-center text-jet/40 text-sm font-display"
        style={avatarStyle}
      >
        {admin.avatarUrl ? '' : (admin.name?.[0]?.toUpperCase() ?? '?')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-jet truncate">{admin.name}</p>
        {admin.role && (
          <p className="font-body text-xs text-jet/50">{admin.role}</p>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-jet/10 text-jet/50 font-body">
        Auto
      </span>
    </div>
  );
}
