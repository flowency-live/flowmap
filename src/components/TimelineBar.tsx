import { motion } from 'framer-motion';
import { STATE_CONFIG } from '@/types';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import type { BarPosition } from '@/lib/timeline';
import { formatDateDisplay } from '@/lib/timeline';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineBarProps {
  bar: BarPosition;
  onClick: () => void;
  isSelected?: boolean;
  columnWidth: number;
}

export function TimelineBar({
  bar,
  onClick,
  isSelected = false,
  columnWidth,
}: TimelineBarProps) {
  const theme = useThemeStore((s) => s.theme);
  const config = STATE_CONFIG[bar.state];
  const isDark = theme === 'dark';

  const bgColor = isDark ? config.bgColorDark : config.bgColor;
  const textColor = isDark ? config.textColorDark : config.textColor;
  const isEmphasis = config.isEmphasis;

  // Calculate bar width and position
  const barWidth = bar.columnSpan * columnWidth - 4; // -4 for margins
  const barLeft = bar.columnStart * columnWidth + 2;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={onClick}
          className={cn(
            'absolute h-6 rounded-[4px] flex items-center px-2 text-[11px] font-medium truncate cursor-pointer transition-all',
            'hover:ring-2 hover:ring-offset-1 hover:ring-primary/50',
            isSelected && 'ring-2 ring-offset-1 ring-primary',
            isEmphasis && isDark && 'shadow-[0_0_8px_rgba(139,92,246,0.4)]',
            bar.isChild && 'h-5 text-[10px]'
          )}
          style={{
            backgroundColor: bgColor,
            color: textColor,
            width: barWidth,
            left: barLeft,
            top: bar.isChild ? 28 : 4,
          }}
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <span className="truncate">{bar.initiativeName}</span>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px]">
        <div className="space-y-1">
          <p className="font-semibold">{bar.initiativeName}</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium">State:</span>{' '}
              {config.label}
            </p>
            <p>
              <span className="font-medium">Effort:</span>{' '}
              {bar.effortDays} days
            </p>
            <p>
              <span className="font-medium">Start:</span>{' '}
              {formatDateDisplay(bar.startDate)}
            </p>
            <p>
              <span className="font-medium">End:</span>{' '}
              {formatDateDisplay(bar.endDate)}
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
