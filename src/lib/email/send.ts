// sendEmail (step 5.4). Every email is written to the `outbox` table (the demo's email log and
// the admin "resend" source). When RESEND_API_KEY is set it is also sent through Resend;
// otherwise it is printed to the server console.
import { Resend } from 'resend';
import type { Db, Json } from '@/lib/supabase/db';
import type { RenderedEmail, TemplateName } from './templates';

export interface SendEmailInput {
  to: string;
  template: TemplateName;
  email: RenderedEmail;
  orderId?: string;
  data?: Record<string, unknown>;
}

const FROM = process.env.EMAIL_FROM ?? 'LaraDirect <orders@laradirect.example>';

export async function sendEmail(
  db: Db,
  input: SendEmailInput,
): Promise<{ id: number | null; delivered: boolean }> {
  let delivered = false;
  const key = process.env.RESEND_API_KEY;

  if (key) {
    try {
      const resend = new Resend(key);
      const { error } = await resend.emails.send({
        from: FROM,
        to: input.to,
        subject: input.email.subject,
        text: input.email.text,
        html: input.email.html,
      });
      if (error) throw new Error(error.message);
      delivered = true;
    } catch (err) {
      console.error(`email to ${input.to} failed: ${(err as Error).message}`);
    }
  } else if (process.env.NODE_ENV !== 'test') {
    console.info(`[email:${input.template}] to=${input.to} subject="${input.email.subject}"`);
  }

  const { data, error } = await db
    .from('outbox')
    .insert({
      to_email: input.to,
      subject: input.email.subject,
      template: input.template,
      payload: {
        orderId: input.orderId ?? null,
        text: input.email.text,
        html: input.email.html,
        delivered,
        ...(input.data ?? {}),
      } as Json,
      sent_at: delivered || !key ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error) console.error(`outbox write failed: ${error.message}`);
  return { id: data?.id ?? null, delivered };
}
