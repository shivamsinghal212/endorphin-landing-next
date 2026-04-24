import type { MetadataRoute } from 'next';

const SITE = 'https://www.endorfin.run';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

type ListedClub = { slug: string; name: string; city: string; updatedAt: string | null };

// Cached at edge for 1h so the sitemap isn't hammered by crawlers.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE}/races`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE}/clubs`,   lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE}/runners`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${SITE}/workout-plan`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/privacy`, lastModified: new Date('2026-04-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/terms`,   lastModified: new Date('2026-04-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/support`, lastModified: new Date('2026-04-10'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const res = await fetch(`${API_BASE}/api/v1/clubs`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const clubs = (await res.json()) as ListedClub[];
      for (const c of clubs) {
        staticRoutes.push({
          url: `${SITE}/clubs/${c.slug}`,
          lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // If the backend is unreachable at build/revalidate time, ship the
    // static routes rather than failing the sitemap entirely.
  }

  return staticRoutes;
}
