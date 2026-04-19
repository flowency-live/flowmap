import { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Link2, Plus, Trash2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StateBadge } from '@/components/StateBadge';
import { usePortfolioStore } from '@/stores/portfolioStore';
import type { Initiative } from '@/types';

interface InitiativeDetailProps {
  initiative: Initiative | null;
  onClose: () => void;
}

// Helper to parse date string like "15th May" or "LIVE 29th June" to Date
function parseDateString(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const cleaned = dateStr.replace(/^LIVE\s+/i, '').trim();
  const match = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
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
function formatDateString(date: Date, isLiveDate: boolean): string {
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  const monthName = format(date, 'MMMM', { locale: enGB });
  const formatted = `${day}${suffix} ${monthName}`;
  return isLiveDate ? `LIVE ${formatted}` : formatted;
}

export function InitiativeDetail({ initiative, onClose }: InitiativeDetailProps) {
  const {
    teams,
    initiatives,
    updateNotes,
    updateSequencingNotes,
    updateLiveDate,
    updateDueDate,
    getDependenciesFor,
    addDependency,
    removeDependency,
  } = usePortfolioStore();

  const [notes, setNotes] = useState('');
  const [seqNotes, setSeqNotes] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [addingBlockedBy, setAddingBlockedBy] = useState(false);
  const [addingBlocks, setAddingBlocks] = useState(false);

  // Get dependencies for this initiative
  const dependencies = useMemo(
    () => (initiative ? getDependenciesFor(initiative.id) : { blockedBy: [], blocks: [] }),
    [initiative, getDependenciesFor]
  );

  // Get available initiatives for dependency selection (exclude current and already linked)
  const availableForBlockedBy = useMemo(() => {
    if (!initiative) return [];
    const blockedByIds = new Set(dependencies.blockedBy.map((d) => d.fromInitiativeId));
    return initiatives.filter(
      (i) => i.id !== initiative.id && !blockedByIds.has(i.id)
    );
  }, [initiative, initiatives, dependencies.blockedBy]);

  const availableForBlocks = useMemo(() => {
    if (!initiative) return [];
    const blocksIds = new Set(dependencies.blocks.map((d) => d.toInitiativeId));
    return initiatives.filter(
      (i) => i.id !== initiative.id && !blocksIds.has(i.id)
    );
  }, [initiative, initiatives, dependencies.blocks]);

  // Helper to get initiative name by ID
  const getInitiativeName = (id: string) => {
    const init = initiatives.find((i) => i.id === id);
    return init?.name ?? 'Unknown';
  };

  useEffect(() => {
    if (initiative) {
      setNotes(initiative.notes);
      setSeqNotes(initiative.sequencingNotes);
    }
  }, [initiative]);

  const handleSaveNotes = () => {
    if (initiative) {
      updateNotes(initiative.id, notes);
    }
  };

  const handleSaveSeqNotes = () => {
    if (initiative) {
      updateSequencingNotes(initiative.id, seqNotes);
    }
  };

  // Check if this is a parent (has children) - we show liveDate for parents, dueDate for children
  const isParent = initiative?.parentId === null;
  const currentDate = isParent ? initiative?.liveDate : initiative?.dueDate;

  if (!initiative) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-6">
        <div className="text-center">
          <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select an initiative to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{initiative.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Edit team states and notes
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Date Field */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
            {isParent ? 'Live Date' : 'Due Date'}
          </label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button className="w-full px-2.5 py-1.5 text-sm border border-input rounded-md bg-background text-left flex items-center gap-2 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {currentDate ? (
                  <span>{currentDate}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {isParent ? 'Select live date...' : 'Select due date...'}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDateString(currentDate ?? '')}
                onSelect={(date) => {
                  if (date) {
                    const formatted = formatDateString(date, isParent);
                    if (isParent) {
                      updateLiveDate(initiative.id, formatted);
                    } else {
                      updateDueDate(initiative.id, formatted);
                    }
                  }
                  setDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Team States */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Team States
          </h3>
          <div className="space-y-1">
            {teams.map((team) => {
              const state = initiative.teamStates[team.id] ?? 'N/S';
              const effort = initiative.teamEfforts[team.id];
              const note = initiative.teamNotes[team.id];
              const hasNote = !!note && note.trim() !== '';

              return (
                <div key={team.id} className="py-2 border-b border-border last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-14 truncate">{team.name}</span>
                      {effort && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {effort}
                        </span>
                      )}
                    </div>
                    <StateBadge state={state} size="lg" />
                  </div>
                  {/* Team Note */}
                  {hasNote && (
                    <p className="mt-1.5 text-xs text-muted-foreground italic pl-0.5">
                      "{note}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dependencies
            </h3>
          </div>

          {/* Blocked By */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Blocked by</span>
              <button
                onClick={() => setAddingBlockedBy(!addingBlockedBy)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {addingBlockedBy && availableForBlockedBy.length > 0 && (
              <select
                className="w-full px-2 py-1 text-xs border border-input rounded bg-background mb-1"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addDependency(e.target.value, initiative.id);
                    setAddingBlockedBy(false);
                  }
                }}
              >
                <option value="">Select initiative...</option>
                {availableForBlockedBy.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
            {dependencies.blockedBy.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No blockers</p>
            ) : (
              <div className="space-y-1">
                {dependencies.blockedBy.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs"
                  >
                    <span className="truncate">{getInitiativeName(dep.fromInitiativeId)}</span>
                    <button
                      onClick={() => removeDependency(dep.id)}
                      className="text-muted-foreground hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Blocks</span>
              <button
                onClick={() => setAddingBlocks(!addingBlocks)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
            {addingBlocks && availableForBlocks.length > 0 && (
              <select
                className="w-full px-2 py-1 text-xs border border-input rounded bg-background mb-1"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addDependency(initiative.id, e.target.value);
                    setAddingBlocks(false);
                  }
                }}
              >
                <option value="">Select initiative...</option>
                {availableForBlocks.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
            {dependencies.blocks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Not blocking anything</p>
            ) : (
              <div className="space-y-1">
                {dependencies.blocks.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded text-xs"
                  >
                    <span className="truncate">{getInitiativeName(dep.toInitiativeId)}</span>
                    <button
                      onClick={() => removeDependency(dep.id)}
                      className="text-muted-foreground hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this initiative..."
            className="w-full h-20 px-2.5 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Sequencing Notes */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Sequencing Notes
          </h3>
          <textarea
            value={seqNotes}
            onChange={(e) => setSeqNotes(e.target.value)}
            onBlur={handleSaveSeqNotes}
            placeholder="Dependencies, blockers, timing..."
            className="w-full h-20 px-2.5 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
