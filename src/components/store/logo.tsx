import { cn } from '@/lib/utils/cn';

// Placeholder wordmark built from the brand kit (navy "LARA DIRECT" with a cyan bolt).
// Replace with the final SVG in public/brand/ when it is supplied.
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-heading text-2xl font-extrabold uppercase leading-none tracking-tight',
        inverted ? 'text-white' : 'text-brand-900',
        className,
      )}
    >
      <span aria-hidden="true">Lara</span>
      <svg viewBox="0 0 24 32" aria-hidden="true" className="mx-0.5 h-[1.05em] w-auto">
        <path d="M14.5 0 2 18h8.5L7 32l15-20h-9L16.5 0z" fill="#22D3EE" />
      </svg>
      <span aria-hidden="true">Direct</span>
      <span className="sr-only">LaraDirect</span>
    </span>
  );
}
