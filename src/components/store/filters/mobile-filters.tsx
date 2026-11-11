'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { FacetGroup } from '@/lib/catalogue/types';
import { FilterPanel } from './filter-panel';

export function MobileFilters({
  facets,
  priceBounds,
  activeCount,
  total,
}: {
  facets: FacetGroup[];
  priceBounds: { min: number; max: number };
  activeCount: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] leading-5 text-white">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[90vw] max-w-sm flex-col p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="font-heading text-lg">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-8">
          <FilterPanel facets={facets} priceBounds={priceBounds} />
        </div>
        <div className="border-t p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 w-full rounded-full bg-cta text-sm font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Show {total} {total === 1 ? 'product' : 'products'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
