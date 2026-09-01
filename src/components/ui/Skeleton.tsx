'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-xl bg-[var(--color-bg-surface)] border border-white/5 ${className}`} />
  );
}

export function SignalCardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-white/5 bg-[var(--color-bg-secondary)]/40">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5 mt-2">
        <Skeleton className="h-7 flex-1 rounded-lg" />
        <Skeleton className="h-7 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function MessageSkeleton({ incoming = false }: { incoming?: boolean }) {
  return (
    <div className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
      <div className={`w-3/5 ${incoming ? '' : 'items-end flex flex-col'}`}>
        <Skeleton className={`h-3 w-16 mb-1 ${incoming ? '' : 'self-end'}`} />
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
    </div>
  );
}
