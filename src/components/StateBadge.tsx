import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG, FLOW_STATES } from '@/types';
import { useThemeStore } from '@/stores/themeStore';

interface StateBadgeProps {
  state: FlowState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Tight, functional sizes - minimal padding
const SIZE_CLASSES = {
  sm: 'h-[14px] px-1 text-[8px]',
  md: 'h-[16px] px-1.5 text-[9px]',
  lg: 'h-[18px] px-2 text-[10px]',
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
        // Base styles - label, not button
        'inline-flex items-center justify-center',
        'rounded-[2px] tracking-wider uppercase',
        // 1px darker border for all
        'border border-black/30',
        isEmphasis ? 'font-semibold' : 'font-medium',
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
