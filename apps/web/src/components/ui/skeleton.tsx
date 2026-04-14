// apps/web/src/components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-md skeleton-caramel', className)}
      {...props}
    />
  );
}

export { Skeleton };
