import type { MetadataRoute } from 'next';

// robots.txt (step 8.3). The demo is not indexed; set NEXT_PUBLIC_DEMO_MODE=false at launch.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  return {
    rules: demo
      ? { userAgent: '*', disallow: '/' }
      : {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/api', '/account', '/basket', '/checkout', '/order'],
        },
    sitemap: `${base}/sitemap.xml`,
  };
}
