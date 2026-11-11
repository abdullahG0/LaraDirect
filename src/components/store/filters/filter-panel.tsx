'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import type { FacetGroup } from '@/lib/catalogue/types';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useFilterNav } from './use-filter-nav';

const COLLAPSED_LIMIT = 6;

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b py-4 first:pt-0 last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded text-left font-heading text-[15px] font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {title}
          <ChevronDown
            className={cn('size-4 text-ink-600 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="mt-3">
        {children}
      </div>
    </section>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  const id = useId();
  const disabled = !checked && count === 0;
  return (
    <div className={cn('flex items-center gap-2.5 py-1', disabled && 'opacity-50')}>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <label
        htmlFor={id}
        className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm text-ink-900"
      >
        <span>{label}</span>
        {count !== undefined && <span className="tabular text-xs text-ink-600">{count}</span>}
      </label>
    </div>
  );
}

function FacetList({ group }: { group: FacetGroup }) {
  const { sp, toggle } = useFilterNav();
  const [expanded, setExpanded] = useState(false);
  const selected = sp.getAll(group.key);
  const visible = expanded ? group.options : group.options.slice(0, COLLAPSED_LIMIT);
  return (
    <>
      <div role="group" aria-label={group.label}>
        {visible.map((o) => (
          <CheckRow
            key={o.value}
            label={o.value}
            count={o.count}
            checked={selected.includes(o.value)}
            onChange={() => toggle(group.key, o.value)}
          />
        ))}
      </div>
      {group.options.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          {expanded ? 'Show fewer' : `Show all ${group.options.length}`}
        </button>
      )}
    </>
  );
}

function PriceRange({ bounds }: { bounds: { min: number; max: number } }) {
  const { sp, set } = useFilterNav();
  const lo = Math.max(bounds.min, Number(sp.get('min') ?? bounds.min));
  const hi = Math.min(bounds.max, Number(sp.get('max') ?? bounds.max));
  const [value, setValue] = useState<[number, number]>([lo, hi]);
  useEffect(() => setValue([lo, hi]), [lo, hi]);

  if (bounds.max <= bounds.min)
    return <p className="text-sm text-ink-600">Only one price in this selection.</p>;

  const step = bounds.max - bounds.min > 500 ? 10 : 1;
  return (
    <div className="px-1">
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={step}
        value={value}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => setValue([v[0]!, v[1]!])}
        onValueCommit={(v) =>
          set({
            min: v[0]! > bounds.min ? String(v[0]) : null,
            max: v[1]! < bounds.max ? String(v[1]) : null,
          })
        }
        thumbLabels={['Minimum price', 'Maximum price']}
      />
      <div className="tabular mt-3 flex justify-between text-sm text-ink-900">
        <span>{formatGBP(value[0]).replace('.00', '')}</span>
        <span>{formatGBP(value[1]).replace('.00', '')}</span>
      </div>
    </div>
  );
}

export function FilterPanel({
  facets,
  priceBounds,
  showEducation = true,
}: {
  facets: FacetGroup[];
  priceBounds: { min: number; max: number };
  showEducation?: boolean;
}) {
  const { sp, set, pending } = useFilterNav();
  const flag = (key: string) => sp.get(key) === '1';
  return (
    <div aria-busy={pending} className="relative">
      {pending && (
        <span className="absolute -top-8 right-0 flex items-center gap-1 text-xs text-ink-600" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Updating
        </span>
      )}
      <Section title="Availability">
        <CheckRow
          label="In stock"
          checked={flag('stock')}
          onChange={() => set({ stock: flag('stock') ? null : '1' })}
        />
        {showEducation && (
          <CheckRow
            label="Education suitable"
            checked={flag('edu')}
            onChange={() => set({ edu: flag('edu') ? null : '1' })}
          />
        )}
      </Section>
      {facets
        .filter((g) => g.key === 'type')
        .map((g) => (
          <Section key={g.key} title={g.label}>
            <FacetList group={g} />
          </Section>
        ))}
      <Section title="Price (£)">
        <PriceRange bounds={priceBounds} />
      </Section>
      {facets
        .filter((g) => g.key !== 'type')
        .map((g, i) => (
          <Section key={g.key} title={g.label} defaultOpen={i < 4}>
            <FacetList group={g} />
          </Section>
        ))}
    </div>
  );
}
