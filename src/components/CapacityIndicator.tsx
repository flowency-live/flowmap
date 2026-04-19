import { cn } from '@/lib/utils';
import type { LoadMetrics } from '@/lib/timeline';

interface CapacityIndicatorProps {
  load: LoadMetrics;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CapacityIndicator({
  load,
  showLabel = true,
  size = 'md',
}: CapacityIndicatorProps) {
  const { activeItems, capacity, utilizationPct, isOverloaded } = load;

  // Determine color based on utilization
  const getColor = () => {
    if (utilizationPct === 0) return 'bg-muted';
    if (utilizationPct <= 50) return 'bg-green-500';
    if (utilizationPct <= 80) return 'bg-green-400';
    if (utilizationPct <= 100) return 'bg-amber-400';
    return 'bg-red-500';
  };

  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';
  const fillWidth = Math.min(utilizationPct, 100);

  return (
    <div className="flex items-center gap-2">
      {/* Progress bar */}
      <div
        className={cn(
          'flex-1 rounded-full bg-muted/50 overflow-hidden',
          barHeight
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all', getColor())}
          style={{ width: `${fillWidth}%` }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            'text-[10px] font-medium tabular-nums whitespace-nowrap',
            isOverloaded ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {activeItems}/{capacity}
        </span>
      )}
    </div>
  );
}

interface CapacityBadgeProps {
  streams: number;
  streamPct: number;
  bauPct: number;
}

export function CapacityBadge({ streams, streamPct, bauPct }: CapacityBadgeProps) {
  const totalPct = streams * streamPct + bauPct;

  return (
    <div className="text-[10px] text-muted-foreground leading-tight">
      <span className="font-medium">{streams}</span>
      <span className="mx-0.5">×</span>
      <span>{streamPct}%</span>
      {bauPct > 0 && (
        <>
          <span className="mx-0.5">+</span>
          <span>{bauPct}%</span>
        </>
      )}
      <span className="text-muted-foreground/70 ml-1">= {totalPct}%</span>
    </div>
  );
}
