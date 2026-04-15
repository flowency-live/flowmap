import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatePicker } from '@/components/StatePicker';
import { usePortfolioStore } from '@/stores/portfolioStore';
import type { Initiative } from '@/types';

interface InitiativeDetailProps {
  initiative: Initiative | null;
  onClose: () => void;
}

export function InitiativeDetail({ initiative, onClose }: InitiativeDetailProps) {
  const { teams, updateTeamState, updateNotes, updateSequencingNotes } =
    usePortfolioStore();

  const [notes, setNotes] = useState('');
  const [seqNotes, setSeqNotes] = useState('');

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

  return (
    <Sheet open={initiative !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        {initiative && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display">{initiative.name}</SheetTitle>
              <SheetDescription>
                Edit team states and notes for this initiative
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Team States */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Team States
                </h3>
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="text-sm font-medium">{team.name}</span>
                      <StatePicker
                        value={initiative.teamStates[team.id] ?? 'NOT_STARTED'}
                        onChange={(state) =>
                          updateTeamState(initiative.id, team.id, state)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Add notes about this initiative..."
                  className="w-full h-24 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Sequencing Notes */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Sequencing Notes
                </h3>
                <textarea
                  value={seqNotes}
                  onChange={(e) => setSeqNotes(e.target.value)}
                  onBlur={handleSaveSeqNotes}
                  placeholder="Dependencies, blockers, timing..."
                  className="w-full h-24 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border">
                <Button variant="outline" onClick={onClose} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
