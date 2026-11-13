import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

// robots.txt (step 8.3). The demo is not indexed; set NEXT_PUBLIC_DEMO_MODE=false at launch.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
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
