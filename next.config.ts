import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's3.ap-south-1.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/ggm26-ig',
        destination:
          '/races/7th_edition_gurugram_grand_half_marathon_2026_36780?utm_source=instagram&utm_medium=social&utm_campaign=gurugram_half_2026',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
