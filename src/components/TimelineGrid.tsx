import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TimelineTeamRow } from '@/components/TimelineTeamRow';
import type { Team, Initiative } from '@/types';
import type { BarPosition, TimeColumn, TeamLoadByWeek } from '@/lib/timeline';

interface TimelineGridProps {
  teams: Team[];
  initiatives: Initiative[];
  columns: TimeColumn[];
  bars: BarPosition[];
  teamLoads: Map<string, TeamLoadByWeek>;
  selectedInitiativeId: string | null;
  onBarClick: (initiative: Initiative) => void;
  columnWidth?: number;
}

export function TimelineGrid({
  teams,
  initiatives,
  columns,
  bars,
  teamLoads,
  selectedInitiativeId,
  onBarClick,
  columnWidth = 80,
}: TimelineGridProps) {
  // Group bars by team
  const barsByTeam = useMemo(() => {
    const map = new Map<string, BarPosition[]>();
    for (const team of teams) {
      map.set(team.id, []);
    }
    for (const bar of bars) {
      const existing = map.get(bar.teamId) ?? [];
      existing.push(bar);
      map.set(bar.teamId, existing);
    }
    return map;
  }, [teams, bars]);

  // Filter to teams that have work
  const teamsWithWork = useMemo(() => {
    return teams.filter((team) => {
      const teamBars = barsByTeam.get(team.id) ?? [];
      return teamBars.length > 0;
    });
  }, [teams, barsByTeam]);

  const totalWidth = columns.length * columnWidth;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Header with time columns */}
      <div className="flex border-b border-border bg-muted/50 sticky top-0 z-20">
        {/* Team column header */}
        <div className="w-[150px] flex-shrink-0 px-3 py-2 border-r border-border font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/50 z-30">
          Team
        </div>

        {/* Time column headers */}
        <div className="flex overflow-hidden" style={{ width: totalWidth }}>
          {columns.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex-shrink-0 px-1 py-2 text-center border-r border-border/30 text-xs font-medium',
                col.isCurrentWeek
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground'
              )}
              style={{ width: columnWidth }}
            >
              {col.label}
              {col.isCurrentWeek && (
                <div className="text-[9px] font-normal text-primary/70">
                  This week
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team rows */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 150 + totalWidth }}>
          {teamsWithWork.length > 0 ? (
            teamsWithWork.map((team) => (
              <TimelineTeamRow
                key={team.id}
                team={team}
                bars={barsByTeam.get(team.id) ?? []}
                columns={columns}
                weekLoads={teamLoads.get(team.id)?.weekLoads ?? new Map()}
                selectedInitiativeId={selectedInitiativeId}
                onBarClick={onBarClick}
                initiatives={initiatives}
                columnWidth={columnWidth}
              />
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No scheduled work to display</p>
              <p className="text-xs mt-1">
                Add due dates and effort estimates to initiatives to see them here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Today indicator line */}
      <TodayIndicator columns={columns} columnWidth={columnWidth} />
    </div>
  );
}

interface TodayIndicatorProps {
  columns: TimeColumn[];
  columnWidth: number;
}

function TodayIndicator({ columns, columnWidth }: TodayIndicatorProps) {
  const currentWeekIndex = columns.findIndex((c) => c.isCurrentWeek);
  if (currentWeekIndex === -1) return null;

  // Calculate position within the current week
  const today = new Date();
  const col = columns[currentWeekIndex];
  if (!col) return null;
  const daysIntoWeek = Math.max(
    0,
    Math.min(7, (today.getTime() - col.start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const positionInColumn = (daysIntoWeek / 7) * columnWidth;
  const leftPosition = 150 + currentWeekIndex * columnWidth + positionInColumn;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-primary/60 pointer-events-none z-10"
      style={{ left: leftPosition }}
    >
      <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-primary" />
    </div>
  );
}
