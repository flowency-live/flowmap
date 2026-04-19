import { MessageSquare, Calendar } from 'lucide-react';
import { StatePicker } from '@/components/StatePicker';
import { usePortfolioStore } from '@/stores/portfolioStore';
import type { Initiative, FlowState, Effort } from '@/types';
import { cn } from '@/lib/utils';

interface TeamKanbanCardProps {
  initiative: Initiative;
  teamId: string;
  parentContext: string | null;
  themeName: string;
}

export function TeamKanbanCard({
  initiative,
  teamId,
  parentContext,
  themeName,
}: TeamKanbanCardProps) {
  const updateTeamState = usePortfolioStore((s) => s.updateTeamState);
  const updateTeamEffort = usePortfolioStore((s) => s.updateTeamEffort);
  const updateTeamNotes = usePortfolioStore((s) => s.updateTeamNotes);

  const state = initiative.teamStates[teamId] ?? 'N/S';
  const effort = initiative.teamEfforts[teamId];
  const note = initiative.teamNotes[teamId];
  const hasNote = !!note && note.trim() !== '';

  const handleStateChange = (newState: FlowState) => {
    updateTeamState(initiative.id, teamId, newState);
  };

  const handleEffortChange = (newEffort: Effort | null) => {
    updateTeamEffort(initiative.id, teamId, newEffort);
  };

  const handleNoteChange = (newNote: string) => {
    updateTeamNotes(initiative.id, teamId, newNote);
  };

  return (
    <StatePicker
      value={state}
      effort={effort}
      note={note}
      onChange={handleStateChange}
      onEffortChange={handleEffortChange}
      onNoteChange={handleNoteChange}
    >
      <div
        className={cn(
          'bg-card border border-border rounded-lg p-3',
          'shadow-sm hover:shadow-md hover:-translate-y-0.5',
          'transition-all duration-150'
        )}
      >
        {/* Theme badge */}
        {themeName && (
          <div className="text-[10px] text-muted-foreground mb-1 truncate">
            {themeName}
          </div>
        )}

        {/* Parent context */}
        {parentContext && (
          <div className="text-[10px] text-muted-foreground/70 mb-0.5 truncate flex items-center gap-0.5">
            <span className="text-muted-foreground/50">└</span>
            {parentContext}
          </div>
        )}

        {/* Initiative name */}
        <div className="font-medium text-sm text-foreground mb-2 leading-tight">
          {initiative.name}
        </div>

        {/* Footer with metadata */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {/* Due date */}
          {initiative.dueDate && (
            <div className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              <span>{initiative.dueDate}</span>
            </div>
          )}

          {/* Effort badge */}
          {effort && (
            <div className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {effort}
            </div>
          )}

          {/* Note indicator */}
          {hasNote && (
            <MessageSquare className="h-3 w-3 text-primary fill-primary/20" />
          )}
        </div>
      </div>
    </StatePicker>
  );
}
