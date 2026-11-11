import { CircleAlert, CircleCheck, Clock, CircleX } from 'lucide-react';
import { stockMessage } from '@/lib/catalogue/format';
import type { StockStatus } from '@/lib/catalogue/types';
import { cn } from '@/lib/utils/cn';

const TONES = {
  success: { cls: 'text-success-600', Icon: CircleCheck },
  warn: { cls: 'text-warn-700', Icon: CircleAlert },
  info: { cls: 'text-brand-600', Icon: Clock },
  danger: { cls: 'text-danger-500', Icon: CircleX },
} as const;

export function StockBadge({
  stockStatus,
  stockQty,
  eta,
  detailed = false,
  className,
}: {
  stockStatus: StockStatus;
  stockQty: number;
  eta: string | null;
  detailed?: boolean;
  className?: string;
}) {
  const msg = stockMessage({ stockStatus, stockQty, eta });
  const { cls, Icon } = TONES[msg.tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        cls,
        detailed && 'text-sm',
        className,
      )}
    >
      <Icon className={detailed ? 'size-4' : 'size-3.5'} aria-hidden />
      {detailed ? msg.detail : msg.label}
    </span>
  );
}
