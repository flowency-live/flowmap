import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';

interface StateBadgeProps {
  state: FlowState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Refined sizes - readable but compact
const SIZE_CLASSES = {
  sm: 'h-5 px-2 text-[10px]',
  md: 'h-6 px-2.5 text-[11px]',
  lg: 'h-7 px-3 text-xs',
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
        'rounded-[4px] tracking-wide',
        'transition-all duration-150',
        // Subtle shadow and border for depth
        'shadow-sm',
        isEmphasis
          ? 'ring-1 ring-inset ring-current/30'
          : 'border border-black/[0.06]',
        // Typography
        isNA ? 'font-medium' : 'font-semibold',
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
