'use client';

// ⌘K command palette (step 7.7): jump to pages, or search orders, products and customers.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClipboardList, Package, User } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { hasRole } from '@/lib/auth/roles';
import { useAdmin } from './admin-context';
import { NAV } from './shell/nav';

interface SearchResults {
  orders: { id: string; label: string; sub: string }[];
  products: { id: string; label: string; sub: string }[];
  customers: { id: string; label: string; sub: string }[];
}

const EMPTY: SearchResults = { orders: [], products: [], customers: [] };

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { admin } = useAdmin();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        // aborted
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ('');
    router.push(href);
  };

  const pages = NAV.flatMap((g) => g.items).filter((i) => hasRole(admin.role, i.minRole));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Server does the matching, so cmdk's own filter is off for result groups. */}
      <CommandInput
        placeholder="Search orders, products, customers, or jump to a page…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {results.orders.length > 0 && (
          <CommandGroup heading="Orders">
            {results.orders.map((o) => (
              <CommandItem
                key={o.id}
                value={`order ${o.label} ${o.sub} ${q}`}
                onSelect={() => go(`/admin/orders/${o.id}`)}
              >
                <ClipboardList className="mr-2" />
                <span className="font-medium">{o.label}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{o.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.products.length > 0 && (
          <CommandGroup heading="Products">
            {results.products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product ${p.label} ${p.sub} ${q}`}
                onSelect={() => go(`/admin/products/${p.id}`)}
              >
                <Package className="mr-2" />
                <span className="truncate">{p.label}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{p.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.customers.length > 0 && (
          <CommandGroup heading="Customers">
            {results.customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer ${c.label} ${c.sub} ${q}`}
                onSelect={() => go(`/admin/customers/${c.id}`)}
              >
                <User className="mr-2" />
                <span>{c.label}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{c.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {pages.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={`page ${label}`} onSelect={() => go(href)}>
              <Icon className="mr-2" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
