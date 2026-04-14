// apps/web/src/components/ui/spinner.tsx
import { cn } from '@/lib/utils';

const sizes = { sm: 'h-3', md: 'h-4', lg: 'h-6' } as const;
const barSizes = { sm: 'w-0.5', md: 'w-1', lg: 'w-1.5' } as const;

interface SpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * Trzy animowane pałeczki (stagger) w kolorze caramel.
 * Zastępuje generyczne animate-spin w miejscach pasujących kontekstowo.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-flex items-end gap-[3px]', sizes[size], className)}
      aria-label="Ładowanie..."
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('bg-caramel rounded-sm animate-bounce', barSizes[size], sizes[size])}
          style={{ animationDelay: `${i * 100}ms`, animationDuration: '600ms' }}
        />
      ))}
    </span>
  );
}
