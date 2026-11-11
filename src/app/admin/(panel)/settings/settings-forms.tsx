'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { PromoCode, SettingKey, StoreSettings } from '@/lib/settings';

const fieldCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState<SettingKey | null>(null);
  const save = async (key: SettingKey, value: unknown, label: string) => {
    setBusy(key);
    const r = await runAction(
      () => adminFetch('/api/admin/settings', { method: 'PUT', body: { key, value } }),
      { success: `${label} saved` },
    );
    setBusy(null);
    if (r) router.refresh();
  };
  return { save, busy };
}

function SaveButton({ busy, disabled, onClick }: { busy: boolean; disabled: boolean; onClick: () => void }) {
  if (disabled) return null;
  return (
    <Button size="sm" onClick={onClick} disabled={busy}>
      {busy && <Loader2 className="animate-spin" />} Save
    </Button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SettingsForms({
  settings,
  distributor,
  demoMode,
  envFailRate,
  envRejectSkus,
}: {
  settings: StoreSettings;
  distributor: { name: string; mode: string };
  demoMode: boolean;
  envFailRate: string;
  envRejectSkus: string;
}) {
  const { can } = useAdmin();
  const readOnly = !can('settings.manage');
  const { save, busy } = useSave();

  const [vat, setVat] = useState(String(settings.vatRate * 100));
  const [threshold, setThreshold] = useState(String(settings.freeDeliveryThreshold));
  const [rates, setRates] = useState({
    standard: String(settings.shippingRates.standard),
    next_day: String(settings.shippingRates.next_day),
  });
  const [promos, setPromos] = useState<PromoCode[]>(settings.promoCodes);
  const [company, setCompany] = useState(settings.company);
  const [flags, setFlags] = useState(settings.featureFlags);
  const [templates, setTemplates] = useState(settings.emailTemplates);
  const [failRate, setFailRate] = useState(
    settings.mockControls.fail_rate === null ? '' : String(settings.mockControls.fail_rate * 100),
  );
  const [rejects, setRejects] = useState(settings.mockControls.reject_skus.join(', '));
  const [interval, setIntervalMin] = useState(String(settings.syncIntervalMinutes));

  return (
    <fieldset disabled={readOnly} className="grid gap-4 xl:grid-cols-2">
      <Panel
        title="Tax and delivery"
        actions={
          <SaveButton
            busy={busy === 'shipping_rates'}
            disabled={readOnly}
            onClick={async () => {
              await save('vat_rate', Number(vat) / 100, 'VAT rate');
              await save('free_delivery_threshold', Number(threshold), 'Free delivery threshold');
              await save(
                'shipping_rates',
                { standard: Number(rates.standard), next_day: Number(rates.next_day) },
                'Delivery rates',
              );
            }}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="VAT rate (%)">
            <input
              type="number"
              step="0.1"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Free standard delivery over (£, inc VAT)" hint="Updates the basket and checkout">
            <input
              type="number"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Standard delivery (£)">
            <input
              type="number"
              step="0.01"
              value={rates.standard}
              onChange={(e) => setRates({ ...rates, standard: e.target.value })}
              className={fieldCls}
            />
          </Field>
          <Field label="Next-day delivery (£)">
            <input
              type="number"
              step="0.01"
              value={rates.next_day}
              onChange={(e) => setRates({ ...rates, next_day: e.target.value })}
              className={fieldCls}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Promo codes"
        actions={
          <SaveButton
            busy={busy === 'promo_codes'}
            disabled={readOnly}
            onClick={() =>
              save(
                'promo_codes',
                promos.map((p) => ({ ...p, minSpend: p.minSpend || undefined })),
                'Promo codes',
              )
            }
          />
        }
      >
        <div className="space-y-2">
          {promos.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_80px_80px_auto_auto] items-center gap-2">
              <input
                aria-label="Code"
                value={p.code}
                onChange={(e) =>
                  setPromos(
                    promos.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)),
                  )
                }
                className={fieldCls}
              />
              <select
                aria-label="Type"
                value={p.type}
                onChange={(e) =>
                  setPromos(
                    promos.map((x, j) => (j === i ? { ...x, type: e.target.value as PromoCode['type'] } : x)),
                  )
                }
                className={fieldCls}
              >
                <option value="percent">% off</option>
                <option value="fixed">£ off</option>
              </select>
              <input
                aria-label="Value"
                type="number"
                value={p.value}
                onChange={(e) =>
                  setPromos(promos.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))
                }
                className={fieldCls}
              />
              <input
                aria-label="Minimum spend"
                type="number"
                placeholder="Min £"
                value={p.minSpend ?? ''}
                onChange={(e) =>
                  setPromos(
                    promos.map((x, j) =>
                      j === i ? { ...x, minSpend: e.target.value ? Number(e.target.value) : undefined } : x,
                    ),
                  )
                }
                className={fieldCls}
              />
              <Switch
                aria-label="Active"
                checked={p.active}
                onCheckedChange={(v) => setPromos(promos.map((x, j) => (j === i ? { ...x, active: v } : x)))}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove code"
                onClick={() => setPromos(promos.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPromos([...promos, { code: '', type: 'percent', value: 5, active: true }])}
          >
            <Plus /> Add code
          </Button>
        </div>
      </Panel>

      <Panel
        title="Company details"
        description="Shown in the footer and on emails"
        actions={
          <SaveButton
            busy={busy === 'company'}
            disabled={readOnly}
            onClick={() => save('company', company, 'Company details')}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['name', 'Registered name'],
              ['number', 'Company number'],
              ['vat', 'VAT number'],
              ['phone', 'Phone'],
              ['email', 'Email (admin alerts go here)'],
              ['address', 'Registered address'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <input
                value={company[k] ?? ''}
                onChange={(e) => setCompany({ ...company, [k]: e.target.value })}
                className={fieldCls}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel
        title="Feature flags"
        actions={
          <SaveButton
            busy={busy === 'feature_flags'}
            disabled={readOnly}
            onClick={() => save('feature_flags', flags, 'Feature flags')}
          />
        }
      >
        <div className="space-y-3 text-sm">
          {(
            [
              [
                'demo_banner',
                'Demo banner on the storefront',
                'Shows “Demo environment — no real orders are taken”',
              ],
              ['blind_shipment', 'Blind shipment', 'Ask TD SYNNEX for plain/LaraDirect delivery notes'],
              [
                'hold_below_floor',
                'Hold orders below margin floor',
                'Instead of submitting, fail them for review',
              ],
            ] as const
          ).map(([k, label, hint]) => (
            <label key={k} className="flex items-start gap-3">
              <Switch
                checked={flags[k]}
                onCheckedChange={(v) => setFlags({ ...flags, [k]: v })}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title="Email templates"
        description="Subject lines. {{orderNumber}} and {{name}} are filled in."
        actions={
          <SaveButton
            busy={busy === 'email_templates'}
            disabled={readOnly}
            onClick={() => save('email_templates', templates, 'Email templates')}
          />
        }
      >
        <div className="space-y-3">
          {Object.entries(templates).map(([k, t]) => (
            <Field key={k} label={k.replace(/_/g, ' ')}>
              <input
                value={t.subject}
                onChange={(e) => setTemplates({ ...templates, [k]: { subject: e.target.value } })}
                className={fieldCls}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel
        title="Distributor"
        actions={
          <SaveButton
            busy={busy === 'sync_interval_minutes'}
            disabled={readOnly}
            onClick={() => save('sync_interval_minutes', Number(interval), 'Sync interval')}
          />
        }
      >
        <dl className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Adapter</dt>
            <dd>{distributor.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Mode</dt>
            <dd>
              {distributor.mode}{' '}
              <span className="text-xs text-muted-foreground">(DISTRIBUTOR_MODE env var)</span>
            </dd>
          </div>
        </dl>
        <Field
          label="Sync interval (minutes)"
          hint="Informational: the schedule itself lives in vercel.json or pg_cron"
        >
          <input
            type="number"
            value={interval}
            onChange={(e) => setIntervalMin(e.target.value)}
            className={fieldCls}
          />
        </Field>
      </Panel>

      {demoMode && distributor.mode === 'mock' && (
        <Panel
          title="Mock failure injection (demo only)"
          description="Use these to demonstrate failed orders and retries"
          className="border-amber-500/40 xl:col-span-2"
          actions={
            <SaveButton
              busy={busy === 'mock_controls'}
              disabled={readOnly}
              onClick={() =>
                save(
                  'mock_controls',
                  {
                    fail_rate: failRate === '' ? null : Number(failRate) / 100,
                    reject_skus: rejects.split(/[\s,]+/).filter(Boolean),
                  },
                  'Mock controls',
                )
              }
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Random network failure rate (%)"
              hint={`Blank uses MOCK_FAIL_RATE (${envFailRate}). 100 makes every call fail, so orders retry then fail.`}
            >
              <input
                type="number"
                min={0}
                max={100}
                value={failRate}
                onChange={(e) => setFailRate(e.target.value)}
                placeholder="Use env default"
                className={fieldCls}
              />
            </Field>
            <Field
              label="SKUs TD SYNNEX always rejects"
              hint={`Comma separated, added to MOCK_REJECT_SKUS (${envRejectSkus || 'none'}). Orders containing them fail; remove the SKU then retry to recover.`}
            >
              <input
                value={rejects}
                onChange={(e) => setRejects(e.target.value)}
                placeholder="TDS-LEN-1234567"
                className={fieldCls}
              />
            </Field>
          </div>
        </Panel>
      )}
    </fieldset>
  );
}
