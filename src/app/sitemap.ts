import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { getCatalogue } from '@/lib/catalogue/queries';
import { siteUrl } from '@/lib/site-url';

export const revalidate = 3600;

// sitemap.xml (step 8.3): static pages, every category and subcategory, every published product.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages = [
    '',
    '/shop',
    '/deals',
    '/education',
    '/about',
    '/contact',
    '/delivery',
    '/returns',
    '/warranty',
    '/privacy',
    '/terms',
    '/cookies',
  ];
  const products = await getCatalogue().catch(() => []);

  return [
    ...pages.map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.6,
    })),
    ...CATEGORIES.flatMap((c) => [
      { url: `${base}/c/${c.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
      ...c.subcategories.map((s) => ({
        url: `${base}/c/${c.slug}/${s.slug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
    ]),
    ...products.map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: p.createdAt ? new Date(p.createdAt) : now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
