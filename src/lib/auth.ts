import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { cookies } from 'next/headers';

const SUPER_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/** True if the JWT looks expired (exp claim < now). Returns true on parse
 *  failure to be safe — caller should treat that as "needs refresh". */
function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as { exp?: number };
    if (!payload.exp) return false; // no exp claim — assume long-lived
    // Treat anything within 60s of expiry as already expired.
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn() {
      // Anyone with a Google account can sign in. Authorization for what they
      // can do is determined per-resource: super-admin features check
      // SUPER_ADMIN_EMAILS, club ownership comes from /clubs/mine on the
      // backend.
      return true;
    },
    async jwt({ token, account }) {
      // On first sign-in, exchange Google id_token for our backend JWT.
      if (account?.id_token) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run'}/api/v1/auth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            },
          );
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.accessToken;
          }
        } catch (e) {
          console.error('Failed to get backend token:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      const s = session as unknown as Record<string, unknown>;

      // Prefer the landing-site session cookie when present and fresher than
      // our stored token. This unifies auth across the two surfaces and
      // avoids "invalid token" when NextAuth's stored JWT goes stale (it
      // only re-exchanges on first sign-in).
      let backendToken = token.backendToken as string | undefined;
      try {
        const store = await cookies();
        const landingToken = store.get('endorfin_session')?.value;
        if (landingToken) {
          const storedExpired = isJwtExpired(backendToken);
          const landingExpired = isJwtExpired(landingToken);
          if (!landingExpired && (storedExpired || !backendToken)) {
            backendToken = landingToken;
          }
        }
      } catch {
        // cookies() can throw outside a request scope — fall back to stored
        // token quietly.
      }

      s.backendToken = backendToken;
      s.isSuperAdmin = isSuperAdminEmail(session.user?.email);
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
});
