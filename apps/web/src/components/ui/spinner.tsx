// apps/web/src/components/ui/spinner.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const containerSizes = { sm: 'h-4', md: 'h-5', lg: 'h-7' } as const;
const barSizes = { sm: 'w-0.5 h-2.5', md: 'w-1 h-3', lg: 'w-1.5 h-4' } as const;

interface SpinnerProps {
  size?: keyof typeof containerSizes;
  className?: string;
}

/**
 * Trzy animowane pałeczki (stagger) w kolorze caramel.
 * Zastępuje generyczne animate-spin w miejscach pasujących kontekstowo.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-flex items-end gap-[3px]', containerSizes[size], className)}
      aria-label="Ładowanie..."
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('bg-caramel rounded-sm motion-safe:animate-bounce', barSizes[size])}
          style={{ animationDelay: `${i * 100}ms`, animationDuration: '600ms' }}
        />
      ))}
    </span>
  );
}
