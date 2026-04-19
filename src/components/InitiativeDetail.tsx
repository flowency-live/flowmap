import { useState, useEffect } from 'react';
import { Pencil, X, Calendar } from 'lucide-react';
import { StateBadge } from '@/components/StateBadge';
import { usePortfolioStore } from '@/stores/portfolioStore';
import type { Initiative } from '@/types';
import { cn } from '@/lib/utils';

interface InitiativeDetailProps {
  initiative: Initiative | null;
  onClose: () => void;
}

export function InitiativeDetail({ initiative, onClose }: InitiativeDetailProps) {
  const {
    teams,
    updateNotes,
    updateSequencingNotes,
    updateLiveDate,
    updateDueDate,
  } = usePortfolioStore();

  const [notes, setNotes] = useState('');
  const [seqNotes, setSeqNotes] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteValue, setEditNoteValue] = useState('');

  useEffect(() => {
    if (initiative) {
      setNotes(initiative.notes);
      setSeqNotes(initiative.sequencingNotes);
      setLiveDate(initiative.liveDate ?? '');
      setDueDate(initiative.dueDate ?? '');
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

  const handleSaveLiveDate = () => {
    if (initiative) {
      updateLiveDate(initiative.id, liveDate);
    }
  };

  const handleSaveDueDate = () => {
    if (initiative) {
      updateDueDate(initiative.id, dueDate);
    }
  };

  // Check if this is a parent (has children) - we show liveDate for parents, dueDate for children
  const isParent = initiative?.parentId === null;

  if (!initiative) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-6">
        <div className="text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
          <input
            type="text"
            value={isParent ? liveDate : dueDate}
            onChange={(e) => isParent ? setLiveDate(e.target.value) : setDueDate(e.target.value)}
            onBlur={isParent ? handleSaveLiveDate : handleSaveDueDate}
            placeholder={isParent ? 'e.g., LIVE 29th June' : 'e.g., 15th May'}
            className="w-full px-2.5 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
              const isEditing = editingNote === team.id;

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
                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        autoFocus
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        onBlur={() => {
                          // Save handled via StatePicker, just close here
                          setEditingNote(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingNote(null);
                        }}
                        placeholder="Add note..."
                        className="w-full h-14 px-2 py-1 text-xs border border-input rounded bg-muted resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ) : hasNote ? (
                    <p className="mt-1.5 text-xs text-muted-foreground italic pl-0.5">
                      "{note}"
                    </p>
                  ) : null}
                </div>
              );
            })}
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
