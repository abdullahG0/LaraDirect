import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { SETTING_KEYS } from '@/lib/settings';
import { SETTINGS_TAG } from '@/lib/settings-server';
import type { Json } from '@/lib/supabase/db';
import { HttpError, parseBody, parseWith } from '@/lib/utils/errors';
import { SETTING_SCHEMAS } from '@/lib/validation/settings';

export const dynamic = 'force-dynamic';

// PUT /api/admin/settings { key, value } (owner only, step 7.4). Audited; storefront caches refresh.
const schema = z.object({ key: z.enum(SETTING_KEYS), value: z.unknown() });

export const PUT = withAdmin('settings.manage', async (req, { admin, db }) => {
  const { key, value } = await parseBody(req, schema);
  if (key === 'mock_controls' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    throw new HttpError(403, 'FORBIDDEN', 'Failure injection is only available in demo mode');
  }
  const parsed = parseWith(SETTING_SCHEMAS[key], value);
  const { data: before } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  const { error } = await db.from('settings').upsert({ key, value: parsed as Json }, { onConflict: 'key' });
  if (error) throw new HttpError(500, 'DB', error.message);
  await audit(db, admin, 'setting.update', 'setting', key, before?.value ?? null, parsed);
  revalidateTag(SETTINGS_TAG);
  return NextResponse.json({ ok: true, value: parsed });
});
