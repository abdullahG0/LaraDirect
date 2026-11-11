import { Toaster } from '@/components/ui/sonner';
import { BasketProvider } from '@/components/store/basket-provider';
import { CookieBanner } from '@/components/store/cookie-banner';
import { DemoBanner } from '@/components/store/demo-banner';
import { Footer } from '@/components/store/footer';
import { Header } from '@/components/store/header';
import { MiniBasket } from '@/components/store/mini-basket';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <BasketProvider>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-white px-4 py-2 font-semibold text-brand-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen flex-col bg-surface-alt">
        <DemoBanner />
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </div>
      <MiniBasket />
      <CookieBanner />
      <Toaster theme="light" position="bottom-right" richColors={false} closeButton />
    </BasketProvider>
  );
}
