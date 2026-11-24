import { Flower2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/** A pooja image, or warm placeholder art when the pooja has none. Fills its parent. */
export function PujaImage({ src, className }: { src?: string | null; className?: string }) {
  if (src) return <img src={src} alt="" className={cn('size-full object-cover', className)} loading="lazy" />;
  return (
    <div
      className={cn(
        'relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-primary-tint/60 to-primary/40',
        className,
      )}
    >
      <div className="absolute aspect-square w-[70%] max-w-40 rounded-full border border-dashed border-card/70" />
      <div className="absolute aspect-square w-[45%] max-w-24 rounded-full border border-card/60" />
      <Flower2 className="relative size-[30%] max-h-10 max-w-10 text-primary-strong" strokeWidth={1.5} />
    </div>
  );
}
