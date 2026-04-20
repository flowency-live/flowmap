import { parse, format, addDays, addBusinessDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, differenceInBusinessDays, isWithinInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { enGB } from 'date-fns/locale';
import type { Effort, Initiative, Team, Dependency, FlowState } from '@/types';

/**
 * Timeline View Utilities
 *
 * Core calculations for Gantt-style timeline visualization:
 * - Effort to days conversion
 * - Date parsing and formatting
 * - Bar positioning
 * - Capacity calculations
 * - Dependency line coordinates
 */

// ============================================================================
// Types
// ============================================================================

export interface TimeColumn {
  id: string;
  start: Date;
  end: Date;
  label: string;
  isCurrentWeek?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BarPosition {
  initiativeId: string;
  teamId: string;
  startDate: Date;
  endDate: Date;
  columnStart: number; // 0-indexed column position
  columnSpan: number;  // Number of columns to span
  state: FlowState;
  effortDays: number;
  initiativeName: string;
  isChild: boolean;
}

export interface LoadMetrics {
  activeItems: number;
  capacity: number;
  utilizationPct: number;
  isOverloaded: boolean;
}

export interface TeamLoadByWeek {
  team: Team;
  weekLoads: Map<string, LoadMetrics>; // weekId -> load metrics
}

export interface VisibleDependency {
  id: string;
  fromBar: BarPosition;
  toBar: BarPosition;
  isBlocking: boolean; // true if 'from' is blocking 'to' that's ready to start
}

// ============================================================================
// Effort Conversion
// ============================================================================

const EFFORT_TO_DAYS: Record<Effort, number> = {
  '1d': 1,
  '3d': 3,
  '1w': 5,
  '2w': 10,
  '3w': 15,
  '4w': 20,
  '5w': 25,
  '6w': 30,
  '7w': 35,
  '8w': 40,
  '9w': 45,
  '10w': 50,
};

export function effortToDays(effort: Effort | undefined): number {
  if (!effort) return 0;
  return EFFORT_TO_DAYS[effort] ?? 0;
}

// ============================================================================
// Date Parsing (matching Heatmap.tsx pattern)
// ============================================================================

/**
 * Parse date string like "15th May" or "LIVE 29th June" to Date
 * Assumes current year
 */
export function parseDateString(dateStr: string | undefined): Date | undefined {
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

/**
 * Format Date to display string like "29th June"
 */
export function formatDateDisplay(date: Date): string {
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  const monthName = format(date, 'MMMM', { locale: enGB });
  return `${day}${suffix} ${monthName}`;
}

// ============================================================================
// Time Column Generation
// ============================================================================

export function generateTimeColumns(
  startDate: Date,
  endDate: Date,
  granularity: 'week' | 'month'
): TimeColumn[] {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { locale: enGB });

  if (granularity === 'week') {
    const weeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { locale: enGB }
    );
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { locale: enGB });
      const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();
      return {
        id: format(weekStart, 'yyyy-MM-dd'),
        start: weekStart,
        end: weekEnd,
        label: format(weekStart, 'd MMM', { locale: enGB }),
        isCurrentWeek,
      };
    });
  } else {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      return {
        id: format(monthStart, 'yyyy-MM'),
        start: monthStart,
        end: monthEnd,
        label: format(monthStart, 'MMM yyyy', { locale: enGB }),
      };
    });
  }
}

/**
 * Get default date range for timeline view (12 weeks from today)
 */
export function getDefaultDateRange(): DateRange {
  const today = new Date();
  const start = startOfWeek(today, { locale: enGB });
  const end = addDays(start, 12 * 7); // 12 weeks
  return { start, end };
}

// ============================================================================
// Bar Position Calculation
// ============================================================================

/**
 * Calculate bar position for an initiative on a team's timeline
 * Returns null if initiative has no effort or date for this team
 */
export function calculateBarPosition(
  initiative: Initiative,
  teamId: string,
  columns: TimeColumn[]
): BarPosition | null {
  const effort = initiative.teamEfforts[teamId];
  const state = initiative.teamStates[teamId];

  // Skip if no effort assigned or team is N/A
  if (!effort || !state || state === 'N/A') {
    return null;
  }

  // Get end date (dueDate for children, liveDate for parents)
  const endDateStr = initiative.parentId ? initiative.dueDate : initiative.liveDate;
  const endDate = parseDateString(endDateStr);

  // If no date, we can't position on timeline
  if (!endDate) {
    return null;
  }

  const effortDays = effortToDays(effort);
  const startDate = addDays(endDate, -effortDays);

  // Find which columns this bar spans
  let columnStart = -1;
  let columnEnd = -1;

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (!col) continue;
    // Check if bar overlaps with this column
    if (isWithinInterval(startDate, { start: col.start, end: col.end }) ||
        isWithinInterval(endDate, { start: col.start, end: col.end }) ||
        (startDate <= col.start && endDate >= col.end)) {
      if (columnStart === -1) columnStart = i;
      columnEnd = i;
    }
  }

  // Bar is outside visible range
  if (columnStart === -1) {
    return null;
  }

  return {
    initiativeId: initiative.id,
    teamId,
    startDate,
    endDate,
    columnStart,
    columnSpan: columnEnd - columnStart + 1,
    state,
    effortDays,
    initiativeName: initiative.name,
    isChild: initiative.parentId !== null,
  };
}

/**
 * Get all bar positions for all initiatives across all teams
 */
export function getAllBarPositions(
  initiatives: Initiative[],
  teams: Team[],
  columns: TimeColumn[]
): BarPosition[] {
  const bars: BarPosition[] = [];

  for (const init of initiatives) {
    for (const team of teams) {
      const bar = calculateBarPosition(init, team.id, columns);
      if (bar) {
        bars.push(bar);
      }
    }
  }

  return bars;
}

// ============================================================================
// Capacity Calculations
// ============================================================================

/**
 * Calculate team load for a specific week/column
 */
export function calculateTeamLoad(
  team: Team,
  bars: BarPosition[],
  column: TimeColumn
): LoadMetrics {
  // Count active items for this team in this column
  const teamBars = bars.filter((b) => b.teamId === team.id);
  const activeItems = teamBars.filter((bar) => {
    // Bar overlaps with column
    return isWithinInterval(column.start, { start: bar.startDate, end: bar.endDate }) ||
           isWithinInterval(column.end, { start: bar.startDate, end: bar.endDate }) ||
           (bar.startDate <= column.start && bar.endDate >= column.end);
  }).length;

  // Get capacity from config
  const capacity = team.capacityConfig?.streams ?? 1;
  const utilizationPct = capacity > 0 ? Math.round((activeItems / capacity) * 100) : 0;
  const isOverloaded = activeItems > capacity;

  return {
    activeItems,
    capacity,
    utilizationPct,
    isOverloaded,
  };
}

/**
 * Calculate load metrics for all teams across all columns
 */
export function calculateAllTeamLoads(
  teams: Team[],
  bars: BarPosition[],
  columns: TimeColumn[]
): Map<string, TeamLoadByWeek> {
  const result = new Map<string, TeamLoadByWeek>();

  for (const team of teams) {
    const weekLoads = new Map<string, LoadMetrics>();
    for (const col of columns) {
      const load = calculateTeamLoad(team, bars, col);
      weekLoads.set(col.id, load);
    }
    result.set(team.id, { team, weekLoads });
  }

  return result;
}

// ============================================================================
// Dependency Line Calculations
// ============================================================================

/**
 * Get visible dependencies with their bar positions
 */
export function getVisibleDependencies(
  dependencies: Dependency[],
  bars: BarPosition[]
): VisibleDependency[] {
  const barMap = new Map<string, BarPosition[]>();

  // Group bars by initiative ID
  for (const bar of bars) {
    const existing = barMap.get(bar.initiativeId) ?? [];
    existing.push(bar);
    barMap.set(bar.initiativeId, existing);
  }

  const visibleDeps: VisibleDependency[] = [];

  for (const dep of dependencies) {
    const fromBars = barMap.get(dep.fromInitiativeId) ?? [];
    const toBars = barMap.get(dep.toInitiativeId) ?? [];

    // Find matching team bars (dependency line within same team)
    for (const fromBar of fromBars) {
      for (const toBar of toBars) {
        if (fromBar.teamId === toBar.teamId) {
          // Check if this is actively blocking (from not done, to is waiting)
          const isBlocking =
            fromBar.state !== 'Done' &&
            (toBar.state === 'Ready' || toBar.state === 'Constrained' || toBar.state === 'N/S');

          visibleDeps.push({
            id: dep.id,
            fromBar,
            toBar,
            isBlocking,
          });
        }
      }
    }
  }

  return visibleDeps;
}

// ============================================================================
// Timeline Metrics (for KPI cards)
// ============================================================================

export interface TimelineMetrics {
  activeWork: number;      // Initiatives with Doing state
  atRisk: number;          // Blocked or overdue
  overloadedTeams: number; // Teams with >100% utilization
  totalDependencies: number;
}

export function calculateTimelineMetrics(
  initiatives: Initiative[],
  teams: Team[],
  bars: BarPosition[],
  columns: TimeColumn[],
  dependencies: Dependency[]
): TimelineMetrics {
  const today = new Date();

  // Active work: initiatives with any team in Doing state
  const activeWork = initiatives.filter((init) =>
    Object.values(init.teamStates).some((s) => s === 'Doing')
  ).length;

  // At risk: Blocked or past due date
  const atRisk = initiatives.filter((init) => {
    const isBlocked = Object.values(init.teamStates).some((s) => s === 'Blocked');
    const endDate = parseDateString(init.dueDate ?? init.liveDate);
    const isOverdue = endDate && endDate < today &&
      Object.values(init.teamStates).some((s) => s !== 'Done' && s !== 'N/A');
    return isBlocked || isOverdue;
  }).length;

  // Overloaded teams in current week
  const currentColumn = columns.find((c) => c.isCurrentWeek);
  let overloadedTeams = 0;
  if (currentColumn) {
    for (const team of teams) {
      const load = calculateTeamLoad(team, bars, currentColumn);
      if (load.isOverloaded) overloadedTeams++;
    }
  }

  return {
    activeWork,
    atRisk,
    overloadedTeams,
    totalDependencies: dependencies.length,
  };
}

// ============================================================================
// Risk Calculation (Start Date + Effort vs Due Date)
// ============================================================================

export interface TeamRiskInfo {
  isAtRisk: boolean;
  startDate?: Date;
  projectedEndDate?: Date;
  dueDate?: Date;
  daysOverdue?: number; // Positive = late, Negative = early
}

/**
 * Calculate if a team's work on a child initiative is at risk
 * Risk = startDate + effortDays > dueDate
 *
 * @param initiative - The child initiative (must have parentId)
 * @param teamId - The team to check
 * @returns Risk info including whether at risk and dates
 */
export function calculateTeamRisk(
  initiative: Initiative,
  teamId: string
): TeamRiskInfo {
  // Only applicable to child initiatives
  if (!initiative.parentId) {
    return { isAtRisk: false };
  }

  const startDateStr = initiative.teamStartDates?.[teamId];
  const effort = initiative.teamEfforts?.[teamId];
  const dueDate = parseDateString(initiative.dueDate);

  // If missing any required data, can't determine risk
  if (!startDateStr || !effort || !dueDate) {
    return { isAtRisk: false };
  }

  const startDate = parseDateString(startDateStr);
  if (!startDate) {
    return { isAtRisk: false };
  }

  const effortDays = effortToDays(effort);
  const projectedEndDate = addBusinessDays(startDate, effortDays);

  // Calculate working days difference (positive = overdue)
  const daysOverdue = differenceInBusinessDays(projectedEndDate, dueDate);
  const isAtRisk = daysOverdue > 0;

  return {
    isAtRisk,
    startDate,
    projectedEndDate,
    dueDate,
    daysOverdue,
  };
}

/**
 * Check if any team's work on a child initiative is at risk
 */
export function isInitiativeAtRisk(
  initiative: Initiative,
  teamIds: string[]
): boolean {
  if (!initiative.parentId) return false;

  for (const teamId of teamIds) {
    const risk = calculateTeamRisk(initiative, teamId);
    if (risk.isAtRisk) return true;
  }
  return false;
}

// ============================================================================
// Unscheduled Initiatives
// ============================================================================

export interface UnscheduledItem {
  initiative: Initiative;
  teamId: string;
  effort: Effort;
  state: FlowState;
}

/**
 * Get initiatives that have effort but no date (can't be placed on timeline)
 */
export function getUnscheduledItems(
  initiatives: Initiative[],
  teams: Team[]
): UnscheduledItem[] {
  const items: UnscheduledItem[] = [];

  for (const init of initiatives) {
    const hasDate = parseDateString(init.dueDate ?? init.liveDate) !== undefined;
    if (hasDate) continue;

    for (const team of teams) {
      const effort = init.teamEfforts[team.id];
      const state = init.teamStates[team.id];
      if (effort && state && state !== 'N/A') {
        items.push({
          initiative: init,
          teamId: team.id,
          effort,
          state,
        });
      }
    }
  }

  return items;
}
