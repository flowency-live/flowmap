import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, Users, Link2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/KpiCard';
import { TimelineGrid } from '@/components/TimelineGrid';
import { DependencyLines } from '@/components/DependencyLines';
import { InitiativeDetail } from '@/components/InitiativeDetail';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { cn } from '@/lib/utils';
import { STATE_CONFIG, FLOW_STATES } from '@/types';
import type { Initiative } from '@/types';
import {
  generateTimeColumns,
  getDefaultDateRange,
  getAllBarPositions,
  calculateAllTeamLoads,
  getVisibleDependencies,
  calculateTimelineMetrics,
  getUnscheduledItems,
} from '@/lib/timeline';

const COLUMN_WIDTHS = {
  week: 80,
  month: 120,
};

export function Timeline() {
  const themes = usePortfolioStore((s) => s.themes);
  const teams = usePortfolioStore((s) => s.teams);
  const initiatives = usePortfolioStore((s) => s.initiatives);
  const dependencies = usePortfolioStore((s) => s.dependencies);

  // Local state
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [granularity, setGranularity] = useState<'week' | 'month'>('week');

  const columnWidth = COLUMN_WIDTHS[granularity];

  // Filter initiatives by theme
  const filteredInitiatives = useMemo(() => {
    if (themeFilter === 'all') return initiatives;
    return initiatives.filter((i) => i.themeId === themeFilter);
  }, [initiatives, themeFilter]);

  // Generate time columns
  const dateRange = useMemo(() => getDefaultDateRange(), []);
  const columns = useMemo(
    () => generateTimeColumns(dateRange.start, dateRange.end, granularity),
    [dateRange, granularity]
  );

  // Calculate bar positions
  const bars = useMemo(
    () => getAllBarPositions(filteredInitiatives, teams, columns),
    [filteredInitiatives, teams, columns]
  );

  // Calculate team loads
  const teamLoads = useMemo(
    () => calculateAllTeamLoads(teams, bars, columns),
    [teams, bars, columns]
  );

  // Get visible dependencies
  const visibleDependencies = useMemo(
    () => getVisibleDependencies(dependencies, bars),
    [dependencies, bars]
  );

  // Calculate metrics for KPI cards
  const metrics = useMemo(
    () => calculateTimelineMetrics(filteredInitiatives, teams, bars, columns, dependencies),
    [filteredInitiatives, teams, bars, columns, dependencies]
  );

  // Get unscheduled items
  const unscheduledItems = useMemo(
    () => getUnscheduledItems(filteredInitiatives, teams),
    [filteredInitiatives, teams]
  );

  // Team order for dependency lines
  const teamOrder = useMemo(
    () => teams.filter((t) => bars.some((b) => b.teamId === t.id)).map((t) => t.id),
    [teams, bars]
  );

  const handleBarClick = (init: Initiative) => {
    setSelectedInit(init);
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <motion.div
        className="flex-1 flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold">Portfolio Timeline</h1>
                <p className="text-sm text-muted-foreground">
                  Team workload and delivery schedule
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Theme filter */}
              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="All Themes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  {themes.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Granularity toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                <button
                  onClick={() => setGranularity('week')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                    granularity === 'week'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ZoomIn className="h-3.5 w-3.5 inline mr-1" />
                  Week
                </button>
                <button
                  onClick={() => setGranularity('month')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                    granularity === 'month'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <ZoomOut className="h-3.5 w-3.5 inline mr-1" />
                  Month
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KpiCard
              title="Active Work"
              value={metrics.activeWork}
              icon={Calendar}
              subtitle="Initiatives in progress"
            />
            <KpiCard
              title="At Risk"
              value={metrics.atRisk}
              icon={AlertTriangle}
              variant={metrics.atRisk > 0 ? 'destructive' : 'default'}
              subtitle="Blocked or overdue"
            />
            <KpiCard
              title="Overloaded Teams"
              value={metrics.overloadedTeams}
              icon={Users}
              variant={metrics.overloadedTeams > 0 ? 'warning' : 'default'}
              subtitle="This week"
            />
            <KpiCard
              title="Dependencies"
              value={metrics.totalDependencies}
              icon={Link2}
              subtitle="Cross-initiative links"
            />
          </div>
        </div>

        {/* State Legend */}
        <div className="px-6 py-2 border-b border-border bg-card flex items-center gap-4 overflow-x-auto">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0">
            States:
          </span>
          <div className="flex items-center gap-2">
            {FLOW_STATES.filter((s) => s !== 'N/A').map((state) => {
              const config = STATE_CONFIG[state];
              return (
                <div
                  key={state}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.textColor,
                  }}
                >
                  {config.short}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-auto p-4 relative">
          <TimelineGrid
            teams={teams}
            initiatives={filteredInitiatives}
            columns={columns}
            bars={bars}
            teamLoads={teamLoads}
            selectedInitiativeId={selectedInit?.id ?? null}
            onBarClick={handleBarClick}
            columnWidth={columnWidth}
          />

          {/* Dependency lines overlay */}
          {visibleDependencies.length > 0 && (
            <DependencyLines
              dependencies={visibleDependencies}
              columnWidth={columnWidth}
              teamRowHeight={46}
              teamOrder={teamOrder}
            />
          )}
        </div>

        {/* Unscheduled Items Warning */}
        {unscheduledItems.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                <span className="font-medium">{unscheduledItems.length}</span> items have effort but no due date and cannot be shown on the timeline.
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Side Panel */}
      <div className="w-[300px] border-l border-border bg-card flex-shrink-0">
        <InitiativeDetail
          initiative={selectedInit}
          onClose={() => setSelectedInit(null)}
        />
      </div>
    </div>
  );
}
