import posthog from 'posthog-js';

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (!token) {
  // Loud-fail in any env where the token is missing — almost always means
  // NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN wasn't set on the deploy platform
  // (Vercel/Netlify/etc) or `npm run dev` wasn't restarted after editing
  // .env.local. Without the token PostHog silently drops every event.
  // eslint-disable-next-line no-console
  console.error(
    '[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is undefined — events will not be captured.',
  );
} else {
  posthog.init(token, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
}
