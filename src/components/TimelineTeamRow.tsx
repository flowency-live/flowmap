import { Link } from 'wouter';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CapacityIndicator, CapacityBadge } from '@/components/CapacityIndicator';
import { TimelineBar } from '@/components/TimelineBar';
import type { Team, Initiative } from '@/types';
import type { BarPosition, LoadMetrics, TimeColumn } from '@/lib/timeline';

interface TimelineTeamRowProps {
  team: Team;
  bars: BarPosition[];
  columns: TimeColumn[];
  weekLoads: Map<string, LoadMetrics>;
  selectedInitiativeId: string | null;
  onBarClick: (initiative: Initiative) => void;
  initiatives: Initiative[];
  columnWidth: number;
}

export function TimelineTeamRow({
  team,
  bars,
  columns,
  weekLoads,
  selectedInitiativeId,
  onBarClick,
  initiatives,
  columnWidth,
}: TimelineTeamRowProps) {
  // Get initiatives for this row's bars
  const getInitiative = (id: string) => initiatives.find((i) => i.id === id);

  // Calculate row height based on bars
  const hasChildBars = bars.some((b) => b.isChild);
  const rowHeight = hasChildBars ? 56 : 36;

  // Check if any week is overloaded
  const hasOverload = Array.from(weekLoads.values()).some((l) => l.isOverloaded);

  return (
    <div className="flex border-b border-border/50 last:border-b-0">
      {/* Team Info (Fixed Left Column) */}
      <div
        className={cn(
          'w-[150px] flex-shrink-0 px-3 py-2 border-r border-border bg-card sticky left-0 z-10',
          hasOverload && 'bg-destructive/5'
        )}
      >
        <div className="flex items-center gap-1.5">
          <Link
            href={`/team/${team.id}`}
            className={cn(
              'text-sm font-semibold hover:underline transition-colors truncate',
              team.isPrimaryConstraint
                ? 'text-destructive hover:text-destructive/80'
                : 'hover:text-primary'
            )}
          >
            {team.name}
          </Link>
          {team.isPrimaryConstraint && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
          )}
        </div>

        {/* Capacity badge */}
        {team.capacityConfig ? (
          <CapacityBadge
            streams={team.capacityConfig.streams}
            streamPct={team.capacityConfig.streamPct}
            bauPct={team.capacityConfig.bauPct}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground italic">
            No capacity set
          </span>
        )}

        {/* Current week load indicator */}
        {team.capacityConfig && (
          <div className="mt-1.5">
            <CapacityIndicator
              load={
                weekLoads.get(
                  columns.find((c) => c.isCurrentWeek)?.id ?? ''
                ) ?? { activeItems: 0, capacity: 1, utilizationPct: 0, isOverloaded: false }
              }
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Timeline Area (Scrollable) */}
      <div
        className="flex-1 relative"
        style={{ height: rowHeight }}
      >
        {/* Week background cells with load indicators */}
        <div className="absolute inset-0 flex">
          {columns.map((col) => {
            const load = weekLoads.get(col.id);
            const isOverloaded = load?.isOverloaded ?? false;
            const utilizationPct = load?.utilizationPct ?? 0;

            // Background opacity based on utilization
            let bgOpacity = 0;
            if (utilizationPct > 0 && utilizationPct <= 50) bgOpacity = 0.05;
            else if (utilizationPct <= 80) bgOpacity = 0.1;
            else if (utilizationPct <= 100) bgOpacity = 0.15;
            else bgOpacity = 0.2;

            return (
              <div
                key={col.id}
                className={cn(
                  'border-r border-border/30',
                  col.isCurrentWeek && 'bg-primary/5'
                )}
                style={{
                  width: columnWidth,
                  backgroundColor: isOverloaded
                    ? `rgba(239, 68, 68, ${bgOpacity})`
                    : utilizationPct > 0
                    ? `rgba(34, 197, 94, ${bgOpacity})`
                    : undefined,
                }}
              />
            );
          })}
        </div>

        {/* Initiative bars */}
        {bars.map((bar) => {
          const init = getInitiative(bar.initiativeId);
          if (!init) return null;

          return (
            <TimelineBar
              key={`${bar.initiativeId}-${bar.teamId}`}
              bar={bar}
              onClick={() => onBarClick(init)}
              isSelected={selectedInitiativeId === bar.initiativeId}
              columnWidth={columnWidth}
            />
          );
        })}
      </div>
    </div>
  );
}
