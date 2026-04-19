import { useMemo } from 'react';
import type { VisibleDependency } from '@/lib/timeline';

interface DependencyLinesProps {
  dependencies: VisibleDependency[];
  columnWidth: number;
  teamRowHeight: number;
  teamOrder: string[]; // Team IDs in display order
}

export function DependencyLines({
  dependencies,
  columnWidth,
  teamRowHeight,
  teamOrder,
}: DependencyLinesProps) {
  // Calculate line paths for each dependency
  const lines = useMemo(() => {
    return dependencies.map((dep) => {
      const fromTeamIndex = teamOrder.indexOf(dep.fromBar.teamId);
      const toTeamIndex = teamOrder.indexOf(dep.toBar.teamId);

      if (fromTeamIndex === -1 || toTeamIndex === -1) return null;

      // Calculate coordinates
      // From: end of the "from" bar
      const fromX =
        150 + dep.fromBar.columnStart * columnWidth + dep.fromBar.columnSpan * columnWidth - 2;
      const fromY = 44 + fromTeamIndex * teamRowHeight + teamRowHeight / 2; // Header offset + row center

      // To: start of the "to" bar
      const toX = 150 + dep.toBar.columnStart * columnWidth + 2;
      const toY = 44 + toTeamIndex * teamRowHeight + teamRowHeight / 2;

      // Calculate control points for curved line
      const midX = (fromX + toX) / 2;
      const curveOffset = Math.abs(toTeamIndex - fromTeamIndex) * 10;

      // Create path
      let path: string;
      if (fromTeamIndex === toTeamIndex) {
        // Same row - simple curve above
        path = `M ${fromX} ${fromY} Q ${midX} ${fromY - 20} ${toX} ${toY}`;
      } else {
        // Different rows - S-curve
        path = `M ${fromX} ${fromY} C ${fromX + curveOffset} ${fromY} ${toX - curveOffset} ${toY} ${toX} ${toY}`;
      }

      return {
        id: dep.id,
        path,
        toX,
        toY,
        isBlocking: dep.isBlocking,
      };
    }).filter(Boolean) as {
      id: string;
      path: string;
      toX: number;
      toY: number;
      isBlocking: boolean;
    }[];
  }, [dependencies, columnWidth, teamRowHeight, teamOrder]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      <defs>
        {/* Arrow marker for line ends */}
        <marker
          id="arrow-default"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L6,3 z"
            className="fill-muted-foreground/50"
          />
        </marker>
        <marker
          id="arrow-blocking"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L6,3 z"
            className="fill-destructive"
          />
        </marker>
      </defs>

      {lines.map((line) => (
        <g key={line.id}>
          <path
            d={line.path}
            fill="none"
            className={
              line.isBlocking
                ? 'stroke-destructive'
                : 'stroke-muted-foreground/40'
            }
            strokeWidth={line.isBlocking ? 2 : 1.5}
            strokeDasharray={line.isBlocking ? undefined : '4 2'}
            markerEnd={`url(#arrow-${line.isBlocking ? 'blocking' : 'default'})`}
          />
        </g>
      ))}
    </svg>
  );
}
