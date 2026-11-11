'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const current = images[index];

  if (!current) {
    return <div className="aspect-square w-full rounded-2xl bg-white shadow-card" aria-hidden />;
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 sm:flex-col" aria-label="Product images">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'relative block size-16 overflow-hidden rounded-lg border-2 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-20',
                  i === index ? 'border-brand-600' : 'border-transparent hover:border-border',
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-contain" />
                <span className="sr-only">
                  Show image {i + 1} of {images.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onMouseLeave={() => setOrigin(null)}
        className="group relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Enlarge image of ${name}`}
      >
        <Image
          src={current}
          alt={`${name}, image ${index + 1} of ${images.length}`}
          fill
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-contain transition-transform duration-200 motion-reduce:transition-none"
          style={origin ? { transform: 'scale(1.8)', transformOrigin: origin } : undefined}
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-600 shadow-sm">
          <ZoomIn className="size-3.5" aria-hidden /> Click to enlarge
        </span>
      </button>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <div className="relative aspect-square w-full">
            <Image
              src={current}
              alt={`${name}, image ${index + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'relative size-14 overflow-hidden rounded-md border-2',
                    i === index ? 'border-brand-600' : 'border-transparent',
                  )}
                >
                  <Image src={src} alt="" fill sizes="56px" className="object-contain" />
                  <span className="sr-only">Show image {i + 1}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
