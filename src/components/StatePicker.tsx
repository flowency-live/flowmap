import { useState, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StateBadge } from '@/components/StateBadge';
import { Pencil, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import type { FlowState, Effort } from '@/types';
import { FLOW_STATES, STATE_CONFIG, EFFORT_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';

// Helper to parse date string like "15th May" to Date
function parseDateString(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
  if (match && match[1] && match[2]) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2];
    const year = new Date().getFullYear();
    const parsed = parse(`${day} ${monthStr} ${year}`, 'd MMMM yyyy', new Date(), { locale: enGB });
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

// Format Date to display string like "29th June"
function formatDateString(date: Date): string {
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  const monthName = format(date, 'MMMM', { locale: enGB });
  return `${day}${suffix} ${monthName}`;
}

interface StatePickerProps {
  value: FlowState;
  effort?: Effort | undefined;
  note?: string | undefined;
  startDate?: string | undefined;
  isAtRisk?: boolean;
  onChange: (state: FlowState) => void;
  onEffortChange?: (effort: Effort | null) => void;
  onNoteChange?: (note: string) => void;
  onStartDateChange?: (startDate: string | null) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function StatePicker({
  value,
  effort,
  note,
  startDate,
  isAtRisk = false,
  onChange,
  onEffortChange,
  onNoteChange,
  onStartDateChange,
  disabled = false,
  size = 'md',
  className,
  children,
}: StatePickerProps) {
  const [open, setOpen] = useState(false);
  const [showEffort, setShowEffort] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [noteValue, setNoteValue] = useState(note ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync noteValue with prop
  useEffect(() => {
    setNoteValue(note ?? '');
  }, [note]);

  // Focus textarea when showing notes
  useEffect(() => {
    if (showNotes && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showNotes]);

  const handleSelectState = (state: FlowState) => {
    onChange(state);
    // Don't auto-close, let user set effort/notes too
  };

  const handleSelectEffort = (selectedEffort: Effort | null) => {
    onEffortChange?.(selectedEffort);
    setShowEffort(false);
  };

  const handleSaveNote = () => {
    onNoteChange?.(noteValue);
    setShowNotes(false);
  };

  const handleSelectStartDate = (date: Date | undefined) => {
    if (date) {
      onStartDateChange?.(formatDateString(date));
    }
    setShowStartDate(false);
  };

  const handleClearStartDate = () => {
    onStartDateChange?.(null);
    setShowStartDate(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setShowEffort(false);
      setShowNotes(false);
      setShowStartDate(false);
      // Save note on close
      if (noteValue !== (note ?? '')) {
        onNoteChange?.(noteValue);
      }
    }
  };

  const hasNote = !!note && note.trim() !== '';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {children ? (
          <div
            className={cn('cursor-pointer', className)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        ) : (
          <button
            className={cn(
              'inline-flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded disabled:opacity-50 disabled:pointer-events-none',
              isAtRisk && 'ring-2 ring-destructive ring-offset-1',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <StateBadge state={value} size={size} />
              {hasNote && (
                <MessageSquare className="absolute -top-0.5 -right-0.5 h-2 w-2 text-primary fill-primary" />
              )}
              {isAtRisk && (
                <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              )}
            </div>
            {effort && (
              <span className={cn(
                'text-[9px] font-medium leading-none',
                isAtRisk ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {effort}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        {showStartDate ? (
          <div className="min-w-[240px]">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Estimated Start Date
            </div>
            <Calendar
              mode="single"
              selected={parseDateString(startDate)}
              onSelect={handleSelectStartDate}
              initialFocus
            />
            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowStartDate(false)}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1"
              >
                Back
              </button>
              {startDate && (
                <button
                  onClick={handleClearStartDate}
                  className="flex-1 text-xs text-destructive hover:text-destructive/80 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        ) : showNotes ? (
          <div className="min-w-[240px]">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Team Note
            </div>
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add a note for this team..."
              className="w-full h-20 px-2 py-1.5 text-sm bg-muted border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowNotes(false)}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1"
              >
                Back
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 text-xs bg-primary text-primary-foreground rounded py-1 hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        ) : showEffort ? (
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
        ) : (
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
            {(onEffortChange || onNoteChange || onStartDateChange) && (
              <div className="mt-2 pt-2 border-t border-border space-y-1">
                {onEffortChange && (
                  <button
                    onClick={() => setShowEffort(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1 hover:bg-accent/50 rounded"
                  >
                    {effort ? `Effort: ${effort}` : '+ Add effort'}
                  </button>
                )}
                {onStartDateChange && (
                  <button
                    onClick={() => setShowStartDate(true)}
                    className={cn(
                      'w-full text-xs text-left px-2 py-1 hover:bg-accent/50 rounded flex items-center gap-1.5',
                      isAtRisk ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {startDate ? (
                      <span className="truncate max-w-[180px]">
                        Start: {startDate}
                        {isAtRisk && ' ⚠️ At Risk'}
                      </span>
                    ) : (
                      'Set start date'
                    )}
                  </button>
                )}
                {onNoteChange && (
                  <button
                    onClick={() => setShowNotes(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground text-left px-2 py-1 hover:bg-accent/50 rounded flex items-center gap-1.5"
                  >
                    <Pencil className="h-3 w-3" />
                    {hasNote ? (
                      <span className="truncate max-w-[180px]">{note}</span>
                    ) : (
                      'Add note'
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
