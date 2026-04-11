import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow whitelisted admin emails
      return ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');
    },
    async jwt({ token, account }) {
      // On first sign-in, get a backend JWT token
      if (account?.id_token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run'}/api/v1/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          });
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.token;
          }
        } catch (e) {
          console.error('Failed to get backend token:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).backendToken = token.backendToken;
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
});
