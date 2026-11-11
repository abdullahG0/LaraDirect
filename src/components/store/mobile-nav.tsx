'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { Logo } from './logo';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid size-10 place-items-center rounded-lg text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-6" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>
            <Logo className="text-xl" />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile menu" className="px-2 py-2">
          <Accordion type="single" collapsible>
            {CATEGORIES.map((cat) => (
              <AccordionItem key={cat.slug} value={cat.slug} className="border-b-0">
                <AccordionTrigger className="rounded-md px-3 py-3 text-base font-medium text-brand-900 hover:bg-accent hover:no-underline">
                  {cat.label}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul className="ml-3 border-l pl-3">
                    <li>
                      <Link
                        href={`/c/${cat.slug}`}
                        className="block py-2 text-sm font-semibold text-brand-600"
                      >
                        Shop all {cat.label.toLowerCase()}
                      </Link>
                    </li>
                    {cat.subcategories.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/c/${cat.slug}/${s.slug}`} className="block py-2 text-sm text-ink-900">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-2 space-y-1 border-t px-3 pt-3 text-base">
            <Link href="/deals" className="block py-2 font-semibold text-brand-600">
              Deals
            </Link>
            <Link href="/shop" className="block py-2 text-brand-900">
              All products
            </Link>
            <Link href="/education" className="block py-2 text-brand-900">
              For schools
            </Link>
            <Link href="/account" className="block py-2 text-brand-900">
              My account
            </Link>
            <Link href="/contact" className="block py-2 text-brand-900">
              Support
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
