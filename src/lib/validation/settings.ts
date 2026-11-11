// Per-key schemas for the admin settings page (step 7.4).
import { z } from 'zod';
import type { SettingKey } from '@/lib/settings';

const money = z.coerce.number().min(0).max(100000);

export const SETTING_SCHEMAS: Record<SettingKey, z.ZodTypeAny> = {
  vat_rate: z.coerce.number().min(0).max(0.5),
  free_delivery_threshold: money,
  shipping_rates: z.object({ standard: money, next_day: money }),
  promo_codes: z
    .array(
      z.object({
        code: z
          .string()
          .trim()
          .min(3)
          .max(30)
          .regex(/^[A-Z0-9_-]+$/i, 'Letters, numbers, - and _ only')
          .transform((s) => s.toUpperCase()),
        type: z.enum(['percent', 'fixed']),
        value: z.coerce.number().positive().max(1000),
        active: z.boolean(),
        minSpend: z.coerce.number().min(0).optional(),
      }),
    )
    .max(100)
    .refine((codes) => new Set(codes.map((c) => c.code)).size === codes.length, 'Promo codes must be unique'),
  company: z.object({
    name: z.string().trim().min(2).max(160),
    number: z.string().trim().max(20),
    vat: z.string().trim().max(20),
    address: z.string().trim().max(300).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional(),
  }),
  feature_flags: z.object({
    demo_banner: z.boolean(),
    blind_shipment: z.boolean(),
    hold_below_floor: z.boolean(),
  }),
  email_templates: z.record(z.string(), z.object({ subject: z.string().trim().min(3).max(200) })),
  mock_controls: z.object({
    fail_rate: z.coerce.number().min(0).max(1).nullable(),
    reject_skus: z.array(z.string().trim().min(1).max(60)).max(200),
  }),
  sync_interval_minutes: z.coerce.number().int().min(5).max(1440),
};
