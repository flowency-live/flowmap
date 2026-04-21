import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';
import { useThemeStore } from '@/stores/themeStore';

interface StateBadgeProps {
  state: FlowState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Tight, functional sizes
const SIZE_CLASSES = {
  sm: 'h-4 px-1.5 text-[9px]',
  md: 'h-5 px-2 text-[10px]',
  lg: 'h-6 px-2.5 text-[11px]',
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

  return (
    <div
      title={config.label}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      className={cn(
        // Base styles - tight, functional
        'inline-flex items-center justify-center',
        'rounded-[2px] tracking-wide uppercase',
        'transition-colors duration-100',
        // 1px border for definition
        isEmphasis
          ? 'border border-current/30 font-semibold'
          : isNA
            ? 'border border-current/10'
            : 'border border-current/20 font-medium',
        // Size
        SIZE_CLASSES[size],
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
