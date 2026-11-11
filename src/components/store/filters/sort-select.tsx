'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SORTS, SORT_LABELS, type SortKey } from '@/lib/catalogue/types';
import { useFilterNav } from './use-filter-nav';

export function SortSelect({ value }: { value: SortKey }) {
  const { set } = useFilterNav();
  return (
    <div className="flex items-center gap-2">
      <span id="sort-label" className="hidden text-sm text-ink-600 sm:inline">
        Sort by
      </span>
      <Select value={value} onValueChange={(v) => set({ sort: v === 'recommended' ? null : v })}>
        <SelectTrigger
          aria-labelledby="sort-label"
          className="h-10 w-[180px] bg-white text-sm font-medium text-brand-900"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((s) => (
            <SelectItem key={s} value={s}>
              {SORT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
