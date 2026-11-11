// Pricing engine (spec §7). Pure functions: no database access, safe to unit test and run anywhere.
//
// Price build-up:
//   rule     = most specific active rule (sku > brand > category > global), then highest priority
//   sell_ex  = cost + markup                       (percent of cost, or fixed GBP)
//   floor_ex = max(cost / (1 − min_margin_pct), cost + min_margin_amount)
//   sell_ex  = max(sell_ex, floor_ex)
//   sell_inc = round(sell_ex × (1 + VAT))          (rounding rule; never rounds below the floor)
//   margin   = (sell_ex − cost) / sell_ex, with sell_ex back-computed from the rounded inc-VAT price
//
// Note: the floor is a true margin on the sell price, so a product at its floor shows exactly that margin.
// (Spec §7.1 writes the floor as a markup on cost, which would flag at-floor products as below floor.)

export type Rounding = 'none' | 'x.99' | 'x.95' | 'nearest_1';
export type RuleScope = 'global' | 'category' | 'brand' | 'sku';

export interface PricingRule {
  id: string;
  scope: RuleScope;
  scopeValue: string | null;
  markupType: 'percent' | 'fixed';
  markupValue: number;
  minMarginPct: number;
  minMarginAmount: number;
  rounding: Rounding;
  priority: number;
  isActive: boolean;
}

export interface PriceInput {
  sku: string;
  brand: string;
  category: string;
  costPriceExVat: number;
  priceOverrideIncVat?: number | null;
}

export type MarginStatus = 'ok' | 'below_floor' | 'negative';

export interface PriceStep {
  label: string;
  value: number;
}

export interface PriceResult {
  ruleId: string | null;
  sellPriceExVat: number;
  sellPriceIncVat: number;
  marginPct: number; // e.g. 4.76 means 4.76%
  marginAmount: number; // GBP ex VAT per unit
  floorPriceExVat: number;
  belowFloor: boolean;
  marginStatus: MarginStatus;
  overridden: boolean;
  steps: PriceStep[]; // for the admin price build-up simulator
}

const SPECIFICITY: Record<RuleScope, number> = { sku: 4, brand: 3, category: 2, global: 1 };
const FLOOR_TOLERANCE = 0.005; // half a penny, absorbs back-computation rounding

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const toPence = (n: number) => Math.round(n * 100);
const eq = (a: string | null, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();

function matches(rule: PricingRule, input: PriceInput): boolean {
  switch (rule.scope) {
    case 'global':
      return true;
    case 'category':
      return eq(rule.scopeValue, input.category);
    case 'brand':
      return eq(rule.scopeValue, input.brand);
    case 'sku':
      return eq(rule.scopeValue, input.sku);
  }
}

/** Most specific active rule (sku > brand > category > global); ties go to the highest priority. */
export function selectRule(input: PriceInput, rules: PricingRule[]): PricingRule | null {
  let best: PricingRule | null = null;
  for (const r of rules) {
    if (!r.isActive || !matches(r, input)) continue;
    if (
      !best ||
      SPECIFICITY[r.scope] > SPECIFICITY[best.scope] ||
      (SPECIFICITY[r.scope] === SPECIFICITY[best.scope] && r.priority > best.priority)
    ) {
      best = r;
    }
  }
  return best;
}

/** Lowest ex-VAT price that meets the rule's margin floor. */
export function floorPrice(
  cost: number,
  rule: Pick<PricingRule, 'minMarginPct' | 'minMarginAmount'> | null,
): number {
  if (!rule) return cost;
  const pct = Math.min(Math.max(rule.minMarginPct, 0), 99);
  return Math.max(cost / (1 - pct / 100), cost + Math.max(rule.minMarginAmount, 0));
}

/**
 * Applies a retail rounding rule to an inc-VAT price, choosing the nearest candidate
 * but never going below `minIncVat`. Works in pence to avoid float drift.
 */
export function applyRounding(incVat: number, mode: Rounding, minIncVat = 0): number {
  const p = toPence(incVat);
  const min = Math.ceil(minIncVat * 100 - 1e-6);
  let lower: number;
  switch (mode) {
    case 'none':
      return Math.max(p, min) / 100;
    case 'x.99':
      lower = Math.floor((p + 1) / 100) * 100 - 1;
      break;
    case 'x.95':
      lower = Math.floor((p + 5) / 100) * 100 - 5;
      break;
    case 'nearest_1':
      lower = Math.floor(p / 100) * 100;
      break;
  }
  const upper = lower < p ? lower + 100 : lower;
  let chosen = p - lower < upper - p ? lower : upper;
  if (chosen < min) chosen = upper;
  while (chosen < min) chosen += 100;
  return chosen / 100;
}

export function calculatePrice(input: PriceInput, rules: PricingRule[], vatRate: number): PriceResult {
  const cost = input.costPriceExVat;
  const rule = selectRule(input, rules);
  const vatMult = 1 + vatRate;
  const floorEx = floorPrice(cost, rule);
  const steps: PriceStep[] = [{ label: 'Cost price (ex VAT)', value: round2(cost) }];

  let sellInc: number;
  const overridden = input.priceOverrideIncVat != null && input.priceOverrideIncVat > 0;

  if (overridden) {
    sellInc = round2(input.priceOverrideIncVat!);
    steps.push({ label: 'Manual price override (inc VAT)', value: sellInc });
  } else {
    const markup = !rule
      ? 0
      : rule.markupType === 'percent'
        ? (cost * rule.markupValue) / 100
        : rule.markupValue;
    steps.push({ label: rule ? markupLabel(rule) : 'No pricing rule: sold at cost', value: round2(markup) });

    let sellEx = cost + markup;
    if (sellEx < floorEx) {
      steps.push({ label: `Raised to margin floor (${floorLabel(rule!)})`, value: round2(floorEx - sellEx) });
      sellEx = floorEx;
    }
    steps.push({ label: 'Sell price (ex VAT)', value: round2(sellEx) });

    const rawInc = sellEx * vatMult;
    steps.push({ label: `VAT (${round2(vatRate * 100)}%)`, value: round2(rawInc - sellEx) });

    const mode = rule?.rounding ?? 'none';
    sellInc = applyRounding(rawInc, mode, floorEx * vatMult);
    if (toPence(sellInc) !== toPence(rawInc)) {
      steps.push({ label: `Rounding (${mode})`, value: round2(sellInc - rawInc) });
    }
  }

  const sellEx = round2(sellInc / vatMult);
  const marginAmount = round2(sellEx - cost);
  const marginPct = sellEx > 0 ? round2((marginAmount / sellEx) * 100) : 0;
  const belowFloor = sellEx < floorEx - FLOOR_TOLERANCE;
  steps.push({ label: 'Final price (inc VAT)', value: sellInc });

  return {
    ruleId: rule?.id ?? null,
    sellPriceExVat: sellEx,
    sellPriceIncVat: sellInc,
    marginPct,
    marginAmount,
    floorPriceExVat: round2(floorEx),
    belowFloor,
    marginStatus: marginAmount < 0 ? 'negative' : belowFloor ? 'below_floor' : 'ok',
    overridden,
    steps,
  };
}

function scopeLabel(rule: PricingRule): string {
  return rule.scope === 'global' ? 'global' : `${rule.scope}: ${rule.scopeValue}`;
}

function markupLabel(rule: PricingRule): string {
  const amount = rule.markupType === 'percent' ? `${rule.markupValue}%` : `£${rule.markupValue.toFixed(2)}`;
  return `Markup ${amount} (${scopeLabel(rule)})`;
}

function floorLabel(rule: PricingRule): string {
  const parts = [];
  if (rule.minMarginPct > 0) parts.push(`${rule.minMarginPct}% margin`);
  if (rule.minMarginAmount > 0) parts.push(`£${rule.minMarginAmount.toFixed(2)} minimum`);
  return parts.join(', ') || 'floor';
}

// ── Impact preview (admin "Preview impact" before applying rule changes, spec §11.1) ─────────────

export interface PricedProduct extends PriceInput {
  id: string;
  name: string;
}

export interface ImpactChange {
  id: string;
  sku: string;
  name: string;
  before: number; // inc VAT
  after: number; // inc VAT
  marginBefore: number;
  marginAfter: number;
}

export interface ImpactPreview {
  productsAffected: number;
  avgMarginBefore: number;
  avgMarginAfter: number;
  belowFloorBefore: number;
  belowFloorAfter: number;
  biggestChanges: ImpactChange[];
}

export function previewImpact(
  products: PricedProduct[],
  currentRules: PricingRule[],
  proposedRules: PricingRule[],
  vatRate: number,
  topN = 10,
): ImpactPreview {
  const changes: ImpactChange[] = [];
  let sumBefore = 0;
  let sumAfter = 0;
  let belowBefore = 0;
  let belowAfter = 0;

  for (const p of products) {
    const a = calculatePrice(p, currentRules, vatRate);
    const b = calculatePrice(p, proposedRules, vatRate);
    sumBefore += a.marginPct;
    sumAfter += b.marginPct;
    if (a.marginStatus !== 'ok') belowBefore++;
    if (b.marginStatus !== 'ok') belowAfter++;
    if (toPence(a.sellPriceIncVat) !== toPence(b.sellPriceIncVat)) {
      changes.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        before: a.sellPriceIncVat,
        after: b.sellPriceIncVat,
        marginBefore: a.marginPct,
        marginAfter: b.marginPct,
      });
    }
  }

  const n = products.length || 1;
  return {
    productsAffected: changes.length,
    avgMarginBefore: round2(sumBefore / n),
    avgMarginAfter: round2(sumAfter / n),
    belowFloorBefore: belowBefore,
    belowFloorAfter: belowAfter,
    biggestChanges: changes
      .sort((x, y) => Math.abs(y.after - y.before) - Math.abs(x.after - x.before))
      .slice(0, topN),
  };
}
