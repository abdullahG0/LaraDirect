import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrLinkCustomer } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { HttpError, handle, parseBody } from '@/lib/utils/errors';
import { normalisePostcode, UK_POSTCODE } from '@/lib/validation/checkout';

export const dynamic = 'force-dynamic';

async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in');
  const db = createServiceClient();
  const customer = await getOrLinkCustomer(db, user);
  if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Account not found');
  return { db, customer, user };
}

const detailsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  organisation: z.string().trim().max(160).optional().or(z.literal('')),
});

// PATCH /api/account: update name, phone, school.
export const PATCH = handle(async (req: Request) => {
  const { db, customer } = await requireCustomer();
  const body = await parseBody(req, detailsSchema);
  await db
    .from('customers')
    .update({ full_name: body.fullName, phone: body.phone || null, organisation: body.organisation || null })
    .eq('id', customer.id);
  return NextResponse.json({ ok: true });
});

const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(80),
  postcode: z.string().trim().regex(UK_POSTCODE, 'Enter a valid UK postcode').transform(normalisePostcode),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

// POST /api/account: add a saved address.
export const POST = handle(async (req: Request) => {
  const { db, customer } = await requireCustomer();
  const a = await parseBody(req, addressSchema);
  if (a.isDefault) await db.from('addresses').update({ is_default: false }).eq('customer_id', customer.id);
  const { data, error } = await db
    .from('addresses')
    .insert({
      customer_id: customer.id,
      name: a.name,
      line1: a.line1,
      line2: a.line2 || null,
      city: a.city,
      postcode: a.postcode,
      phone: a.phone || null,
      is_default: a.isDefault,
    })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  return NextResponse.json(data);
});

// DELETE /api/account?address=<id>: remove a saved address (own addresses only).
export const DELETE = handle(async (req: Request) => {
  const { db, customer } = await requireCustomer();
  const id = new URL(req.url).searchParams.get('address');
  if (!id) throw new HttpError(400, 'VALIDATION', 'Missing address id');
  await db.from('addresses').delete().eq('id', id).eq('customer_id', customer.id);
  return NextResponse.json({ ok: true });
});
