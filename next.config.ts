import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's3.ap-south-1.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      // Cloudflare R2/Workers media bucket (studio event covers, gallery).
      { protocol: 'https', hostname: '**.workers.dev' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Club detail pages are ISR'd with revalidate=60. Emit an
        // explicit CDN-friendly Cache-Control so any non-Vercel host
        // (or downstream proxy) caches the HTML for ~1m and serves the
        // stale-while-revalidate copy for up to an hour.
        source: '/clubs/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Experience events share the running-events route tree — only the
        // public URL prefix differs. eventPath() renders /experiences/...
        // links; this rewrite makes them resolve. Canonical tags (set
        // per-event from event.category) disambiguate for SEO.
        source: '/experiences/:path*',
        destination: '/running-events/:path*',
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/races',
        destination: '/running-events',
        permanent: true,
      },
      {
        source: '/races/:path*',
        destination: '/running-events/:path*',
        permanent: true,
      },
      {
        source: '/ggm26-ig',
        destination:
          '/running-events/7th_edition_gurugram_grand_half_marathon_2026_36780?utm_source=instagram&utm_medium=social&utm_campaign=gurugram_half_2026',
        permanent: false,
      },
      {
        source: '/mbe-ig',
        destination:
          '/clubs/mberunclub?utm_source=instagram&utm_medium=social&utm_campaign=mbe_run_club',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
