// Checkout schema shared by the checkout form (React Hook Form) and POST /api/checkout (step 4.2).
import { z } from 'zod';

export const UK_POSTCODE =
  /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|[A-HK-Y][0-9]{1,2}|[0-9][A-HJKS-UW]|[A-HK-Y][0-9][ABEHMNPRV-Y]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
const UK_PHONE = /^(\+44\s?|0)[\d\s()-]{9,14}$/;

export function normalisePostcode(pc: string): string {
  const s = pc.replace(/\s+/g, '').toUpperCase();
  return s.length > 3 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
}

export const basketLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const checkoutDetailsSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address')
      .email('Enter a valid email address, like name@school.org.uk'),
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    phone: z.string().trim().regex(UK_PHONE, 'Enter a UK phone number, like 07700 900123'),
    company: z.string().trim().max(120).optional().or(z.literal('')),
    line1: z.string().trim().min(3, 'Enter the first line of your address').max(120),
    line2: z.string().trim().max(120).optional().or(z.literal('')),
    city: z.string().trim().min(2, 'Enter a town or city').max(80),
    postcode: z
      .string()
      .trim()
      .regex(UK_POSTCODE, 'Enter a valid UK postcode, like SW1A 1AA')
      .transform(normalisePostcode),
    deliveryMethod: z.enum(['standard', 'next_day']),
    deliveringToSchool: z.boolean(),
    schoolName: z.string().trim().max(160).optional().or(z.literal('')),
    schoolPoNumber: z.string().trim().max(60).optional().or(z.literal('')),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue' }) }),
  })
  .superRefine((v, ctx) => {
    if (v.deliveringToSchool && !v.schoolName) {
      ctx.addIssue({ code: 'custom', path: ['schoolName'], message: 'Enter the school name' });
    }
  });

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;
export type CheckoutDetailsInput = z.input<typeof checkoutDetailsSchema>;

export const checkoutRequestSchema = z.object({
  details: checkoutDetailsSchema,
  lines: z.array(basketLineSchema).min(1, 'Your basket is empty').max(50),
  promoCode: z.string().trim().max(40).optional().nullable(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const basketQuoteSchema = z.object({
  lines: z.array(basketLineSchema).max(50),
  promoCode: z.string().trim().max(40).optional().nullable(),
  deliveryMethod: z.enum(['standard', 'next_day']).optional(),
});
