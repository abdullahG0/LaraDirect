import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/send';
import { renderContactMessage } from '@/lib/email/templates';
import { getSettings } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/server';
import { HttpError, handle, parseBody } from '@/lib/utils/errors';
import { clientIp, rateLimit } from '@/lib/utils/rate-limit';

// POST /api/contact: contact form and school bulk-quote requests (step 8.1).
// Messages go to the outbox (and to Resend when configured), addressed to the company email.
const schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('contact'),
    name: z.string().trim().min(2, 'Enter your name').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    orderNumber: z.string().trim().max(30).optional(),
    message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(3000),
    website: z.string().max(0).optional(), // honeypot
  }),
  z.object({
    kind: z.literal('quote'),
    name: z.string().trim().min(2, 'Enter your name').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    school: z.string().trim().min(2, 'Enter your school or trust').max(160),
    phone: z.string().trim().max(30).optional(),
    items: z.string().trim().min(5, 'Tell us what you need').max(3000),
    budget: z.string().trim().max(60).optional(),
    deadline: z.string().trim().max(60).optional(),
    website: z.string().max(0).optional(),
  }),
]);

export const POST = handle(async (req: Request) => {
  const rl = rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok) throw new HttpError(429, 'RATE_LIMITED', 'Too many messages. Please try again later.');
  const body = await parseBody(req, schema);
  const db = createServiceClient();
  const settings = await getSettings(db);
  const { kind, website: _hp, ...fields } = body;
  await sendEmail(db, {
    to: settings.company.email || 'hello@laradirect.example',
    template: 'contact_message',
    email: renderContactMessage(
      kind === 'quote' ? 'bulk quote request' : 'contact message',
      fields as Record<string, string>,
    ),
    data: { kind, replyTo: fields.email },
  });
  return NextResponse.json({ ok: true });
});
