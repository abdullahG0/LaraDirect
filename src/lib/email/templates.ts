// Customer email templates (spec §8.1 step 4, §10.4). Plain, short British English.
// Rendered to both text and minimal inline-styled HTML; no remote images or fonts.
import { formatGBP } from '@/lib/utils/money';

export type TemplateName =
  | 'order_confirmation'
  | 'order_dispatched'
  | 'order_delivered'
  | 'order_problem'
  | 'admin_alert'
  | 'contact_message';

export interface EmailLine {
  name: string;
  quantity: number;
  unitPriceIncVat: number;
}

export interface OrderEmailPayload {
  orderNumber: string;
  customerName: string;
  trackingUrl: string; // link to /order/[n]?token=
  lines?: EmailLine[];
  totalIncVat?: number;
  deliveryMethod?: string;
  carrier?: string;
  trackingNumber?: string;
  carrierTrackingUrl?: string;
  message?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fillSubject(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}

function layout(
  heading: string,
  paragraphs: string[],
  extraHtml = '',
  cta?: { label: string; href: string },
) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('');
  const button = cta
    ? `<p style="margin:20px 0"><a href="${esc(cta.href)}" style="background:#22D3EE;color:#0E1E3E;padding:12px 22px;border-radius:999px;font-weight:600;text-decoration:none;display:inline-block">${esc(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F4F6F9;font-family:Arial,Helvetica,sans-serif;color:#0F172A">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0E1E3E;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:700;font-size:20px">LaraDirect</div>
<div style="background:#fff;padding:24px 20px;border-radius:0 0 12px 12px;line-height:1.6">
<h1 style="font-size:20px;margin:0 0 16px;color:#0E1E3E">${esc(heading)}</h1>${body}${extraHtml}${button}
</div>
<p style="font-size:12px;color:#475569;margin-top:16px">You're receiving this because you placed an order at LaraDirect.</p>
</div></body></html>`;
}

function linesTable(lines: EmailLine[], total?: number) {
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${l.quantity} × ${esc(l.name)}</td><td style="padding:6px 0;text-align:right">${formatGBP(l.unitPriceIncVat * l.quantity)}</td></tr>`,
    )
    .join('');
  const totalRow =
    total !== undefined
      ? `<tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-weight:700">Total (inc VAT)</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-weight:700">${formatGBP(total)}</td></tr>`
      : '';
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 16px">${rows}${totalRow}</table>`;
}

function linesText(lines: EmailLine[], total?: number) {
  const out = lines.map((l) => `  ${l.quantity} x ${l.name}  ${formatGBP(l.unitPriceIncVat * l.quantity)}`);
  if (total !== undefined) out.push(`  Total (inc VAT): ${formatGBP(total)}`);
  return out.join('\n');
}

export function renderOrderEmail(
  template: Exclude<TemplateName, 'admin_alert' | 'contact_message'>,
  p: OrderEmailPayload,
  subjectTemplate: string,
): RenderedEmail {
  const subject = fillSubject(subjectTemplate, { orderNumber: p.orderNumber, name: p.customerName });
  const hi = `Hi ${p.customerName.split(' ')[0] || 'there'},`;
  let heading: string;
  let paras: string[];
  let extraHtml = '';
  let extraText = '';
  const cta = { label: 'Track your order', href: p.trackingUrl };

  switch (template) {
    case 'order_confirmation':
      heading = `Thanks for your order ${p.orderNumber}`;
      paras = [
        hi,
        "We've received your order and payment. We'll email you again as soon as it's dispatched, usually within 1–2 working days.",
      ];
      if (p.lines?.length) {
        extraHtml = linesTable(p.lines, p.totalIncVat);
        extraText = `\n${linesText(p.lines, p.totalIncVat)}\n`;
      }
      break;
    case 'order_dispatched':
      heading = 'Your order is on its way';
      paras = [
        hi,
        `Good news: order ${p.orderNumber} has been dispatched${p.carrier ? ` with ${p.carrier}` : ''}.`,
        ...(p.trackingNumber ? [`Tracking number: ${p.trackingNumber}`] : []),
      ];
      break;
    case 'order_delivered':
      heading = 'Your order has been delivered';
      paras = [
        hi,
        `Order ${p.orderNumber} has been delivered. We hope it's just what your classroom needed.`,
        'If anything is not right, reply to this email or use the help link on your order page. You have 30 days to return items.',
      ];
      break;
    case 'order_problem':
      heading = "We're sorting out a problem with your order";
      paras = [
        hi,
        `There's a problem with order ${p.orderNumber}. Our team has been alerted and is on it, and we'll be in touch shortly.`,
        "You don't need to do anything right now.",
      ];
      break;
  }

  const text = [
    heading,
    '',
    ...paras,
    extraText,
    `Track your order: ${p.trackingUrl}`,
    '',
    'LaraDirect',
  ].join('\n');
  return { subject, text, html: layout(heading, paras, extraHtml, cta) };
}

export function renderAdminAlert(title: string, message: string, link?: string): RenderedEmail {
  return {
    subject: `[LaraDirect admin] ${title}`,
    text: `${title}\n\n${message}${link ? `\n\n${link}` : ''}`,
    html: layout(title, [message], '', link ? { label: 'Open in admin', href: link } : undefined),
  };
}

export function renderContactMessage(kind: string, fields: Record<string, string>): RenderedEmail {
  const lines = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return {
    subject: `[LaraDirect] New ${kind}`,
    text: lines.join('\n'),
    html: layout(`New ${kind}`, lines),
  };
}
