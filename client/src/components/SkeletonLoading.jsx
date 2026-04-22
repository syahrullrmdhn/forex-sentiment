/* Reusable shimmer skeleton */
export function SkeletonPulse({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonPulse className="h-3 w-24" />
      <SkeletonPulse className="h-8 w-32" />
      <SkeletonPulse className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1">
          <SkeletonPulse className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-6 w-28" />
        </div>
        <SkeletonPulse className="h-6 w-16" />
      </div>
      <SkeletonPulse className="h-[380px] w-full" />
      <div className="grid grid-cols-3 gap-2">
        <SkeletonPulse className="h-12 w-full" />
        <SkeletonPulse className="h-12 w-full" />
        <SkeletonPulse className="h-12 w-full" />
      </div>
    </div>
  );
}
