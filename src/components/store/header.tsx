import Link from 'next/link';
import { Suspense } from 'react';
import { CircleHelp, UserRound } from 'lucide-react';
import { formatGBP } from '@/lib/utils/money';
import { STORE } from '@/lib/store-config';
import { BasketButton } from './basket-button';
import { Logo } from './logo';
import { MegaMenu } from './mega-menu';
import { MobileNav } from './mobile-nav';
import { SearchBox } from './search-box';

function TopBar() {
  return (
    <div className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-content items-center justify-center gap-x-6 px-4 py-2 text-xs font-medium tracking-wide sm:text-[13px]">
        <p>FREE UK DELIVERY ON ORDERS OVER {formatGBP(STORE.freeDeliveryThreshold).replace('.00', '')}</p>
        <p className="hidden text-cta md:block">{STORE.returnsDays}-DAY RETURNS</p>
        <p className="hidden text-cta md:block">TRUSTED UK RETAILER</p>
        <p className="hidden lg:block">
          Call us:{' '}
          <a href={`tel:${STORE.phone.replace(/\s/g, '')}`} className="underline-offset-2 hover:underline">
            {STORE.phone}
          </a>
        </p>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <TopBar />
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:flex-nowrap lg:gap-x-8 lg:py-4">
        <MobileNav />
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="LaraDirect home"
        >
          <Logo className="text-[22px] sm:text-[28px]" />
        </Link>
        <Suspense fallback={<div className="order-last h-11 w-full lg:order-none lg:max-w-xl lg:flex-1" />}>
          <SearchBox className="order-last w-full lg:order-none lg:max-w-xl lg:flex-1" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-lg px-2 py-2 text-[15px] font-medium text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
          >
            <CircleHelp className="size-5 text-brand-600" aria-hidden />
            Support
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-[15px] font-medium text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRound className="size-5 text-brand-600" aria-hidden />
            <span className="hidden sm:inline">My account</span>
            <span className="sr-only sm:hidden">My account</span>
          </Link>
          <BasketButton />
        </div>
      </div>
      <MegaMenu />
    </header>
  );
}
