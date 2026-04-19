import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';

interface StateBadgeProps {
  state: FlowState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Bold, readable sizes
const SIZE_CLASSES = {
  sm: 'h-5 px-2.5 text-[10px]',
  md: 'h-6 px-3 text-[11px]',
  lg: 'h-7 px-3.5 text-xs',
};

export function StateBadge({
  state,
  size = 'md',
  className,
}: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  const isNA = state === 'N/A';
  const isEmphasis = state === 'Constrained' || state === 'Blocked';

  return (
    <div
      title={config.label}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'rounded-[4px] tracking-wide uppercase',
        'transition-all duration-150',
        // Shadow and border for depth
        'shadow-sm',
        isEmphasis
          ? 'ring-1 ring-inset ring-current/40 shadow-md'
          : 'border border-black/10',
        // Typography - bold for visibility
        isNA ? 'font-medium' : 'font-bold',
        // Size
        SIZE_CLASSES[size],
        // Hover effect
        'hover:shadow-md hover:scale-[1.02]',
        className
      )}
    >
      {isNA ? config.short : config.label}
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
