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
  const update = (i: number, patch: Partial<ClubAdminPerson>) =>
    onChange(admins.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => onChange(admins.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...admins,
      { name: '', role: '', avatarUrl: '', whatsappUrl: '', instagramUrl: '', stravaUrl: '' },
    ]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= admins.length) return;
    const next = [...admins];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  if (admins.length === 0) {
    return (
      <div>
        <p className="font-body text-sm text-jet/50 mb-3">No admins yet.</p>
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-jet text-bone text-sm font-body font-medium hover:bg-jet/90 transition-colors cursor-pointer"
        >
          + Add admin
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {admins.map((a, i) => (
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
                    disabled={i === admins.length - 1}
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
      <button
        type="button"
        onClick={add}
        className="w-full px-3 py-2 rounded-lg bg-white border border-dashed border-jet/20 text-jet/70 text-sm font-body font-medium hover:bg-jet/5 transition-colors cursor-pointer"
      >
        + Add admin
      </button>
    </div>
  );
}
