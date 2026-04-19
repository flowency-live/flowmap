import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';
import { useThemeStore } from '@/stores/themeStore';

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
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const config = STATE_CONFIG[state];
  const isNA = state === 'N/A';
  const isEmphasis = config.isEmphasis;

  // Use dark mode colors when in dark theme
  const bgColor = isDark ? config.bgColorDark : config.bgColor;
  const textColor = isDark ? config.textColorDark : config.textColor;

  // Glow colors for emphasis states in dark mode
  const glowStyle = isDark && isEmphasis
    ? {
        boxShadow: state === 'Blocked'
          ? '0 0 12px rgba(239, 68, 68, 0.5)'
          : '0 0 12px rgba(139, 92, 246, 0.5)',
      }
    : {};

  return (
    <div
      title={config.label}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        ...glowStyle,
      }}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'rounded-[4px] tracking-wide uppercase',
        'transition-all duration-150',
        // Shadow and border for depth
        'shadow-sm',
        isEmphasis
          ? 'ring-1 ring-inset ring-white/20 shadow-md font-extrabold'
          : isNA
            ? 'border border-black/5'
            : 'border border-black/10 font-bold',
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
