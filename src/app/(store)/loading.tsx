import { Skeleton } from '@/components/ui/skeleton';

export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-72" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
