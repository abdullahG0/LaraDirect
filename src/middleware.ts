import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// First gate only (spec §14). Every admin page and handler ALSO checks the role server-side.
//   - Refreshes the Supabase session cookie.
//   - Sends signed-out visitors from /admin/* to /admin/login (and 401s /api/admin/*).
//   - CSRF: mutating /api/* requests must come from this site (Origin / Sec-Fetch-Site).
//     Webhooks and cron are exempt: they authenticate with signatures and secrets instead.

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT = ['/api/webhooks/', '/api/cron/'];

function json(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === req.headers.get('host');
    } catch {
      return false;
    }
  }
  const site = req.headers.get('sec-fetch-site');
  return !site || site === 'same-origin' || site === 'none';
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api/') && MUTATING.has(req.method) && !CSRF_EXEMPT.some((p) => path.startsWith(p))) {
    if (!sameOrigin(req)) return json(403, 'CSRF', 'Cross-site request blocked');
  }

  const needsSession =
    path.startsWith('/admin') || path.startsWith('/api/admin') || path.startsWith('/account');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!needsSession || !url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
        cookies.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (path.startsWith('/api/admin')) return json(401, 'UNAUTHORIZED', 'Please sign in');
    if (path.startsWith('/admin') && path !== '/admin/login') {
      const login = req.nextUrl.clone();
      login.pathname = '/admin/login';
      login.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
      return NextResponse.redirect(login);
    }
  }
  return res;
}

export const config = { matcher: ['/admin/:path*', '/api/:path*', '/account/:path*', '/account'] };
