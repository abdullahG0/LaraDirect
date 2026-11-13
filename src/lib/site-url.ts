// Absolute site URL (no trailing slash) for metadata, sitemap, emails and Stripe redirects.
// NEXT_PUBLIC_SITE_URL wins; a blank value counts as unset. On Vercel it falls back to the
// project's production domain (or this deployment's URL), which Vercel sets automatically.
export function siteUrl(): string {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000');
  return url.replace(/\/$/, '');
}
