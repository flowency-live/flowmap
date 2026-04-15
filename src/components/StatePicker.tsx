import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StateBadge } from '@/components/StateBadge';
import type { FlowState, Effort } from '@/types';
import { FLOW_STATES, STATE_CONFIG, EFFORT_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';

interface StatePickerProps {
  value: FlowState;
  effort?: Effort | undefined;
  onChange: (state: FlowState) => void;
  onEffortChange?: (effort: Effort | null) => void;
  disabled?: boolean;
  className?: string;
}

export function StatePicker({
  value,
  effort,
  onChange,
  onEffortChange,
  disabled = false,
  className,
}: StatePickerProps) {
  const [open, setOpen] = useState(false);
  const [showEffort, setShowEffort] = useState(false);

  const handleSelectState = (state: FlowState) => {
    onChange(state);
    if (onEffortChange) {
      setShowEffort(true);
    } else {
      setOpen(false);
    }
  };

  const handleSelectEffort = (selectedEffort: Effort | null) => {
    onEffortChange?.(selectedEffort);
    setOpen(false);
    setShowEffort(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setShowEffort(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'inline-flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded disabled:opacity-50 disabled:pointer-events-none',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <StateBadge state={value} />
          {effort && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {effort}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        {!showEffort ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {FLOW_STATES.map((state) => {
                const config = STATE_CONFIG[state];
                const isSelected = state === value;

                return (
                  <button
                    key={state}
                    onClick={() => handleSelectState(state)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      isSelected
                        ? 'bg-accent ring-2 ring-ring'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <StateBadge state={state} />
                    <span className="text-foreground">{config.label}</span>
                  </button>
                );
              })}
            </div>
            {onEffortChange && (
              <div className="mt-2 pt-2 border-t border-border">
                <button
                  onClick={() => setShowEffort(true)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
                >
                  {effort ? `Effort: ${effort} (click to change)` : '+ Add effort'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="min-w-[200px]">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Effort Estimate
            </div>
            <div className="grid grid-cols-4 gap-1">
              {EFFORT_OPTIONS.map((option) => {
                const isSelected = option.value === effort;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectEffort(option.value)}
                    className={cn(
                      'px-2 py-1.5 text-xs font-medium rounded transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {option.value}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowEffort(false)}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1"
              >
                Back
              </button>
              {effort && (
                <button
                  onClick={() => handleSelectEffort(null)}
                  className="flex-1 text-xs text-destructive hover:text-destructive/80 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
