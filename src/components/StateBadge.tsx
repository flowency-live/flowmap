import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';
import {
  MinusCircle,
  CircleDashed,
  Search,
  Clock,
  Lock,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface StateBadgeProps {
  state: FlowState;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATE_ICONS: Record<FlowState, LucideIcon> = {
  'N/A': MinusCircle,
  'N/S': CircleDashed,
  Discovery: Search,
  Ready: Clock,
  Constrained: Lock,
  Doing: PlayCircle,
  Done: CheckCircle2,
  Blocked: XCircle,
};

const SIZE_CLASSES = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-[11px]',
  lg: 'h-7 px-2.5 text-xs',
};

export function StateBadge({
  state,
  showIcon = false,
  showLabel = false,
  size = 'md',
  className,
}: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  const Icon = STATE_ICONS[state];

  return (
    <div
      title={config.label}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
      className={cn(
        'inline-flex items-center justify-center rounded font-bold tracking-wide',
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && state !== 'N/A' ? (
        <span className="flex items-center gap-1">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {showLabel && config.label}
        </span>
      ) : (
        // Use short form for N/A and N/S, full label for others
        state === 'N/A' || state === 'N/S' ? config.short : config.label
      )}
    </div>
  );
}

/**
 * Legend items for displaying all states (in display order)
 */
export const STATE_LEGEND_ITEMS: { state: FlowState; label: string }[] =
  FLOW_STATES.map((state) => ({
    state,
    label: STATE_CONFIG[state].label,
  }));
