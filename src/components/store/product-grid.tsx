import type { ProductSummary } from '@/lib/catalogue/types';
import { cn } from '@/lib/utils/cn';
import { ProductCard } from './product-card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductGrid({
  products,
  layout = 'grid',
  columns = 4,
  priorityCount = 0,
}: {
  products: ProductSummary[];
  layout?: 'grid' | 'list';
  columns?: 3 | 4;
  priorityCount?: number;
}) {
  return (
    <ul
      className={cn(
        'grid gap-3 sm:gap-5',
        layout === 'list'
          ? 'grid-cols-1'
          : columns === 3
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
      )}
    >
      {products.map((p, i) => (
        <li key={p.id} className="flex min-w-0">
          <div className="w-full min-w-0">
            <ProductCard product={p} layout={layout} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <ul
      aria-hidden
      className={cn(
        'grid gap-3 sm:gap-5',
        columns === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-2xl bg-white p-3 shadow-card">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-5 w-4/5" />
          <Skeleton className="mt-2 h-3 w-3/5" />
          <div className="mt-4 flex items-end justify-between">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
