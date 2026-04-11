'use client';

import { useSession } from 'next-auth/react';

/** Get the backend JWT token from the NextAuth session. */
export function useAdminToken(): string | null {
  const { data: session } = useSession();
  return (session as unknown as Record<string, unknown>)?.backendToken as string | null;
}
