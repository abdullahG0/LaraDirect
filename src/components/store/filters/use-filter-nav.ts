'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { withParams } from '@/lib/catalogue/filters';

/** Updates listing filters in the URL so every result set is shareable (step 3.5). */
export function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = useCallback(() => {
    const obj: Record<string, string[]> = {};
    sp.forEach((v, k) => {
      (obj[k] ??= []).push(v);
    });
    return obj;
  }, [sp]);

  const set = useCallback(
    (changes: Record<string, string | string[] | null>) => {
      startTransition(() => {
        router.push(withParams(pathname, current(), changes), { scroll: false });
      });
    },
    [router, pathname, current],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      const values = sp.getAll(key);
      const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
      set({ [key]: next.length ? next : null });
    },
    [sp, set],
  );

  return { sp, set, toggle, pending };
}
