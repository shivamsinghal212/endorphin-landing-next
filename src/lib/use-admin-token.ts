'use client';

import { useSession } from 'next-auth/react';
import { useStudioAuth } from '@/lib/studio/auth-context';

type ExtendedSession = {
  backendToken?: string | null;
  isSuperAdmin?: boolean;
};

/** Get the backend JWT token. Inside the studio (where StudioAuthProvider
 *  wraps the tree) this returns the unified marketing/NextAuth token.
 *  Outside the studio (super-admin pages) it falls back to NextAuth's
 *  session token. */
export function useAdminToken(): string | null {
  const studio = useStudioAuth();
  const { data: session } = useSession();
  if (studio?.token) return studio.token;
  return ((session as unknown as ExtendedSession)?.backendToken as string) ?? null;
}

/** True when the signed-in user is a platform super-admin. */
export function useIsSuperAdmin(): boolean {
  const studio = useStudioAuth();
  const { data: session } = useSession();
  if (studio) return studio.isSuperAdmin;
  return Boolean((session as unknown as ExtendedSession)?.isSuperAdmin);
}
