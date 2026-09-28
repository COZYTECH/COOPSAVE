import { Loader2 } from 'lucide-react';

export const LoadingState = ({ label = 'Loading...', compact = false }) => (
  <div className={['flex items-center justify-center gap-3 rounded-xl border border-pamoja-forest/8 bg-white text-sm text-pamoja-muted', compact ? 'px-4 py-5' : 'min-h-40 px-6 py-10'].join(' ')} role="status" aria-live="polite">
    <Loader2 className="h-5 w-5 animate-spin text-pamoja-forest" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const SkeletonBlock = ({ className = '' }) => (
  <div className={['animate-pulse rounded-lg bg-pamoja-sage-deep/70', className].join(' ')} aria-hidden="true" />
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3 rounded-xl border border-ink/10 bg-white p-5" role="status" aria-label="Loading table">
    <div className="flex gap-4 border-b border-ink/8 pb-3">
      {Array.from({ length: columns }).map((_, index) => <SkeletonBlock key={index} className="h-3 flex-1" />)}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 border-b border-ink/8 py-2 last:border-0">
        {Array.from({ length: columns }).map((__, columnIndex) => <SkeletonBlock key={columnIndex} className="h-4 flex-1" />)}
      </div>
    ))}
  </div>
);
