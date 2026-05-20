'use client';

import type { ShippingAddress } from '@/lib/runner-api';

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white text-jet focus:border-jet outline-none';

export const EMPTY_SHIPPING: ShippingAddress = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

export function validateShipping(
  s: ShippingAddress,
): { ok: true } | { ok: false; reason: string } {
  if (!s.name.trim()) return { ok: false, reason: 'Recipient name is required.' };
  if (!s.line1.trim()) return { ok: false, reason: 'Address line 1 is required.' };
  if (!s.city.trim()) return { ok: false, reason: 'City is required.' };
  if (!s.state.trim()) return { ok: false, reason: 'State is required.' };
  if (!/^\d{6}$/.test(s.pincode.trim())) {
    return { ok: false, reason: 'Pincode must be 6 digits.' };
  }
  if (!/^\d{10}$/.test(s.phone.trim())) {
    return { ok: false, reason: 'Phone must be 10 digits.' };
  }
  return { ok: true };
}

export function ShippingAddressFields({
  value,
  onChange,
  title,
  hint,
}: {
  value: ShippingAddress;
  onChange: (next: ShippingAddress) => void;
  title?: string;
  hint?: string;
}) {
  const set = <K extends keyof ShippingAddress>(key: K, v: ShippingAddress[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <section className="bg-white border border-jet/10 rounded-2xl p-5 md:p-6 mb-4">
      <div className="mb-4">
        <p className="font-display uppercase text-sm font-bold text-jet">
          {title ?? 'Shipping address'}
        </p>
        {hint && <p className="text-xs text-jet/60 mt-0.5">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            Recipient name *
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
            autoComplete="shipping name"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            Address line 1 *
          </span>
          <input
            type="text"
            value={value.line1}
            onChange={(e) => set('line1', e.target.value)}
            placeholder="House / flat, building, street"
            className={inputCls}
            autoComplete="shipping address-line1"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            Address line 2
          </span>
          <input
            type="text"
            value={value.line2 ?? ''}
            onChange={(e) => set('line2', e.target.value)}
            placeholder="Locality, landmark (optional)"
            className={inputCls}
            autoComplete="shipping address-line2"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            City *
          </span>
          <input
            type="text"
            value={value.city}
            onChange={(e) => set('city', e.target.value)}
            className={inputCls}
            autoComplete="shipping address-level2"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            State *
          </span>
          <select
            value={value.state}
            onChange={(e) => set('state', e.target.value)}
            className={inputCls}
          >
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            Pincode *
          </span>
          <input
            type="text"
            value={value.pincode}
            onChange={(e) =>
              set('pincode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
            }
            inputMode="numeric"
            className={inputCls}
            autoComplete="shipping postal-code"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-jet/60 mb-1">
            Phone (10 digits) *
          </span>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) =>
              set('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
            }
            inputMode="numeric"
            className={inputCls}
            autoComplete="shipping tel"
          />
        </label>
      </div>
    </section>
  );
}
