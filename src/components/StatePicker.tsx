import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StateBadge } from '@/components/StateBadge';
import type { FlowState } from '@/types';
import { FLOW_STATES, STATE_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

interface StatePickerProps {
  value: FlowState;
  onChange: (state: FlowState) => void;
  disabled?: boolean;
  className?: string;
}

export function StatePicker({
  value,
  onChange,
  disabled = false,
  className,
}: StatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (state: FlowState) => {
    onChange(state);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'inline-flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded disabled:opacity-50 disabled:pointer-events-none',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <StateBadge state={value} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {FLOW_STATES.map((state) => {
            const config = STATE_CONFIG[state];
            const isSelected = state === value;

            return (
              <button
                key={state}
                onClick={() => handleSelect(state)}
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
      </PopoverContent>
    </Popover>
  );
}
