import { Skeleton } from '@/components/ui/skeleton';

export function BlogCardSkeleton() {
  return (
    <div
      className="flex gap-0 overflow-hidden"
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Thumbnail placeholder */}
      <div className="shrink-0 hidden sm:block" style={{ width: '140px' }}>
        <Skeleton className="w-full h-full rounded-none" style={{ minHeight: '100px' }} />
      </div>

      {/* Content placeholder */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-2">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />

        {/* Excerpt */}
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-5/6" />

        {/* Tags + meta row */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
}

export function BlogListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </div>
  );
}
