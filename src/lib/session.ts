import 'server-only';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'endorfin_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionEmail(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return emailFromToken(token);
}

function emailFromToken(token: string): string | null {
  return claimsFromToken(token)?.email ?? null;
}

export interface JwtClaims {
  email?: string;
  name?: string;
  picture?: string;
  pictureUrl?: string;
  exp?: number;
  sub?: string;
  [k: string]: unknown;
}

export function claimsFromToken(token: string | null | undefined): JwtClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const claims = claimsFromToken(token);
  if (!claims?.exp) return false; // no exp → assume long-lived
  return claims.exp * 1000 < Date.now() + 60_000;
}

const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdminEmail(email: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

async function hasAny(token: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      // Cache per-token for a minute so we don't hammer the API on every page.
      next: { revalidate: 60 },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) return data.length > 0;
    if (data && typeof data === 'object') {
      const maybeItems = (data as { items?: unknown[]; total?: number }).items;
      if (Array.isArray(maybeItems)) return maybeItems.length > 0;
      const total = (data as { total?: number }).total;
      if (typeof total === 'number') return total > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/** True when the signed-in user can access /admin/studio (club admin, event
 *  organiser, or platform super-admin). Cached per-token for ~60s. */
export async function getCanAccessStudio(): Promise<boolean> {
  const token = await getSessionToken();
  if (!token) return false;
  if (isSuperAdminEmail(emailFromToken(token))) return true;
  const [hasClubs, hasEvents] = await Promise.all([
    hasAny(token, '/api/v1/clubs/mine?role=admin'),
    hasAny(token, '/api/v1/events/my?page=1&limit=1'),
  ]);
  return hasClubs || hasEvents;
}
