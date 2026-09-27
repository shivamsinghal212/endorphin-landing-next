/**
 * Local helpers for the manage-event surfaces.
 *
 * All date/time output is pinned to IST so the organiser sees the same
 * numbers regardless of the device clock — matches the rest of the studio
 * after the React #418 hydration fix.
 */

const IST = 'Asia/Kolkata';

/** Paise → "₹1,44,600" or "₹5.85" — paise shown only when non-zero. */
export function formatINR(paise: number): string {
  const p = Number.isFinite(paise) ? paise : 0;
  // Exact to the paisa — payouts are fee-deducted, so ₹5.85 must not read ₹6.
  return `₹${(p / 100).toLocaleString('en-IN', {
    minimumFractionDigits: p % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "2 min ago" · "11 min ago" · "1 hr ago" · "Yesterday" · "May 19, 6:55 PM" (IST). */
export function relativeTime(iso: string): string {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - then.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  if (sec < 60) return 'Just now';
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hr${hr === 1 ? '' : 's'} ago`;
  // Compare calendar days in IST to decide "Yesterday".
  const istDay = (d: Date) =>
    d.toLocaleDateString('en-IN', { timeZone: IST });
  if (istDay(then) === istDay(new Date(now - 86_400_000))) return 'Yesterday';
  return then.toLocaleString('en-IN', {
    timeZone: IST,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function ageFromBirthdate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** "Jun 15" in IST. */
export function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', {
    timeZone: IST,
    month: 'short',
    day: 'numeric',
  });
}

export interface RegistrationLike {
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'free';
  resultStatus: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  registrationStatus: 'registered' | 'cancelled' | 'disqualified' | 'completed';
}

/** Smart label + pill class for the registrations status column.
 *  Registration-level cancellation wins over result/payment states —
 *  a cancelled row shouldn't show as "Verified" or "Registered" even if
 *  the underlying payment was once captured. */
export function statusChip(reg: RegistrationLike): {
  label: string;
  className: string;
} {
  const base =
    'inline-block text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium';
  if (reg.registrationStatus === 'cancelled') {
    return { label: 'Cancelled', className: `${base} bg-jet/10 text-jet/40` };
  }
  if (reg.registrationStatus === 'disqualified') {
    return { label: 'Disqualified', className: `${base} bg-signal/15 text-signal` };
  }
  if (reg.resultStatus === 'verified') {
    return { label: 'Verified', className: `${base} bg-emerald-100 text-emerald-700` };
  }
  if (reg.resultStatus === 'rejected') {
    return { label: 'Rejected', className: `${base} bg-signal/15 text-signal` };
  }
  if (reg.resultStatus === 'submitted') {
    return { label: 'Awaiting proof', className: `${base} bg-gold/20 text-gold` };
  }
  // not_submitted — show the payment lane
  if (reg.paymentStatus === 'paid' || reg.paymentStatus === 'free') {
    return { label: 'Registered', className: `${base} bg-jet/10 text-jet/60` };
  }
  if (reg.paymentStatus === 'pending') {
    return { label: 'Payment pending', className: `${base} bg-gold/20 text-gold` };
  }
  if (reg.paymentStatus === 'refunded') {
    return { label: 'Refunded', className: `${base} bg-jet/10 text-jet/60` };
  }
  if (reg.paymentStatus === 'failed') {
    return { label: 'Failed', className: `${base} bg-signal/15 text-signal` };
  }
  return { label: 'Registered', className: `${base} bg-jet/10 text-jet/60` };
}

/** "F · 32 · Mumbai" — collapses missing parts. */
export function describeRunner(user?: {
  gender: string | null;
  birthdate: string | null;
  city: string | null;
}): string {
  if (!user) return '';
  const parts: string[] = [];
  if (user.gender) {
    const g = user.gender.toLowerCase();
    parts.push(g === 'male' ? 'M' : g === 'female' ? 'F' : user.gender.slice(0, 1).toUpperCase());
  }
  const age = ageFromBirthdate(user.birthdate);
  if (age != null) parts.push(String(age));
  if (user.city) parts.push(user.city);
  return parts.join(' · ');
}

/** "AR" from "Anjali Rao". */
export function runnerInitials(name: string | null | undefined): string {
  if (!name) return '··';
  const bits = name.trim().split(/\s+/).filter(Boolean);
  if (bits.length === 0) return '··';
  if (bits.length === 1) return bits[0].slice(0, 2).toUpperCase();
  return (bits[0][0] + bits[bits.length - 1][0]).toUpperCase();
}
