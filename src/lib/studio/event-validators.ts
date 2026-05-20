/**
 * Pure validators for organiser event fields. Every function returns a
 * uniform `{ ok, error? }` shape so callers can wire results into inline
 * field errors without inventing per-call try/catch branches.
 *
 * No side effects, no DOM access — safe to import on the server.
 */

export type ValidationResult = { ok: true } | { ok: false; error: string };

const ok: ValidationResult = { ok: true };
const fail = (error: string): ValidationResult => ({ ok: false, error });

// ── Slug ───────────────────────────────────────────────────────────────────
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function validateSlug(s: string): ValidationResult {
  if (typeof s !== 'string' || !s) return fail('Slug is required');
  if (s.length < 3) return fail('Slug must be at least 3 characters');
  if (s.length > 120) return fail('Slug must be 120 characters or fewer');
  if (!SLUG_RE.test(s))
    return fail(
      'Use lowercase letters, numbers and hyphens only — no spaces or punctuation',
    );
  if (s.includes('--')) return fail('Slug cannot contain consecutive hyphens');
  if (s.endsWith('-')) return fail('Slug cannot end with a hyphen');
  return ok;
}

// ── Coupon code ────────────────────────────────────────────────────────────
const COUPON_RE = /^[A-Z0-9_-]{3,32}$/;

export function validateCouponCode(s: string): ValidationResult {
  if (typeof s !== 'string' || !s) return fail('Coupon code is required');
  if (!COUPON_RE.test(s))
    return fail(
      'Use 3–32 uppercase letters, numbers, underscores or hyphens',
    );
  return ok;
}

// ── Discount percent ───────────────────────────────────────────────────────
export function validateDiscountPercent(n: number): ValidationResult {
  if (typeof n !== 'number' || !Number.isFinite(n))
    return fail('Discount must be a number');
  if (!Number.isInteger(n)) return fail('Discount must be a whole number');
  if (n < 1 || n > 100) return fail('Discount must be between 1 and 100');
  return ok;
}

// ── Hex color ──────────────────────────────────────────────────────────────
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function validateHexColor(s: string): ValidationResult {
  if (typeof s !== 'string' || !s) return fail('Colour is required');
  if (s.length !== 7) return fail('Use a 7-character hex like #E6232A');
  if (!HEX_RE.test(s)) return fail('Not a valid hex colour (expected #RRGGBB)');
  return ok;
}

// ── Date helpers ───────────────────────────────────────────────────────────
function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export type DateWindow = {
  openAt: Date | string | null | undefined;
  closeAt: Date | string | null | undefined;
};

export function validateDateWindow(
  win: DateWindow,
  opts: { closeOptional?: boolean } = {},
): ValidationResult {
  const open = toTime(win.openAt);
  const close = toTime(win.closeAt);
  if (open === null) return fail('Open date is required');
  if (close === null) {
    return opts.closeOptional ? ok : fail('Close date is required');
  }
  if (close < open) return fail('Close date must be on or after open date');
  return ok;
}

export type RunWindow = {
  start: Date | string | null | undefined;
  end: Date | string | null | undefined;
};

export function validateRunWindow(win: RunWindow): ValidationResult {
  const start = toTime(win.start);
  const end = toTime(win.end);
  if (start === null) return fail('Run window start is required');
  if (end === null) return fail('Run window end is required');
  if (end < start) return fail('Run window end must be on or after the start');
  return ok;
}

export type ConsistencyWindow = {
  regOpen: Date | string | null | undefined;
  regClose: Date | string | null | undefined;
  runStart: Date | string | null | undefined;
  runEnd: Date | string | null | undefined;
};

/**
 * Validates registration and run windows. They are NOT cross-coupled —
 * a virtual event can leave registration open while runners are already
 * starting (e.g. "register any time, run any time before X"). The only
 * relationships enforced are within each window:
 *   - registration close (if set) must be on/after registration open
 *   - run window end must be on/after run window start
 *
 * Pass `regCloseOptional: true` for virtual events where the organiser
 * gates new signups via the `acceptingRegistrations` toggle instead of
 * a hard close date.
 */
export function validateWindowsConsistent(
  win: ConsistencyWindow,
  opts: { regCloseOptional?: boolean } = {},
): ValidationResult {
  const reg = validateDateWindow(
    { openAt: win.regOpen, closeAt: win.regClose },
    { closeOptional: opts.regCloseOptional },
  );
  if (!reg.ok) return reg;
  const run = validateRunWindow({ start: win.runStart, end: win.runEnd });
  if (!run.ok) return run;
  return ok;
}

// ── Phone (India-focused, accepts common international shapes) ────────────
// Accepts forms like "+91 98200 12345", "+919820012345", "9820012345",
// "09820012345". Strips spaces, hyphens, parens, dots, then validates the
// digit sequence. For Indian numbers the leading mobile digit must be 6–9.
export function validatePhone(s: string, opts: { required?: boolean } = {}): ValidationResult {
  if (typeof s !== 'string') return fail('Enter a phone number');
  const trimmed = s.trim();
  if (!trimmed) return opts.required ? fail('Phone is required') : ok;

  // Keep the leading +, strip everything except digits.
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  if (!digits) return fail('Enter a valid phone number');

  // Detect Indian-shaped numbers and enforce the leading-mobile-digit rule.
  let local: string | null = null;
  if (hasPlus && digits.startsWith('91') && digits.length === 12) local = digits.slice(2);
  else if (!hasPlus && digits.length === 10) local = digits;
  else if (!hasPlus && digits.startsWith('0') && digits.length === 11) local = digits.slice(1);

  if (local !== null) {
    if (local.length !== 10) return fail('Indian mobile numbers must be 10 digits');
    if (!/^[6-9]/.test(local))
      return fail('Indian mobile numbers must start with 6, 7, 8 or 9');
    if (/^(\d)\1{9}$/.test(local)) return fail('That doesn’t look like a real number');
    return ok;
  }

  // Non-Indian / unknown country: just sanity-check total length.
  const total = hasPlus ? digits.length : digits.length;
  if (total < 7) return fail('Phone number is too short');
  if (total > 15) return fail('Phone number is too long');
  return ok;
}

// ── Bib prefix ─────────────────────────────────────────────────────────────
const BIB_RE = /^[A-Z0-9]{1,8}$/;

export function validateBibPrefix(s: string): ValidationResult {
  if (typeof s !== 'string' || !s) return fail('Bib prefix is required');
  if (!BIB_RE.test(s))
    return fail('Use 1–8 uppercase letters or numbers (no spaces or symbols)');
  return ok;
}

// ── Image (file-level, not dimensions) ─────────────────────────────────────
export type ImageValidationOpts = {
  maxMB: number;
  accept: string[];
};

export function validateImage(
  file: File,
  opts: ImageValidationOpts,
): ValidationResult {
  if (!file) return fail('No file selected');
  if (!opts.accept.includes(file.type))
    return fail(`Unsupported file type (${file.type || 'unknown'})`);
  const maxBytes = opts.maxMB * 1024 * 1024;
  if (file.size > maxBytes)
    return fail(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB, max ${opts.maxMB} MB)`,
    );
  return ok;
}
