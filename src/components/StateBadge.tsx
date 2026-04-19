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

// Tighter sizes for heatmap density
const SIZE_CLASSES = {
  sm: 'h-[18px] px-1 text-[9px]',
  md: 'h-[22px] px-1.5 text-[10px]',
  lg: 'h-6 px-2 text-[11px]',
};

// States that need visual emphasis (problems/bottlenecks)
const EMPHASIS_STATES: FlowState[] = ['Constrained', 'Blocked'];

export function StateBadge({
  state,
  showIcon = false,
  showLabel = false,
  size = 'md',
  className,
}: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  const Icon = STATE_ICONS[state];
  const needsEmphasis = EMPHASIS_STATES.includes(state);
  const isNA = state === 'N/A';

  return (
    <div
      title={config.label}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        // Add ring for emphasis states
        boxShadow: needsEmphasis ? `inset 0 0 0 1.5px ${config.textColor}` : undefined,
      }}
      className={cn(
        'inline-flex items-center justify-center rounded tracking-wide',
        SIZE_CLASSES[size],
        // N/A is de-emphasized, others are bold
        isNA ? 'font-medium' : 'font-bold',
        className
      )}
    >
      {showIcon && state !== 'N/A' ? (
        <span className="flex items-center gap-1">
          <Icon className="w-3 h-3 shrink-0" />
          {showLabel && config.label}
        </span>
      ) : (
        // Use short form only for N/A
        isNA ? config.short : config.label
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
