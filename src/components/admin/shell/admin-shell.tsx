'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExternalLink, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { hasRole, ROLE_LABELS } from '@/lib/auth/roles';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { AdminProvider, useAdmin, type AdminSession } from '../admin-context';
import { CommandPalette } from '../command-palette';
import { NAV } from './nav';

const COLLAPSE_KEY = 'ld-admin-sidebar';

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { admin } = useAdmin();
  return (
    <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
      {NAV.map((g) => {
        const items = g.items.filter((i) => hasRole(admin.role, i.minRole));
        if (!items.length) return null;
        return (
          <div key={g.group}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'bg-accent text-foreground',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {collapsed ? <span className="sr-only">{label}</span> : label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/admin" className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
      <span className="grid size-7 place-items-center rounded-md bg-[#0E1E3E] text-xs font-bold text-[#22D3EE]">
        LD
      </span>
      {!collapsed && (
        <span>
          LaraDirect <span className="font-normal text-muted-foreground">admin</span>
        </span>
      )}
    </Link>
  );
}

function TopBar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { admin, theme, toggleTheme } = useAdmin();
  const router = useRouter();
  const signOut = async () => {
    await createBrowserClient().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search orders, products, customers…</span>
        <kbd className="hidden rounded border bg-background px-1.5 text-[11px] font-medium sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <span className="hidden rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300 md:inline">
            Demo
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary/20 text-xs font-semibold uppercase">
                {(admin.name ?? admin.email).slice(0, 2)}
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm">{admin.name ?? admin.email}</span>
                <span className="block text-[11px] text-muted-foreground">{ROLE_LABELS[admin.role]}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{admin.name ?? 'Admin'}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 size-4" /> View store
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme } = useAdmin();

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      // ignore
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // ignore
      }
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-background transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        <NavLinks collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-10 items-center justify-center gap-2 border-t text-xs text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && 'Collapse'}
        </button>
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <Brand collapsed={false} />
          <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-16' : 'lg:pl-60')}>
        <TopBar onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main id="admin-main" className="mx-auto max-w-[1400px] p-4 sm:p-6">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster theme={theme} position="bottom-right" closeButton richColors />
    </div>
  );
}

export function AdminShell({ admin, children }: { admin: AdminSession; children: React.ReactNode }) {
  return (
    <AdminProvider admin={admin}>
      <ShellInner>{children}</ShellInner>
    </AdminProvider>
  );
}
