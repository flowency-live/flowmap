import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowState } from '@/types';
import { STATE_CONFIG } from '@/types';
import {
  HelpCircle,
  Search,
  Clock,
  PlayCircle,
  FlaskConical,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';

interface StateBadgeProps {
  state: FlowState;
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const STATE_ICONS: Record<FlowState, LucideIcon> = {
  NOT_STARTED: HelpCircle,
  IN_DISCOVERY: Search,
  READY: Clock,
  IN_FLIGHT: PlayCircle,
  UAT: FlaskConical,
  DONE: CheckCircle2,
  NA: MinusCircle,
};

export function StateBadge({
  state,
  showIcon = false,
  showLabel = false,
  className,
}: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  const Icon = STATE_ICONS[state];

  return (
    <div
      title={config.label}
      className={cn(
        'inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide h-6 min-w-[32px]',
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {showIcon && state !== 'NA' ? (
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {showLabel && config.label}
        </span>
      ) : showLabel ? (
        config.label
      ) : (
        config.short
      )}
    </div>
  );
}

/**
 * Legend items for displaying all states
 */
export const STATE_LEGEND_ITEMS: { state: FlowState; label: string }[] = [
  { state: 'NOT_STARTED', label: 'Not Started' },
  { state: 'IN_DISCOVERY', label: 'In Discovery' },
  { state: 'READY', label: 'Ready' },
  { state: 'IN_FLIGHT', label: 'In Flight' },
  { state: 'UAT', label: 'UAT' },
  { state: 'DONE', label: 'Done' },
  { state: 'NA', label: 'Not Required' },
];
