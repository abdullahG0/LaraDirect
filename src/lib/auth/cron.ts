// Cron route guard (step 2.7): requires `Authorization: Bearer $CRON_SECRET`.
// Vercel Cron sends exactly this header when CRON_SECRET is set in the project.
import { timingSafeEqual } from 'node:crypto';
import { apiError } from '@/lib/utils/errors';

export function checkCronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!secret || !given) return apiError('UNAUTHORIZED', 'Missing or invalid cron secret', 401);
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return apiError('UNAUTHORIZED', 'Missing or invalid cron secret', 401);
  return null;
}
