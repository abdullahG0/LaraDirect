import { exVatPrice } from '@/lib/catalogue/format';
import { isDeal } from '@/lib/catalogue/filters';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';

/** Inc-VAT price with the ex-VAT figure underneath (schools reclaim VAT), plus RRP when it's a genuine saving. */
export function Price({
  priceIncVat,
  rrpIncVat,
  size = 'md',
  className,
}: {
  priceIncVat: number;
  rrpIncVat: number | null;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const deal = isDeal({ priceIncVat, rrpIncVat });
  return (
    <div className={cn('tabular leading-tight', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn('font-heading font-bold text-brand-900', size === 'lg' ? 'text-4xl' : 'text-[22px]')}
        >
          {formatGBP(priceIncVat)}
        </span>
        {deal && (
          <span className={cn('text-ink-600', size === 'lg' ? 'text-base' : 'text-xs')}>
            RRP <s>{formatGBP(rrpIncVat!)}</s>
          </span>
        )}
      </div>
      <span className={cn('text-ink-600', size === 'lg' ? 'text-sm' : 'text-xs')}>
        {formatGBP(exVatPrice(priceIncVat))} ex. VAT
      </span>
    </div>
  );
}

export function savingVsRrp(priceIncVat: number, rrpIncVat: number | null): number | null {
  if (!isDeal({ priceIncVat, rrpIncVat })) return null;
  return Math.floor(rrpIncVat! - priceIncVat);
}
